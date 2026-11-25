"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addEventMessage } from "@/lib/messages/thread";
import type { Database, Json } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * US15 — Attribution d'un modèle à un coaché.
 * Crée une COPIE liée au coaché (client_programs + client_sessions + session_exercises + sets) sur toutes les
 * semaines du modèle, à partir du lundi de la semaine prochaine. Le modèle n'est jamais modifié.
 * Toutes les écritures passent par la RLS existante (politiques *_coach_all, coach_owns_client) : pas de migration.
 * En cas d'échec en cours de route, la copie partielle est supprimée (cascade) pour ne rien laisser de bancal.
 */

type Supabase = SupabaseClient<Database>;
type Result = { id: string } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TZ = "Europe/Paris";

/** « 6 », « 10 par jambe », « 45 s » → 6, 10, 45 (même règle que le seed) ; rien d'exploitable → null. */
function repsToNumber(reps: string): number | null {
  const m = /^\s*(\d+)/.exec(reps);
  return m ? Number(m[1]) : null;
}

/** Lundi de la semaine prochaine (heure de Paris), au format AAAA-MM-JJ. */
function nextMondayIso(now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const d = new Date(today + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() + (7 - dow));
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jours d'entraînement répartis dans la semaine : 2 → lun/jeu, 3 → lun/mer/ven, 4 → lun/mar/jeu/ven… */
function sessionDayOffsets(count: number): number[] {
  const fixed: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
  return fixed[count] ?? Array.from({ length: count }, (_, i) => Math.min(6, Math.floor((i * 7) / Math.max(1, count))));
}

type TemplateExerciseRow = {
  exercise_id: string;
  position: number;
  sets: number;
  reps: string;
  load_kg: number | null;
  target_rpe: number | null;
  rest_s: number | null;
  consigne: string | null;
};
type TemplateSessionRow = { id: string; label: string; name: string; position: number; template_exercises: TemplateExerciseRow[] | null };

export async function assignTemplate(templateId: string, clientId: string): Promise<Result> {
  if (!UUID.test(templateId ?? "")) return { error: "Modèle introuvable." };
  if (!UUID.test(clientId ?? "")) return { error: "Choisissez un coaché." };

  const supabase = (await createSupabaseServerClient()) as unknown as Supabase | null;
  if (!supabase) return { error: "La base de données n’est pas configurée." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnectez-vous." };

  // Coaché : la RLS ne renvoie la ligne qu'au coach propriétaire ; on revérifie coach_id par sécurité.
  const { data: client } = await supabase.from("clients").select("id, coach_id, status").eq("id", clientId).maybeSingle();
  if (!client || client.coach_id !== user.id) return { error: "Ce coaché ne fait pas partie de vos coachés." };
  if (client.status === "archive") return { error: "Ce coaché est archivé : réactivez-le avant de lui envoyer un programme." };

  // Modèle : lisible par tous, mais on n'attribue que ses propres modèles.
  const { data: template } = await supabase
    .from("program_templates")
    .select(
      "id, coach_id, name, weeks, sessions_per_week, template_sessions(id, label, name, position, template_exercises(exercise_id, position, sets, reps, load_kg, target_rpe, rest_s, consigne))",
    )
    .eq("id", templateId)
    .maybeSingle();
  if (!template || template.coach_id !== user.id) return { error: "Modèle introuvable." };

  const sessions = ([...((template.template_sessions as unknown as TemplateSessionRow[] | null) ?? [])]).sort((a, b) => a.position - b.position);
  if (sessions.length === 0) return { error: "Ce modèle n’a pas encore de séance : ajoutez-en une avant de l’envoyer." };
  const weeks = Math.max(1, template.weeks ?? 1);
  const startDate = nextMondayIso();
  const offsets = sessionDayOffsets(sessions.length);

  // Programmes actifs existants (pour libérer leurs séances futures une fois la copie créée).
  const { data: previous } = await supabase.from("client_programs").select("id").eq("client_id", clientId).eq("active", true);

  // 1. La copie.
  const { data: program, error: progError } = await supabase
    .from("client_programs")
    .insert({ client_id: clientId, template_id: template.id, name: template.name, adaptations: [] as Json, start_date: startDate, active: true })
    .select("id")
    .single();
  if (progError || !program) return { error: "Le programme n’a pas pu être créé. Réessayez." };

  // 2. Séances, exercices, séries : identifiants générés ici pour lier les lignes sans aller-retour.
  const sessionRows: Database["public"]["Tables"]["client_sessions"]["Insert"][] = [];
  const exerciseRows: Database["public"]["Tables"]["session_exercises"]["Insert"][] = [];
  const setRows: Database["public"]["Tables"]["sets"]["Insert"][] = [];
  for (let week = 1; week <= weeks; week++) {
    sessions.forEach((ts, i) => {
      const sessionId = crypto.randomUUID();
      sessionRows.push({
        id: sessionId,
        client_program_id: program.id,
        client_id: clientId,
        label: ts.label,
        name: ts.name,
        week,
        date: addDays(startDate, (week - 1) * 7 + (offsets[i] ?? i)),
        status: "planned",
      });
      const exercises = [...(ts.template_exercises ?? [])].sort((a, b) => a.position - b.position);
      exercises.forEach((te, position) => {
        const seId = crypto.randomUUID();
        exerciseRows.push({ id: seId, client_session_id: sessionId, client_id: clientId, exercise_id: te.exercise_id, position, consigne: te.consigne, rest_s: te.rest_s });
        for (let n = 1; n <= Math.max(1, te.sets); n++) {
          setRows.push({
            session_exercise_id: seId,
            client_id: clientId,
            set_number: n,
            target_reps: repsToNumber(te.reps),
            target_load_kg: te.load_kg,
            target_rpe: te.target_rpe,
          });
        }
      });
    });
  }

  const rollback = async (message: string): Promise<Result> => {
    await supabase.from("client_programs").delete().eq("id", program.id);
    return { error: message };
  };
  const failure = "La copie du programme a échoué. Rien n’a été envoyé, réessayez.";
  const { error: sErr } = await supabase.from("client_sessions").insert(sessionRows);
  if (sErr) return rollback(failure);
  if (exerciseRows.length) {
    const { error: eErr } = await supabase.from("session_exercises").insert(exerciseRows);
    if (eErr) return rollback(failure);
  }
  // Par paquets : un modèle de 8 semaines × 4 séances × 5 exercices × 4 séries = 640 lignes.
  for (let i = 0; i < setRows.length; i += 500) {
    const { error: zErr } = await supabase.from("sets").insert(setRows.slice(i, i + 500));
    if (zErr) return rollback(failure);
  }

  // 3. L'ancien programme : ses séances futures (à partir du démarrage du nouveau) sont retirées, puis il est désactivé.
  const previousIds = (previous ?? []).map((p) => p.id).filter((id) => id !== program.id);
  if (previousIds.length) {
    await supabase.from("client_sessions").delete().in("client_program_id", previousIds).eq("status", "planned").gte("date", startDate);
    // Un seul programme actif par coaché : l'ancien passe inactif (ses séances faites restent pour l'historique).
    await supabase.from("client_programs").update({ active: false }).in("id", previousIds).eq("client_id", clientId);
  }

  // 4. Message événement dans le fil du coaché.
  const payload: Json = { type: "program_assigned", client_program_id: program.id, template_id: template.id, start_date: startDate, weeks, sessions_per_week: sessions.length };
  await addEventMessage(clientId, `Nouveau programme : ${template.name}`, payload);

  revalidatePath("/coach");
  revalidatePath(`/coach/coaches/${clientId}`);
  revalidatePath("/coach/coaches");
  revalidatePath("/coach/modeles");
  revalidatePath(`/coach/programmes/${program.id}`);
  revalidatePath("/app");
  revalidatePath("/app/messages");
  return { id: program.id };
}
