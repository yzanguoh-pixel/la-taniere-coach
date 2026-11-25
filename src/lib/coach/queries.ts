import "server-only";
import type { Supabase } from "./supabase";
import { sortByUrgency, todayIso, type Urgency } from "./format";

/** Lectures de l'espace coach. Toutes passent par la RLS : Karim ne lit que ses coachés. */


type ProfileName = { full_name: string; initials: string };
/** PostgREST renvoie un objet pour une relation n-1 ; on accepte aussi un tableau par prudence. */
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type QueueItem = {
  id: string;
  clientId: string;
  name: string;
  initials: string;
  rpe: number;
  feeling: string;
  pain_zone: string | null;
  note: string | null;
  created_at: string;
  sessionName: string | null;
  urgency: Urgency;
};

export type UpcomingItem = { sessionId: string; clientId: string; name: string; label: string; sessionName: string; date: string };

/** Retours non traités (handled_at null) de mes coachés, triés par urgence. */
export async function getOpenFeedbacks(supabase: Supabase): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from("session_feedback")
    .select("id, client_id, rpe, feeling, pain_zone, note, created_at, client_sessions(name), clients(profiles!clients_profile_id_fkey(full_name, initials))")
    .is("handled_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger les retours : " + error.message);
  const rows = (data ?? []).map((r) => {
    const client = one(r.clients as unknown as { profiles: ProfileName | ProfileName[] } | null);
    const profile = one(client?.profiles);
    const session = one(r.client_sessions as unknown as { name: string } | null);
    return {
      id: r.id as string,
      clientId: r.client_id as string,
      name: profile?.full_name ?? "Coaché",
      initials: profile?.initials ?? "?",
      rpe: r.rpe as number,
      feeling: r.feeling as string,
      pain_zone: (r.pain_zone as string | null) ?? null,
      note: (r.note as string | null) ?? null,
      created_at: r.created_at as string,
      sessionName: session?.name ?? null,
    };
  });
  return sortByUrgency(rows);
}

/** Prochaine séance planifiée de chaque coaché (à partir d'aujourd'hui), la plus proche d'abord. */
export async function getUpcomingSessions(supabase: Supabase, limit = 6): Promise<UpcomingItem[]> {
  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, client_id, label, name, date, clients(profiles!clients_profile_id_fkey(full_name, initials))")
    .eq("status", "planned")
    .gte("date", todayIso())
    .order("date", { ascending: true })
    .limit(200);
  if (error) throw new Error("Impossible de charger les séances à venir : " + error.message);
  const seen = new Set<string>();
  const out: UpcomingItem[] = [];
  for (const r of data ?? []) {
    const clientId = r.client_id as string;
    if (seen.has(clientId)) continue;
    seen.add(clientId);
    const profile = one(one(r.clients as unknown as { profiles: ProfileName | ProfileName[] } | null)?.profiles);
    out.push({ sessionId: r.id as string, clientId, name: profile?.full_name ?? "Coaché", label: r.label as string, sessionName: r.name as string, date: r.date as string });
    if (out.length >= limit) break;
  }
  return out;
}

export async function countActiveClients(supabase: Supabase): Promise<number> {
  const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "actif");
  return count ?? 0;
}

// ------------------------------------------------------------------ fiche coaché

export type SetRow = { id: string; set_number: number; target_reps: number | null; target_load_kg: number | null; reps: number | null; load_kg: number | null; done: boolean };
export type SessionExerciseRow = { id: string; exercise_id: string; position: number; name: string; sets: SetRow[] };
export type SessionBlock = {
  id: string;
  label: string;
  name: string;
  week: number;
  date: string;
  status: string;
  /** « presentiel » (encadrée, à la salle) ou « solo » (en autonomie). */
  mode: "presentiel" | "solo";
  starts_at: string | null;
  exercises: SessionExerciseRow[];
};

export type FeedbackDetail = {
  id: string;
  rpe: number;
  feeling: string;
  pain_zone: string | null;
  note: string | null;
  created_at: string;
  handled_at: string | null;
  sessionId: string;
  sessionName: string | null;
  sessionDate: string | null;
};

export type AdjustableExercise = { exerciseId: string; name: string; currentKg: number; nextDate: string; sessions: number };

export type ClientFile = {
  id: string;
  fullName: string;
  initials: string;
  goal: string | null;
  level: string | null;
  injuries: string | null;
  weightKg: number | null;
  sessionsPerWeek: number | null;
  since: string;
  targets: Record<string, unknown>;
  program: { id: string; name: string; adaptations: string[] } | null;
  lastFeedback: FeedbackDetail | null;
  openFeedbackId: string | null;
  recent: SessionBlock[];
  adjustable: AdjustableExercise[];
  /** Formule en cours (abonnement non résilié le plus récent). */
  formula: { planName: string; coachedPerWeek: number } | null;
  /** Prochaine séance encadrée planifiée (à partir d'aujourd'hui). */
  nextCoached: { date: string; startsAt: string | null } | null;
};

