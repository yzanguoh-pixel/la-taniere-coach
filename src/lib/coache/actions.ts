"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addEventMessage } from "@/lib/messages/thread";
import { FEELINGS, type Feeling } from "./format";

/** Écritures de l'espace coaché (Server Actions). La RLS limite chaque écriture aux lignes du coaché connecté. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

const parseNumber = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/* ---------------------------------------------------------------- validation d'une série */

export type SetState = { ok?: boolean; errors?: { reps?: string; load?: string; form?: string } };

export async function validateSet(setId: string, sessionId: string, _prev: SetState, formData: FormData): Promise<SetState> {
  if (!UUID.test(setId) || !UUID.test(sessionId)) return { errors: { form: "Série introuvable." } };
  const ctx = await currentUser();
  if (!ctx) return { errors: { form: "Ta session a expiré. Reconnecte-toi." } };

  const reps = parseNumber(formData.get("reps"));
  const hasLoad = formData.has("load");
  const load = hasLoad ? parseNumber(formData.get("load")) : null;
  const errors: NonNullable<SetState["errors"]> = {};
  if (reps === null || Number.isNaN(reps) || !Number.isInteger(reps) || reps < 0 || reps > 999) errors.reps = "Indique un nombre entier entre 0 et 999.";
  if (hasLoad && (load === null || Number.isNaN(load) || load < 0 || load > 500)) errors.load = "Indique une charge entre 0 et 500 kg.";
  if (errors.reps || errors.load) return { errors };

  const { supabase } = ctx;
  const { data: session } = await supabase.from("client_sessions").select("status").eq("id", sessionId).maybeSingle();
  if (!session) return { errors: { form: "Séance introuvable." } };
  if (session.status !== "planned") return { errors: { form: "Cette séance est déjà terminée." } };

  const { data: owned } = await supabase
    .from("sets")
    .select("id, session_exercises!inner ( client_session_id )")
    .eq("id", setId)
    .eq("session_exercises.client_session_id", sessionId)
    .maybeSingle();
  if (!owned) return { errors: { form: "Série introuvable." } };

  const { data, error } = await supabase.from("sets").update({ done: true, reps, load_kg: hasLoad ? load : null }).eq("id", setId).select("id");
  if (error || !data?.length) return { errors: { form: "La série n’a pas pu être enregistrée. Réessaie." } };

  revalidatePath(`/app/seance/${sessionId}`);
  return { ok: true };
}

/* ---------------------------------------------------------------- retour de fin de séance */

export type FeedbackState = {
  errors?: { rpe?: string; feeling?: string; pain_zone?: string; note?: string; form?: string };
};

export async function submitFeedback(sessionId: string, _prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  if (!UUID.test(sessionId)) return { errors: { form: "Séance introuvable." } };
  const ctx = await currentUser();
  if (!ctx) return { errors: { form: "Ta session a expiré. Reconnecte-toi." } };

  const rpe = parseNumber(formData.get("rpe"));
  const feeling = String(formData.get("feeling") ?? "") as Feeling;
  const painZone = String(formData.get("pain_zone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const errors: NonNullable<FeedbackState["errors"]> = {};
  if (rpe === null || Number.isNaN(rpe) || !Number.isInteger(rpe) || rpe < 1 || rpe > 10) errors.rpe = "Indique ton effort de 1 à 10.";
  if (!FEELINGS.includes(feeling)) errors.feeling = "Choisis ton ressenti.";
  else if (feeling === "douleur" && !painZone) errors.pain_zone = "Précise où tu as mal.";
  if (painZone.length > 80) errors.pain_zone = "80 caractères maximum.";
  if (note.length > 500) errors.note = "500 caractères maximum.";
  if (Object.keys(errors).length) return { errors };

  const { supabase } = ctx;
  const { data: session } = await supabase.from("client_sessions").select("id, client_id, name").eq("id", sessionId).maybeSingle();
  if (!session) return { errors: { form: "Séance introuvable." } };

  const { count } = await supabase.from("session_feedback").select("id", { count: "exact", head: true }).eq("client_session_id", sessionId);
  if (count) return { errors: { form: "Retour déjà envoyé." } };

  const { error: fbError } = await supabase.from("session_feedback").insert({
    client_session_id: sessionId,
    client_id: session.client_id,
    rpe,
    feeling,
    pain_zone: feeling === "douleur" ? painZone : null,
    note: note || null,
  });
  if (fbError?.code === "23505") return { errors: { form: "Retour déjà envoyé." } };
  if (fbError) return { errors: { form: "Ton retour n’a pas pu être envoyé. Réessaie." } };

  const { error: sessError } = await supabase
    .from("client_sessions")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", sessionId);

  const msg = await addEventMessage(session.client_id, `Retour envoyé : ${session.name} — RPE ${rpe}`, { type: "retour", session_id: sessionId, rpe });
  const msgError = msg.ok ? null : msg.error;
  if (sessError || msgError) {
    console.error("submitFeedback: écriture partielle", { sessError, msgError });
  }

  revalidatePath("/app");
  revalidatePath(`/app/seance/${sessionId}`);
  revalidatePath("/app/messages");
  redirect("/app?retour=envoye");
}
