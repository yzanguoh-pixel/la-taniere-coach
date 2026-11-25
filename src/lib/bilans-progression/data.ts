import "server-only";
import { coachSupabase, type Supabase } from "@/lib/coach/supabase";
import { addDays, type Period, type ReportInput, type ReportSession } from "./compute";
import type { ProgressReportData } from "./types";

/**
 * Lecture côté coach des données d'un coaché pour calculer ou lister ses bilans de progression.
 * Client Supabase serveur lié aux cookies : la RLS limite Karim à ses propres coachés.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nombre de jours sans bilan au-delà duquel « Envoyer les bilans du mois » renvoie un bilan. */
export const RESEND_AFTER_DAYS = 28;

type ProfileName = { full_name: string; initials: string };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const toNum = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
export const firstNameOf = (full: string) => full.trim().split(/\s+/)[0] || full;

export async function requireCoach(): Promise<{ supabase: Supabase; coachId: string } | { error: string }> {
  const supabase = await coachSupabase();
  if (!supabase) return { error: "La base de données n’est pas configurée." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré. Reconnecte-toi." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "coach") return { error: "Cet espace est réservé au coach." };
  return { supabase, coachId: user.id };
}

export type ReportSummary = { id: string; title: string; periodStart: string; periodEnd: string; sentAt: string; readAt: string | null; coachNote: string | null; data: ProgressReportData };

export type ClientRow = {
  id: string;
  fullName: string;
  firstName: string;
  initials: string;
  goal: string | null;
  last: Pick<ReportSummary, "id" | "title" | "sentAt" | "readAt"> | null;
};

/** Coachés actifs du coach, avec leur dernier bilan envoyé. */
export async function listClientsWithLastReport(supabase: Supabase, coachId: string): Promise<ClientRow[]> {
  const [{ data: clients }, { data: reports }] = await Promise.all([
    supabase.from("clients").select("id, goal, status, profiles!clients_profile_id_fkey(full_name, initials)").eq("coach_id", coachId).eq("status", "actif"),
    supabase.from("progress_reports").select("id, client_id, title, sent_at, read_at").eq("coach_id", coachId).order("sent_at", { ascending: false }),
  ]);
  const lastByClient = new Map<string, ClientRow["last"]>();
  for (const r of reports ?? []) if (!lastByClient.has(r.client_id)) lastByClient.set(r.client_id, { id: r.id, title: r.title, sentAt: r.sent_at, readAt: r.read_at });
  return (clients ?? [])
    .map((c) => {
      const p = one(c.profiles as unknown as ProfileName | ProfileName[] | null);
      const fullName = p?.full_name ?? "Coaché";
      return { id: c.id, fullName, firstName: firstNameOf(fullName), initials: p?.initials ?? "", goal: c.goal, last: lastByClient.get(c.id) ?? null };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

/** Coachés à qui « Envoyer les bilans du mois » enverrait un bilan (aucun bilan depuis RESEND_AFTER_DAYS jours). */
export function dueClients(rows: ClientRow[], now: Date): ClientRow[] {
  const limit = now.getTime() - RESEND_AFTER_DAYS * 864e5;
  return rows.filter((r) => !r.last || new Date(r.last.sentAt).getTime() < limit);
}

/** Bilans envoyés à un coaché, du plus récent au plus ancien. */
export async function listReports(supabase: Supabase, clientId: string): Promise<ReportSummary[]> {
  const { data } = await supabase
    .from("progress_reports")
    .select("id, title, period_start, period_end, sent_at, read_at, coach_note, data")
    .eq("client_id", clientId)
    .order("sent_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    sentAt: r.sent_at,
    readAt: r.read_at,
    coachNote: r.coach_note,
    data: r.data as unknown as ProgressReportData,
  }));
}

export type ClientIdentity = { id: string; fullName: string; firstName: string; status: string };

type RawSession = {
  id: string;
  date: string;
  status: ReportSession["status"];
  mode: string | null;
  session_exercises: {
    exercise_id: string;
    exercises: { name_fr: string; category: string | null } | null;
    sets: { target_load_kg: number | string | null; load_kg: number | string | null; reps: number | null; done: boolean }[];
  }[];
};

/**
 * Données nécessaires au calcul du bilan d'un coaché sur une période.
 * Les séances sont lues depuis 4 semaines avant la période pour connaître la charge de travail de départ.
 * Renvoie null si le coaché n'existe pas ou n'appartient pas au coach (RLS).
 */
export async function loadReportInput(supabase: Supabase, clientId: string, period: Period): Promise<{ client: ClientIdentity; input: ReportInput } | null> {
  if (!UUID.test(clientId)) return null;
  const { data: c } = await supabase
    .from("clients")
    .select("id, goal, targets, sessions_per_week, status, profiles!clients_profile_id_fkey(full_name, initials)")
    .eq("id", clientId)
    .maybeSingle();
  if (!c) return null;
  const profile = one(c.profiles as unknown as ProfileName | ProfileName[] | null);
  const fullName = profile?.full_name ?? "Coaché";
  const lookback = addDays(period.start, -28);

  const [sessionsRes, feedbackRes, weightsRes, foodRes, goalsRes] = await Promise.all([
    supabase
      .from("client_sessions")
      .select("id, date, status, mode, session_exercises ( exercise_id, exercises ( name_fr, category ), sets ( target_load_kg, load_kg, reps, done ) )")
      .eq("client_id", clientId)
      .gte("date", lookback)
      .lte("date", period.end)
      .order("date", { ascending: true }),
    supabase.from("session_feedback").select("rpe, client_sessions!inner(date)").eq("client_id", clientId).gte("client_sessions.date", period.start).lte("client_sessions.date", period.end),
    supabase.from("weight_logs").select("date, weight_kg").eq("client_id", clientId).gte("date", period.start).lte("date", period.end).order("date"),
    supabase.from("food_log_entries").select("date, kcal").eq("client_id", clientId).gte("date", period.start).lte("date", period.end),
    supabase.from("nutrition_goals").select("kcal").eq("client_id", clientId),
  ]);

  const sessions: ReportSession[] = ((sessionsRes.data ?? []) as unknown as RawSession[]).map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    mode: s.mode === "presentiel" ? "presentiel" : "solo",
    exercises: (s.session_exercises ?? []).map((se) => ({
      exerciseId: se.exercise_id,
      name: se.exercises?.name_fr ?? "Exercice",
      category: se.exercises?.category ?? null,
      sets: (se.sets ?? []).map((x) => ({ targetKg: toNum(x.target_load_kg), loadKg: toNum(x.load_kg), reps: x.reps, done: x.done })),
    })),
  }));

  const feedback = ((feedbackRes.data ?? []) as unknown as { rpe: number; client_sessions: { date: string } | { date: string }[] | null }[])
    .map((f) => ({ rpe: f.rpe, sessionDate: one(f.client_sessions)?.date ?? "" }))
    .filter((f) => f.sessionDate);

  const targets = c.targets && typeof c.targets === "object" && !Array.isArray(c.targets) ? (c.targets as Record<string, unknown>) : {};

  return {
    client: { id: c.id, fullName, firstName: firstNameOf(fullName), status: c.status },
    input: {
      goal: c.goal,
      targets,
      sessionsPerWeek: c.sessions_per_week,
      sessions,
      feedback,
      weights: (weightsRes.data ?? []).map((w) => ({ date: w.date, kg: Number(w.weight_kg) })).filter((w) => Number.isFinite(w.kg)),
      food: (foodRes.data ?? []).map((f) => ({ date: f.date, kcal: Number(f.kcal) })).filter((f) => Number.isFinite(f.kcal)),
      kcalGoals: (goalsRes.data ?? []).map((g) => g.kcal).filter((k) => Number.isFinite(k)),
    },
  };
}
