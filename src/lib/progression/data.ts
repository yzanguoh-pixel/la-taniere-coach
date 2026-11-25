import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProgSession } from "./compute";

/** Lecture des données de « Ma progression ». La RLS limite Léa à ses propres lignes ; on filtre aussi par client_id. */

export type ProgressionData =
  | { state: "indisponible" }
  | { state: "ok"; firstName: string; coachFirstName: string; targets: Record<string, unknown>; sessions: ProgSession[] };

type RawSession = {
  id: string;
  date: string;
  status: ProgSession["status"];
  session_exercises: {
    exercise_id: string;
    exercises: { name_fr: string; category: string | null } | null;
    sets: { load_kg: number | string | null; reps: number | null; done: boolean }[];
  }[];
};

const firstWord = (s: string | null | undefined, fallback: string) => (s ?? "").trim().split(/\s+/)[0] || fallback;
const toNum = (v: number | string | null) => (v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export async function getProgression(): Promise<ProgressionData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { state: "indisponible" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "indisponible" };

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from("profiles").select("full_name, coach_id").eq("id", user.id).maybeSingle(),
    supabase.from("clients").select("id, targets").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!client) return { state: "indisponible" };

  let coachFirstName = "ton coach";
  if (profile?.coach_id) {
    const { data: coach } = await supabase.from("profiles").select("full_name").eq("id", profile.coach_id).maybeSingle();
    coachFirstName = firstWord(coach?.full_name, coachFirstName);
  }

  const { data, error } = await supabase
    .from("client_sessions")
    .select("id, date, status, session_exercises ( exercise_id, exercises ( name_fr, category ), sets ( load_kg, reps, done ) )")
    .eq("client_id", client.id)
    .order("date", { ascending: true });
  if (error) return { state: "indisponible" };

  const sessions: ProgSession[] = ((data ?? []) as unknown as RawSession[]).map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    exercises: (s.session_exercises ?? []).map((se) => ({
      exerciseId: se.exercise_id,
      name: se.exercises?.name_fr ?? "Exercice",
      category: se.exercises?.category ?? null,
      sets: (se.sets ?? []).map((x) => ({ load_kg: toNum(x.load_kg), reps: x.reps, done: x.done })),
    })),
  }));

  const targets = client.targets && typeof client.targets === "object" && !Array.isArray(client.targets) ? (client.targets as Record<string, unknown>) : {};
  return { state: "ok", firstName: firstWord(profile?.full_name, ""), coachFirstName, targets, sessions };
}
