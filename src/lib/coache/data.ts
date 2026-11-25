import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayIso, weekBounds } from "./format";

/** Lectures de l'espace coaché. La RLS garantit que Léa ne lit que ses propres lignes. */

export type SetRow = {
  id: string;
  set_number: number;
  target_reps: number | null;
  target_load_kg: number | null;
  target_rpe: number | null;
  reps: number | null;
  load_kg: number | null;
  done: boolean;
};

export type SessionExercise = {
  id: string;
  position: number;
  consigne: string | null;
  rest_s: number | null;
  name: string;
  category: string | null;
  equipment: string | null;
  sets: SetRow[];
};

export type SessionDetail = {
  id: string;
  label: string;
  name: string;
  week: number;
  date: string;
  status: "planned" | "done" | "skipped";
  done_at: string | null;
  /** « presentiel » (encadrée par le coach, à la salle) ou « solo » (en autonomie). */
  mode: "presentiel" | "solo";
  /** Heure du rendez-vous (présentiel uniquement). */
  starts_at: string | null;
  programName: string;
  adaptations: string[];
  exercises: SessionExercise[];
  feedback: { rpe: number; feeling: string; pain_zone: string | null; note: string | null; created_at: string } | null;
};

export type Me = {
  userId: string;
  firstName: string;
  clientId: string;
  coachFirstName: string;
  targets: Record<string, unknown>;
};

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const firstName = (full: string | null | undefined, fallback: string) => (full ?? "").trim().split(/\s+/)[0] || fallback;

/** Profil, fiche coaché et prénom du coach de l'utilisateur connecté. */
export async function getMe(): Promise<Me | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("full_name, coach_id").eq("id", user.id).maybeSingle();
  const { data: client } = await supabase.from("clients").select("id, targets").eq("profile_id", user.id).maybeSingle();
  if (!client) return null;
  let coachFirstName = "ton coach";
  if (profile?.coach_id) {
    const { data: coach } = await supabase.from("profiles").select("full_name").eq("id", profile.coach_id).maybeSingle();
    coachFirstName = firstName(coach?.full_name, coachFirstName);
  }
  return {
    userId: user.id,
    firstName: firstName(profile?.full_name, ""),
    clientId: client.id as string,
    coachFirstName,
    targets: (client.targets ?? {}) as Record<string, unknown>,
  };
}

const SESSION_SELECT = `id, label, name, week, date, status, done_at, mode, starts_at,
  client_programs ( name, adaptations ),
  session_exercises ( id, position, consigne, rest_s, exercises ( name_fr, category, equipment ),
    sets ( id, set_number, target_reps, target_load_kg, target_rpe, reps, load_kg, done ) ),
  session_feedback ( rpe, feeling, pain_zone, note, created_at )`;

type RawSession = {
  id: string;
  label: string;
  name: string;
  week: number;
  date: string;
  status: SessionDetail["status"];
  done_at: string | null;
  mode: string | null;
  starts_at: string | null;
  client_programs: { name: string; adaptations: unknown } | null;
  session_exercises: {
    id: string;
    position: number;
    consigne: string | null;
    rest_s: number | null;
    exercises: { name_fr: string; category: string | null; equipment: string | null } | null;
    sets: SetRow[];
  }[];
  session_feedback: { rpe: number; feeling: string; pain_zone: string | null; note: string | null; created_at: string }[];
};

function toDetail(raw: RawSession): SessionDetail {
  const adaptations = Array.isArray(raw.client_programs?.adaptations) ? (raw.client_programs?.adaptations as unknown[]).map(String) : [];
  const exercises = [...(raw.session_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((se) => ({
      id: se.id,
      position: se.position,
      consigne: se.consigne,
      rest_s: se.rest_s,
      name: se.exercises?.name_fr ?? "Exercice",
      category: se.exercises?.category ?? null,
      equipment: se.exercises?.equipment ?? null,
      sets: [...(se.sets ?? [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ ...s, target_load_kg: num(s.target_load_kg), target_rpe: num(s.target_rpe), load_kg: num(s.load_kg) })),
    }));
  const fb = [...(raw.session_feedback ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    id: raw.id,
    label: raw.label,
    name: raw.name,
    week: raw.week,
    date: raw.date,
    status: raw.status,
    done_at: raw.done_at,
    mode: raw.mode === "presentiel" ? "presentiel" : "solo",
    starts_at: raw.mode === "presentiel" ? raw.starts_at : null,
    programName: raw.client_programs?.name ?? "",
    adaptations,
    exercises,
    feedback: fb,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Une séance du coaché connecté (null si elle n'existe pas ou appartient à quelqu'un d'autre). */
export async function getSession(id: string): Promise<SessionDetail | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("client_sessions").select(SESSION_SELECT).eq("id", id).maybeSingle();
  return data ? toDetail(data as unknown as RawSession) : null;
}

/**
 * Séance du jour, sinon prochaine séance planifiée (programme actif).
 * Une séance planifiée d'un jour passé et non faite n'est pas reprise : on regarde à partir d'aujourd'hui.
 */
export async function getNextSession(clientId: string): Promise<SessionDetail | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("client_sessions")
    .select("id, client_programs!inner ( active )")
    .eq("client_id", clientId)
    .eq("status", "planned")
    .eq("client_programs.active", true)
    .gte("date", todayIso())
    .order("date", { ascending: true })
    .order("label", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return getSession((data as { id: string }).id);
}

/** Charge prévue actuelle d'un exercice (prochaine séance planifiée qui le contient). */
export async function getCurrentLoad(clientId: string, exerciseName: string): Promise<number | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("sets")
    .select("target_load_kg, session_exercises!inner ( exercises!inner ( name_fr ), client_sessions!inner ( date, status ) )")
    .eq("client_id", clientId)
    .eq("session_exercises.exercises.name_fr", exerciseName)
    .eq("session_exercises.client_sessions.status", "planned")
    .not("target_load_kg", "is", null)
    .order("target_load_kg", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? num((data as { target_load_kg: unknown }).target_load_kg) : null;
}

export type WeekSession = {
  id: string;
  label: string;
  name: string;
  date: string;
  status: SessionDetail["status"];
  mode: SessionDetail["mode"];
  starts_at: string | null;
};

/** Séances de la semaine en cours (lundi → dimanche, heure de Paris), programme actif. */
export async function getWeekSessions(clientId: string, today: string = todayIso()): Promise<WeekSession[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { start, end } = weekBounds(today);
  const { data } = await supabase
    .from("client_sessions")
    .select("id, label, name, date, status, mode, starts_at, client_programs!inner ( active )")
    .eq("client_id", clientId)
    .eq("client_programs.active", true)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("label", { ascending: true });
  return ((data ?? []) as unknown as (Omit<WeekSession, "mode"> & { mode: string | null })[]).map((s) => ({
    id: s.id,
    label: s.label,
    name: s.name,
    date: s.date,
    status: s.status,
    mode: s.mode === "presentiel" ? "presentiel" : "solo",
    starts_at: s.mode === "presentiel" ? s.starts_at : null,
  }));
}
