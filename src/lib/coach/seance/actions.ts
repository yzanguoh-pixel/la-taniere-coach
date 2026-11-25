"use server";

import { revalidatePath } from "next/cache";
import { coachSupabase, type Supabase } from "@/lib/coach/supabase";
import { addEventMessage } from "@/lib/messages/thread";
import { FEELINGS, type Feeling } from "@/lib/coache/format";

/**
 * Écritures du coach sur une séance de son coaché (séance encadrée à la salle, ou correction d'une séance solo).
 * La RLS (coach_owns_client) limite déjà le coach à ses coachés ; on vérifie en plus le rattachement
 * pour renvoyer une erreur claire. Les triggers 0012 / 0022 ne visent que le rôle coaché.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseNumber = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

type Ctx = { supabase: Supabase; userId: string; coachFirstName: string };

/** Coach connecté propriétaire de la séance, ou un message d'erreur. */
async function coachForSession(sessionId: string): Promise<(Ctx & { session: { id: string; client_id: string; name: string; status: string; mode: string } }) | { error: string }> {
  if (!UUID.test(sessionId)) return { error: "Séance introuvable." };
  const supabase = await coachSupabase();
  if (!supabase) return { error: "La base de données n’est pas configurée." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré. Reconnecte-toi." };
  const [{ data: me }, { data: session }] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("client_sessions").select("id, client_id, name, status, mode, clients!inner ( coach_id )").eq("id", sessionId).maybeSingle(),
  ]);
  if (me?.role !== "coach") return { error: "Réservé au coach." };
  const owner = (session as unknown as { clients: { coach_id: string } | null } | null)?.clients?.coach_id;
  if (!session || owner !== user.id) return { error: "Séance introuvable." };
  const coachFirstName = (me.full_name ?? "").trim().split(/\s+/)[0] || "Le coach";
  return { supabase, userId: user.id, coachFirstName, session: { id: session.id, client_id: session.client_id, name: session.name, status: session.status, mode: session.mode } };
}

