import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { EditorData, EditorExercise, EditorSession } from "@/components/programmes/editor/types";

/** Lectures de l'éditeur de programme (US14). Tout passe par la RLS : un coach ne lit que les copies de ses coachés. */

type Supabase = SupabaseClient<Database>;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function editorSupabase(): Promise<{ supabase: Supabase; userId: string } | null> {
  const supabase = (await createSupabaseServerClient()) as unknown as Supabase | null;
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

type SetRow = { set_number: number; target_reps: number | null; target_load_kg: number | null; target_rpe: number | null };
type SeRow = { id: string; exercise_id: string; position: number; consigne: string | null; rest_s: number | null; exercises: { name_fr: string } | null; sets: SetRow[] | null };
type CsRow = { id: string; label: string; name: string; week: number; date: string; status: string; session_exercises: SeRow[] | null };

/** Copie personnalisée d'un coaché (client_programs) avec toutes ses semaines. */
export async function loadClientProgram(supabase: Supabase, userId: string, programId: string): Promise<EditorData | null> {
  if (!UUID.test(programId)) return null;
  const { data: p } = await supabase
    .from("client_programs")
    .select(
      "id, name, adaptations, start_date, template_id, client_id, program_templates(name, coach_id, weeks, goal), clients(coach_id, profiles!clients_profile_id_fkey(full_name))",
    )
    .eq("id", programId)
    .maybeSingle();
  if (!p) return null;
  const client = one(p.clients as unknown as { coach_id: string; profiles: { full_name: string } | { full_name: string }[] | null } | null);
  if (!client || client.coach_id !== userId) return null;
  const tpl = one(p.program_templates as unknown as { name: string; coach_id: string; weeks: number; goal: string } | null);
  const fullName = one(client.profiles)?.full_name ?? "Coaché";

  const { data: rows, error } = await supabase
    .from("client_sessions")
    .select(
      "id, label, name, week, date, status, session_exercises(id, exercise_id, position, consigne, rest_s, exercises(name_fr), sets(set_number, target_reps, target_load_kg, target_rpe))",
    )
    .eq("client_program_id", programId)
    .order("week", { ascending: true })
    .order("date", { ascending: true })
    .order("label", { ascending: true });
  if (error) throw new Error("Impossible de charger les séances : " + error.message);

  const sessions: EditorSession[] = ((rows ?? []) as unknown as CsRow[]).map((s) => ({
    id: s.id,
    label: s.label,
    name: s.name,
    week: s.week,
    date: s.date,
    status: s.status as EditorSession["status"],
    exercises: [...(s.session_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((se): EditorExercise => {
        const sets = [...(se.sets ?? [])].sort((a, b) => a.set_number - b.set_number);
        const loads = sets.map((z) => z.target_load_kg).filter((v): v is number => v != null);
        return {
          id: se.id,
          exerciseId: se.exercise_id,
          name: one(se.exercises)?.name_fr ?? "Exercice",
          position: se.position,
          sets: sets.length,
          reps: sets[0]?.target_reps != null ? String(sets[0].target_reps) : "",
          loadKg: loads.length ? Math.max(...loads.map(Number)) : null,
          rpe: sets[0]?.target_rpe != null ? Number(sets[0].target_rpe) : null,
          restS: se.rest_s,
          consigne: se.consigne,
        };
      }),
  }));
  const weeks = Math.max(1, ...sessions.map((s) => s.week ?? 1));
  return {
    mode: "copie",
    id: p.id,
    name: p.name,
    templateId: p.template_id,
    templateName: tpl?.name ?? null,
    canUpdateTemplate: !!tpl && tpl.coach_id === userId,
    clientId: p.client_id,
    clientFullName: fullName,
    clientFirstName: fullName.split(" ")[0] ?? fullName,
    adaptations: Array.isArray(p.adaptations) ? (p.adaptations as unknown[]).map(String) : [],
    weeks,
    startDate: p.start_date,
    goal: tpl?.goal ?? null,
    sessions,
  };
}

type TeRow = { id: string; exercise_id: string; position: number; sets: number; reps: string; load_kg: number | null; target_rpe: number | null; rest_s: number | null; consigne: string | null; exercises: { name_fr: string } | null };
type TsRow = { id: string; label: string; name: string; position: number; template_exercises: TeRow[] | null };

/** Modèle de programme du coach connecté. */
export async function loadTemplate(supabase: Supabase, userId: string, templateId: string): Promise<EditorData | null> {
  if (!UUID.test(templateId)) return null;
  const { data: t } = await supabase
    .from("program_templates")
    .select(
      "id, coach_id, name, goal, weeks, template_sessions(id, label, name, position, template_exercises(id, exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne, exercises(name_fr)))",
    )
    .eq("id", templateId)
    .maybeSingle();
  if (!t || t.coach_id !== userId) return null;
  const sessions: EditorSession[] = [...((t.template_sessions as unknown as TsRow[] | null) ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      label: s.label,
      name: s.name,
      week: null,
      date: null,
      status: null,
      exercises: [...(s.template_exercises ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((te) => ({
          id: te.id,
          exerciseId: te.exercise_id,
          name: one(te.exercises)?.name_fr ?? "Exercice",
          position: te.position,
          sets: te.sets,
          reps: te.reps,
          loadKg: te.load_kg != null ? Number(te.load_kg) : null,
          rpe: te.target_rpe != null ? Number(te.target_rpe) : null,
          restS: te.rest_s,
          consigne: te.consigne,
        })),
    }));
  return {
    mode: "modele",
    id: t.id,
    name: t.name,
    templateId: t.id,
    templateName: t.name,
    canUpdateTemplate: true,
    clientId: null,
    clientFullName: null,
    clientFirstName: null,
    adaptations: [],
    weeks: t.weeks,
    startDate: null,
    goal: t.goal,
    sessions,
  };
}
