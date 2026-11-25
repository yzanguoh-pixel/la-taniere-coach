import "server-only";
import { coachSupabase } from "@/lib/coach/supabase";

/**
 * Lecture d'une séance côté coach (page /coach/seances/[id]).
 * La RLS (coach_owns_client) ne laisse voir au coach que les séances de ses coachés ;
 * on vérifie en plus que la fiche client est bien rattachée au coach connecté.
 */

export type CoachSet = {
  id: string;
  set_number: number;
  target_reps: number | null;
  target_load_kg: number | null;
  target_rpe: number | null;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  done: boolean;
};

export type CoachExercise = {
  id: string;
  position: number;
  name: string;
  category: string | null;
  consigne: string | null;
  rest_s: number | null;
  sets: CoachSet[];
};

export type CoachFeedback = {
  rpe: number;
  feeling: string;
  pain_zone: string | null;
  note: string | null;
  handled_at: string | null;
};

export type CoachSessionDetail = {
  id: string;
  clientId: string;
  clientFullName: string;
  clientFirstName: string;
  coachFirstName: string;
  label: string;
  name: string;
  date: string;
  status: string;
  done_at: string | null;
  mode: "presentiel" | "solo";
  starts_at: string | null;
  exercises: CoachExercise[];
  feedback: CoachFeedback | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
export const firstNameOf = (full: string | null | undefined, fallback: string) => (full ?? "").trim().split(/\s+/)[0] || fallback;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type Raw = {
  id: string;
  client_id: string;
  label: string;
  name: string;
  date: string;
  status: string;
  done_at: string | null;
  mode: string | null;
  starts_at: string | null;
  clients: { coach_id: string; profiles: { full_name: string } | { full_name: string }[] | null } | null;
  session_exercises: {
    id: string;
    position: number;
    consigne: string | null;
    rest_s: number | null;
    exercises: { name_fr: string; category: string | null } | null;
    sets: { id: string; set_number: number; target_reps: number | null; target_load_kg: unknown; target_rpe: unknown; reps: number | null; load_kg: unknown; rpe: unknown; done: boolean }[];
  }[];
  session_feedback: CoachFeedback[] | CoachFeedback | null;
};

const SELECT = `id, client_id, label, name, date, status, done_at, mode, starts_at,
  clients!inner ( coach_id, profiles!clients_profile_id_fkey ( full_name ) ),
  session_exercises ( id, position, consigne, rest_s, exercises ( name_fr, category ),
    sets ( id, set_number, target_reps, target_load_kg, target_rpe, reps, load_kg, rpe, done ) ),
  session_feedback ( rpe, feeling, pain_zone, note, handled_at )`;

/** Séance d'un coaché du coach connecté, ou null (inexistante, ou coaché d'un autre coach). */
export async function getCoachSession(id: string): Promise<CoachSessionDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await coachSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data }, { data: me }] = await Promise.all([
    supabase.from("client_sessions").select(SELECT).eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!data || me?.role !== "coach") return null;
  const raw = data as unknown as Raw;
  if (raw.clients?.coach_id !== user.id) return null;

  const fullName = one(raw.clients?.profiles)?.full_name ?? "Coaché";
  const exercises = [...(raw.session_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((se) => ({
      id: se.id,
      position: se.position,
      name: se.exercises?.name_fr ?? "Exercice",
      category: se.exercises?.category ?? null,
      consigne: se.consigne,
      rest_s: se.rest_s,
      sets: [...(se.sets ?? [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          id: s.id,
          set_number: s.set_number,
          target_reps: s.target_reps,
          target_load_kg: num(s.target_load_kg),
          target_rpe: num(s.target_rpe),
          reps: s.reps,
          load_kg: num(s.load_kg),
          rpe: num(s.rpe),
          done: s.done,
        })),
    }));

  return {
    id: raw.id,
    clientId: raw.client_id,
    clientFullName: fullName,
    clientFirstName: firstNameOf(fullName, "le coaché"),
    coachFirstName: firstNameOf(me?.full_name, "le coach"),
    label: raw.label,
    name: raw.name,
    date: raw.date,
    status: raw.status,
    done_at: raw.done_at,
    mode: raw.mode === "presentiel" ? "presentiel" : "solo",
    starts_at: raw.mode === "presentiel" ? raw.starts_at : null,
    exercises,
    feedback: one(raw.session_feedback),
  };
}