function revalidateSession(sessionId: string, clientId: string) {
  revalidatePath(`/coach/seances/${sessionId}`);
  revalidatePath(`/coach/coaches/${clientId}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  revalidatePath(`/app/seance/${sessionId}`);
  revalidatePath("/app");
}

/* ---------------------------------------------------------------- séries d'un exercice */

export type SetErrors = { reps?: string; load?: string; rpe?: string };
export type ExerciseState = { ok?: boolean; saved?: string[]; errors?: Record<string, SetErrors>; form?: string };

/**
 * Enregistre le réalisé d'un exercice. Le bouton « Valider » d'une série envoie `only=<setId>` ;
 * « Valider tout l'exercice » enregistre toutes les séries de l'exercice.
 * Champs : reps:<setId>, load:<setId> (si la série a une charge), rpe:<setId> (facultatif).
 */
export async function saveExerciseSets(sessionId: string, sessionExerciseId: string, _prev: ExerciseState, formData: FormData): Promise<ExerciseState> {
  if (!UUID.test(sessionExerciseId)) return { form: "Exercice introuvable." };
  const ctx = await coachForSession(sessionId);
  if ("error" in ctx) return { form: ctx.error };
  const { supabase, session } = ctx;

  const { data: sets } = await supabase
    .from("sets")
    .select("id, session_exercises!inner ( id, client_session_id )")
    .eq("session_exercise_id", sessionExerciseId)
    .eq("session_exercises.client_session_id", sessionId);
  const ids = (sets ?? []).map((s) => s.id);
  if (!ids.length) return { form: "Exercice introuvable." };

  const only = String(formData.get("only") ?? "");
  const targets = only ? ids.filter((id) => id === only) : ids;
  if (!targets.length) return { form: "Série introuvable." };

  const errors: Record<string, SetErrors> = {};
  const updates: { id: string; reps: number; load_kg: number | null; rpe: number | null }[] = [];
  for (const id of targets) {
    const reps = parseNumber(formData.get(`reps:${id}`));
    const hasLoad = formData.has(`load:${id}`);
    const load = hasLoad ? parseNumber(formData.get(`load:${id}`)) : null;
    const rpe = parseNumber(formData.get(`rpe:${id}`));
    const e: SetErrors = {};
    if (reps === null || Number.isNaN(reps) || !Number.isInteger(reps) || reps < 0 || reps > 999) e.reps = "Entier de 0 à 999.";
    if (hasLoad && (load === null || Number.isNaN(load) || load < 0 || load > 500)) e.load = "De 0 à 500 kg.";
    if (rpe !== null && (Number.isNaN(rpe) || rpe < 1 || rpe > 10 || Math.round(rpe * 2) !== rpe * 2)) e.rpe = "De 1 à 10.";
    if (e.reps || e.load || e.rpe) errors[id] = e;
    else updates.push({ id, reps: reps as number, load_kg: hasLoad ? load : null, rpe });
  }
  if (Object.keys(errors).length) return { errors };

  for (const u of updates) {
    const { data, error } = await supabase.from("sets").update({ done: true, reps: u.reps, load_kg: u.load_kg, rpe: u.rpe }).eq("id", u.id).select("id");
    if (error || !data?.length) return { form: "Une série n’a pas pu être enregistrée. Réessaie." };
  }

  revalidateSession(sessionId, session.client_id);
  return { ok: true, saved: updates.map((u) => u.id) };
}

/* ---------------------------------------------------------------- fin de séance */

export type FinishState = {
  ok?: boolean;
  message?: string;
  errors?: { rpe?: string; feeling?: string; pain_zone?: string; note?: string; form?: string };
};

/**
 * « Terminer la séance » par le coach : séries restantes validées à la cible (si demandé),
 * séance passée à 'done', compte rendu enregistré (traité d'office : c'est le coach qui l'écrit)
 * et événement dans le fil du coaché.
 */
export async function finishSessionByCoach(sessionId: string, _prev: FinishState, formData: FormData): Promise<FinishState> {
  const rpe = parseNumber(formData.get("rpe"));
  const feeling = String(formData.get("feeling") ?? "") as Feeling;
  const painZone = String(formData.get("pain_zone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const completeRest = formData.get("complete_rest") === "on";

  const errors: NonNullable<FinishState["errors"]> = {};
  if (rpe === null || Number.isNaN(rpe) || !Number.isInteger(rpe) || rpe < 1 || rpe > 10) errors.rpe = "Choisis l’effort global, de 1 à 10.";
  if (!FEELINGS.includes(feeling)) errors.feeling = "Choisis le ressenti.";
  else if (feeling === "douleur" && !painZone) errors.pain_zone = "Précise la zone douloureuse.";
  if (painZone.length > 80) errors.pain_zone = "80 caractères maximum.";
  if (note.length > 500) errors.note = "500 caractères maximum.";
  if (Object.keys(errors).length) return { errors };

  const ctx = await coachForSession(sessionId);
  if ("error" in ctx) return { errors: { form: ctx.error } };
  const { supabase, session, coachFirstName } = ctx;
  const now = new Date().toISOString();
  const wasDone = session.status === "done";

  // Séries de la séance.
  const { data: rows, error: setsError } = await supabase
    .from("sets")
    .select("id, done, target_reps, target_load_kg, target_rpe, session_exercise_id, session_exercises!inner ( client_session_id )")
    .eq("session_exercises.client_session_id", sessionId);
  if (setsError) return { errors: { form: "Les séries n’ont pas pu être lues. Réessaie." } };
  const sets = rows ?? [];

  if (completeRest) {
    for (const s of sets.filter((x) => !x.done)) {
      const { error } = await supabase
        .from("sets")
        .update({ done: true, reps: s.target_reps, load_kg: s.target_load_kg, rpe: s.target_rpe })
        .eq("id", s.id);
      if (error) return { errors: { form: "Les séries restantes n’ont pas pu être validées. Réessaie." } };
      s.done = true;
    }
  }

  // Compte rendu : un seul par séance (index unique 0006) ; mis à jour s'il existe.
  const feedback = { rpe: rpe as number, feeling, pain_zone: feeling === "douleur" ? painZone : null, note: note || null, handled_at: now };
  const { data: existing } = await supabase.from("session_feedback").select("id").eq("client_session_id", sessionId).maybeSingle();
  const fbRes = existing
    ? await supabase.from("session_feedback").update(feedback).eq("id", existing.id).select("id")
    : await supabase.from("session_feedback").insert({ ...feedback, client_session_id: sessionId, client_id: session.client_id }).select("id");
  if (fbRes.error || !fbRes.data?.length) return { errors: { form: "Le compte rendu n’a pas pu être enregistré. Réessaie." } };

  if (!wasDone) {
    const { error } = await supabase.from("client_sessions").update({ status: "done", done_at: now }).eq("id", sessionId);
    if (error) return { errors: { form: "La séance n’a pas pu être terminée. Réessaie." } };

    const doneSets = sets.filter((s) => s.done);
    const exCount = new Set(doneSets.map((s) => s.session_exercise_id)).size;
    const kind = session.mode === "presentiel" ? "Séance encadrée" : "Séance";
    const body = `${kind} « ${session.name} » complétée par ${coachFirstName} : ${exCount} exercice${exCount > 1 ? "s" : ""}, ${doneSets.length} série${doneSets.length > 1 ? "s" : ""}.`;
    const msg = await addEventMessage(session.client_id, body, { type: "seance_encadree", session_id: sessionId });
    if (!msg.ok) console.error("finishSessionByCoach: message non enregistré", msg.error);
    revalidatePath("/app/messages");
  }

  revalidateSession(sessionId, session.client_id);
  return { ok: true, message: wasDone ? "Compte rendu mis à jour." : "Séance terminée. Le compte rendu est enregistré et un message a été ajouté au fil du coaché." };
}