const num = (v: unknown): number | null => (v == null ? null : Number(v));

type RawSession = {
  id: string;
  label: string;
  name: string;
  week: number;
  date: string;
  status: string;
  mode: string | null;
  starts_at: string | null;
  session_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    exercises: { name_fr: string } | { name_fr: string }[] | null;
    sets: { id: string; set_number: number; target_reps: number | null; target_load_kg: number | string | null; reps: number | null; load_kg: number | string | null; done: boolean }[];
  }[];
};

const SESSION_SELECT =
  "id, label, name, week, date, status, mode, starts_at, session_exercises(id, exercise_id, position, exercises(name_fr), sets(id, set_number, target_reps, target_load_kg, reps, load_kg, done))";

function toBlock(s: RawSession): SessionBlock {
  return {
    id: s.id,
    label: s.label,
    name: s.name,
    week: s.week,
    date: s.date,
    status: s.status,
    mode: s.mode === "presentiel" ? "presentiel" : "solo",
    starts_at: s.mode === "presentiel" ? s.starts_at : null,
    exercises: [...(s.session_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((x) => ({
        id: x.id,
        exercise_id: x.exercise_id,
        position: x.position,
        name: one(x.exercises)?.name_fr ?? "Exercice",
        sets: [...(x.sets ?? [])]
          .sort((a, b) => a.set_number - b.set_number)
          .map((z) => ({ ...z, target_load_kg: num(z.target_load_kg), load_kg: num(z.load_kg) })),
      })),
  };
}

/**
 * Exercices réglables : ceux des séances futures (status planned, à partir d'aujourd'hui) qui ont une charge cible.
 * Charge actuelle = la plus haute charge cible de la prochaine séance qui contient l'exercice.
 * Les exercices de la séance du retour passent en premier.
 */
export function adjustableFrom(future: SessionBlock[], firstExerciseIds: string[] = []): AdjustableExercise[] {
  const map = new Map<string, AdjustableExercise & { order: number }>();
  let order = 0;
  for (const s of future) {
    for (const x of s.exercises) {
      const loads = x.sets.map((z) => z.target_load_kg).filter((v): v is number => v != null);
      if (!loads.length) continue;
      const cur = map.get(x.exercise_id);
      if (cur) cur.sessions += 1;
      else map.set(x.exercise_id, { exerciseId: x.exercise_id, name: x.name, currentKg: Math.max(...loads), nextDate: s.date, sessions: 1, order: order++ });
    }
  }
  const rank = (id: string) => {
    const i = firstExerciseIds.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...map.values()]
    .sort((a, b) => rank(a.exerciseId) - rank(b.exerciseId) || a.order - b.order)
    .map((x) => ({ exerciseId: x.exerciseId, name: x.name, currentKg: x.currentKg, nextDate: x.nextDate, sessions: x.sessions }));
}

/** Fiche complète d'un coaché ; null si l'identifiant n'est pas un de mes coachés. */
export async function getClientFile(supabase: Supabase, clientId: string): Promise<ClientFile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) return null;
  const { data: c, error } = await supabase
    .from("clients")
    .select("id, goal, level, injuries, weight_kg, sessions_per_week, since, targets, profiles!clients_profile_id_fkey(full_name, initials)")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger la fiche : " + error.message);
  if (!c) return null;
  const profile = one(c.profiles as unknown as ProfileName | ProfileName[] | null);

  const today = todayIso();
  const [programRes, feedbackRes, openRes, subRes, coachedRes] = await Promise.all([
    supabase.from("client_programs").select("id, name, adaptations").eq("client_id", clientId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("session_feedback")
      .select("id, rpe, feeling, pain_zone, note, created_at, handled_at, client_session_id, client_sessions(name, date)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("session_feedback").select("id").eq("client_id", clientId).is("handled_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("subscriptions").select("plan_name, coached_per_week").eq("client_id", clientId).neq("status", "resilie").order("starts_on", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("client_sessions")
      .select("date, starts_at")
      .eq("client_id", clientId)
      .eq("mode", "presentiel")
      .eq("status", "planned")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const program = programRes.data
    ? { id: programRes.data.id as string, name: programRes.data.name as string, adaptations: (programRes.data.adaptations as string[] | null) ?? [] }
    : null;

  let recent: SessionBlock[] = [];
  let future: SessionBlock[] = [];
  if (program) {
    const [doneRes, futureRes] = await Promise.all([
      supabase.from("client_sessions").select(SESSION_SELECT).eq("client_program_id", program.id).eq("status", "done").order("date", { ascending: false }).limit(3),
      supabase.from("client_sessions").select(SESSION_SELECT).eq("client_program_id", program.id).eq("status", "planned").gte("date", today).order("date", { ascending: true }),
    ]);
    recent = ((doneRes.data ?? []) as unknown as RawSession[]).map(toBlock);
    future = ((futureRes.data ?? []) as unknown as RawSession[]).map(toBlock);
  }

  const fb = feedbackRes.data;
  const fbSession = fb ? one(fb.client_sessions as unknown as { name: string; date: string } | null) : null;
  const lastFeedback: FeedbackDetail | null = fb
    ? {
        id: fb.id as string,
        rpe: fb.rpe as number,
        feeling: fb.feeling as string,
        pain_zone: (fb.pain_zone as string | null) ?? null,
        note: (fb.note as string | null) ?? null,
        created_at: fb.created_at as string,
        handled_at: (fb.handled_at as string | null) ?? null,
        sessionId: fb.client_session_id as string,
        sessionName: fbSession?.name ?? null,
        sessionDate: fbSession?.date ?? null,
      }
    : null;

  // Exercices de la séance commentée en premier (ex. le squat pour le retour de Léa).
  const fbBlock = lastFeedback ? recent.find((s) => s.id === lastFeedback.sessionId) : undefined;
  const adjustable = adjustableFrom(future, fbBlock?.exercises.map((x) => x.exercise_id) ?? []);

  return {
    id: c.id as string,
    fullName: profile?.full_name ?? "Coaché",
    initials: profile?.initials ?? "?",
    goal: (c.goal as string | null) ?? null,
    level: (c.level as string | null) ?? null,
    injuries: (c.injuries as string | null) ?? null,
    weightKg: num(c.weight_kg),
    sessionsPerWeek: (c.sessions_per_week as number | null) ?? null,
    since: c.since as string,
    targets: (c.targets as Record<string, unknown> | null) ?? {},
    program,
    lastFeedback,
    openFeedbackId: (openRes.data?.id as string | undefined) ?? null,
    recent,
    adjustable,
    formula: subRes.data ? { planName: subRes.data.plan_name, coachedPerWeek: subRes.data.coached_per_week ?? 1 } : null,
    nextCoached: coachedRes.data ? { date: coachedRes.data.date, startsAt: coachedRes.data.starts_at } : null,
  };
}

/** Séances futures du programme actif (pour l'action d'ajustement, relues côté serveur). */
export async function getFutureSessions(supabase: Supabase, clientId: string): Promise<{ programId: string | null; future: SessionBlock[] }> {
  const { data: program } = await supabase.from("client_programs").select("id").eq("client_id", clientId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!program) return { programId: null, future: [] };
  const { data, error } = await supabase
    .from("client_sessions")
    .select(SESSION_SELECT)
    .eq("client_program_id", program.id)
    .eq("status", "planned")
    .gte("date", todayIso())
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return { programId: program.id as string, future: ((data ?? []) as unknown as RawSession[]).map(toBlock) };
}

// ------------------------------------------------------------------ formules et séances encadrées

export type ClientFormula = { planName: string; coachedPerWeek: number; sessionsPerWeek: number | null };

/** Formule en cours de chaque coaché visible (abonnement non résilié le plus récent), par id de coaché. */
export async function getFormulas(supabase: Supabase): Promise<Map<string, ClientFormula>> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("client_id, plan_name, coached_per_week, starts_on, clients(sessions_per_week)")
    .neq("status", "resilie")
    .order("starts_on", { ascending: false });
  if (error) throw new Error("Impossible de charger les formules : " + error.message);
  const out = new Map<string, ClientFormula>();
  for (const r of data ?? []) {
    if (out.has(r.client_id)) continue;
    const c = one(r.clients as unknown as { sessions_per_week: number | null } | null);
    out.set(r.client_id, { planName: r.plan_name, coachedPerWeek: r.coached_per_week ?? 1, sessionsPerWeek: c?.sessions_per_week ?? null });
  }
  return out;
}

export type CoachedToday = { sessionId: string; clientId: string; firstName: string; startsAt: string | null; status: string };

/** Séances encadrées (présentiel) du jour, par heure de rendez-vous ; les séances annulées sont exclues. */
export async function getCoachedToday(supabase: Supabase, today = todayIso()): Promise<CoachedToday[]> {
  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, client_id, starts_at, status, clients(profiles!clients_profile_id_fkey(full_name, initials))")
    .eq("date", today)
    .eq("mode", "presentiel")
    .neq("status", "skipped")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error("Impossible de charger les séances du jour : " + error.message);
  return (data ?? []).map((r) => {
    const profile = one(one(r.clients as unknown as { profiles: ProfileName | ProfileName[] } | null)?.profiles);
    return {
      sessionId: r.id,
      clientId: r.client_id,
      firstName: (profile?.full_name ?? "Coaché").split(" ")[0],
      startsAt: r.starts_at,
      status: r.status,
    };
  });
}
