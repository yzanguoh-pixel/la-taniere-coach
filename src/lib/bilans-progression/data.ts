import "server-only";
import { coachSupabase, type Supabase } from "@/lib/coach/supabase";
import { addDays, previousPeriod, type Period, type ReportInput, type ReportSession } from "./compute";
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
  label: string | null;
  name: string | null;
  status: ReportSession["status"];
  mode: string | null;
  session_exercises: {
    exercise_id: string;
    position: number | null;
    exercises: { name_fr: string; category: string | null } | null;
    sets: { set_number: number; target_load_kg: number | string | null; load_kg: number | string | null; reps: number | null; rpe: number | string | null; done: boolean }[];
  }[];
};

/** Jours de pesées lus avant la période précédente, pour connaître le poids de corps si aucune pesée récente. */
const WEIGHT_LOOKBACK_DAYS = 90;

/**
 * Données nécessaires au calcul du bilan d'un coaché : période du bilan ET période précédente de même durée
 * (radar « avant », charge de départ). Toutes les lectures partent en parallèle (un aller-retour), filtrées par la RLS coach
 * (les activités Strava sont masquées au coach par la RLS ; le filtre `source` le redit explicitement).
 * Renvoie null si le coaché n'existe pas ou n'appartient pas au coach (RLS).
 */
export async function loadReportInput(supabase: Supabase, clientId: string, period: Period): Promise<{ client: ClientIdentity; input: ReportInput } | null> {
  if (!UUID.test(clientId)) return null;
  const from = previousPeriod(period).start;
  const to = period.end;

  const [clientRes, sessionsRes, feedbackRes, weightsRes, foodRes, goalsRes, activitiesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, goal, targets, sessions_per_week, weight_kg, status, profiles!clients_profile_id_fkey(full_name, initials)")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("client_sessions")
      .select(
        "id, date, label, name, status, mode, session_exercises ( exercise_id, position, exercises ( name_fr, category ), sets ( set_number, target_load_kg, load_kg, reps, rpe, done ) )",
      )
      .eq("client_id", clientId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),
    supabase
      .from("session_feedback")
      .select("rpe, feeling, pain_zone, client_sessions!inner(date)")
      .eq("client_id", clientId)
      .gte("client_sessions.date", from)
      .lte("client_sessions.date", to),
    supabase.from("weight_logs").select("date, weight_kg").eq("client_id", clientId).gte("date", addDays(from, -WEIGHT_LOOKBACK_DAYS)).lte("date", to).order("date"),
    supabase.from("food_log_entries").select("date, kcal, protein_g").eq("client_id", clientId).gte("date", from).lte("date", to),
    supabase.from("nutrition_goals").select("day_type, kcal, protein_g").eq("client_id", clientId),
    supabase.from("activities").select("date, duration_min, distance_km").eq("client_id", clientId).neq("source", "strava").gte("date", from).lte("date", to),
  ]);

  const c = clientRes.data;
  if (!c) return null;
  const profile = one(c.profiles as unknown as ProfileName | ProfileName[] | null);
  const fullName = profile?.full_name ?? "Coaché";

  const sessions: ReportSession[] = ((sessionsRes.data ?? []) as unknown as RawSession[]).map((s) => ({
    id: s.id,
    date: s.date,
    label: s.label,
    name: s.name,
    status: s.status,
    mode: s.mode === "presentiel" ? "presentiel" : "solo",
    exercises: [...(s.session_exercises ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((se) => ({
        exerciseId: se.exercise_id,
        name: se.exercises?.name_fr ?? "Exercice",
        category: se.exercises?.category ?? null,
        sets: [...(se.sets ?? [])]
          .sort((a, b) => a.set_number - b.set_number)
          .map((x) => ({ targetKg: toNum(x.target_load_kg), loadKg: toNum(x.load_kg), reps: x.reps, rpe: toNum(x.rpe), done: x.done })),
      })),
  }));

  type RawFeedback = { rpe: number; feeling: string; pain_zone: string | null; client_sessions: { date: string } | { date: string }[] | null };
  const feedback = ((feedbackRes.data ?? []) as unknown as RawFeedback[])
    .map((f) => ({ rpe: Number(f.rpe), feeling: f.feeling, painZone: f.pain_zone, sessionDate: one(f.client_sessions)?.date ?? "" }))
    .filter((f) => f.sessionDate && Number.isFinite(f.rpe));

  const targets = c.targets && typeof c.targets === "object" && !Array.isArray(c.targets) ? (c.targets as Record<string, unknown>) : {};

  return {
    client: { id: c.id, fullName, firstName: firstNameOf(fullName), status: c.status },
    input: {
      goal: c.goal,
      targets,
      sessionsPerWeek: c.sessions_per_week,
      profileWeightKg: toNum(c.weight_kg),
      sessions,
      feedback,
      weights: (weightsRes.data ?? []).map((w) => ({ date: w.date, kg: Number(w.weight_kg) })).filter((w) => Number.isFinite(w.kg) && w.kg > 0),
      food: (foodRes.data ?? []).map((f) => ({ date: f.date, kcal: Number(f.kcal), proteinG: toNum(f.protein_g) })).filter((f) => Number.isFinite(f.kcal)),
      nutritionGoals: (goalsRes.data ?? [])
        .map((g) => ({ dayType: g.day_type, kcal: Number(g.kcal), proteinG: toNum(g.protein_g) }))
        .filter((g) => Number.isFinite(g.kcal) && g.kcal > 0),
      activities: (activitiesRes.data ?? []).map((a) => ({ date: a.date, durationMin: toNum(a.duration_min), distanceKm: toNum(a.distance_km) })),
    },
  };
}
