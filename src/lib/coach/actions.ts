"use server";

import { revalidatePath } from "next/cache";
import { coachSupabase } from "./supabase";
import { getFutureSessions } from "./queries";
import { firstName, fmtKg } from "./format";
import { addEventMessage } from "@/lib/messages/thread";

/** Server Actions de l'espace coach. Les écritures passent par la RLS existante (politiques *_coach_all). */

export type AdjustState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const STEP = 2.5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireCoach() {
  const supabase = await coachSupabase();
  if (!supabase) return { error: "Supabase n’est pas configuré." } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnecte-toi." } as const;
  return { supabase, user } as const;
}

function revalidateLoop(clientId: string) {
  revalidatePath("/coach");
  revalidatePath(`/coach/coaches/${clientId}`);
  revalidatePath("/app");
  revalidatePath("/app/messages");
}

/**
 * Applique les ajustements de charge choisis (champs `delta:<exercise_id>` = -2.5 | 0 | 2.5) :
 * 1. met à jour target_load_kg des séries des séances futures (status planned) du programme actif, pour chaque exercice changé ;
 * 2. ajoute un message événement par exercice dans le fil du coaché ;
 * 3. marque le retour comme traité.
 */
export async function applyAdjustment(_prev: AdjustState, formData: FormData): Promise<AdjustState> {
  const clientId = String(formData.get("clientId") ?? "");
  const feedbackId = String(formData.get("feedbackId") ?? "");
  if (!UUID.test(clientId)) return { status: "error", message: "Coaché introuvable." };

  const deltas = new Map<string, number>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("delta:")) continue;
    const exerciseId = key.slice(6);
    const d = Number(value);
    if (!UUID.test(exerciseId) || ![-STEP, 0, STEP].includes(d)) return { status: "error", message: "Ajustement invalide." };
    if (d !== 0) deltas.set(exerciseId, d);
  }
  if (deltas.size === 0) {
    return { status: "error", fieldErrors: { adjust: "Choisis −2,5 kg ou +2,5 kg sur au moins un exercice." } };
  }

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const { supabase, user } = auth;

  // La RLS ne renvoie la fiche que si le coaché est à moi.
  const { data: client } = await supabase
    .from("clients")
    .select("id, coach_id, profiles!clients_profile_id_fkey(full_name)")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || client.coach_id !== user.id) return { status: "error", message: "Ce coaché ne fait pas partie de tes coachés." };
  const profile = client.profiles as unknown as { full_name: string } | { full_name: string }[] | null;
  const fullName = (Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name) ?? "le coaché";

  const { future } = await getFutureSessions(supabase, clientId);
  if (!future.length) return { status: "error", message: "Aucune séance future à ajuster dans le programme actif." };

  const changes: { exerciseId: string; name: string; before: number; after: number; sets: number; sessions: number }[] = [];
  for (const [exerciseId, d] of deltas) {
    const occurrences = future.flatMap((s) => s.exercises.filter((x) => x.exercise_id === exerciseId));
    const sets = occurrences.flatMap((x) => x.sets).filter((z) => z.target_load_kg != null);
    if (!sets.length) return { status: "error", message: "Cet exercice n’a pas de charge dans les séances à venir." };
    const firstLoads = occurrences.find((x) => x.sets.some((z) => z.target_load_kg != null))!.sets.map((z) => z.target_load_kg ?? 0);
    const before = Math.max(...firstLoads);
    const after = before + d;
    if (after < 0) return { status: "error", fieldErrors: { adjust: "La charge ne peut pas être négative." } };

    // Une mise à jour par valeur de départ (garde une éventuelle progression entre séances).
    const byLoad = new Map<number, string[]>();
    for (const z of sets) byLoad.set(z.target_load_kg!, [...(byLoad.get(z.target_load_kg!) ?? []), z.id]);
    for (const [load, ids] of byLoad) {
      const { data: updated, error } = await supabase
        .from("sets")
        .update({ target_load_kg: Math.max(0, load + d) })
        .in("id", ids)
        .eq("client_id", clientId)
        .select("id");
      if (error || (updated ?? []).length !== ids.length) {
        return { status: "error", message: "La mise à jour du programme a échoué. Réessaie." };
      }
    }
    changes.push({ exerciseId, name: occurrences[0].name, before, after, sets: sets.length, sessions: occurrences.length });
  }

  // Messages événement dans le fil du coaché (bibliothèque messages : expéditeur « coach » déduit du rôle).
  for (const c of changes) {
    const sent = await addEventMessage(clientId, `Programme mis à jour : ${c.name} ${fmtKg(c.before)} → ${fmtKg(c.after)} kg`, {
      type: "ajustement",
      exercise_id: c.exerciseId,
      exercise: c.name,
      before_kg: c.before,
      after_kg: c.after,
      sessions: c.sessions,
      feedback_id: UUID.test(feedbackId) ? feedbackId : null,
    });
    if (!sent.ok) return { status: "error", message: "Programme mis à jour, mais le message n’a pas pu être envoyé. Réessaie l’envoi depuis la messagerie." };
  }

  if (UUID.test(feedbackId)) {
    await supabase.from("session_feedback").update({ handled_at: new Date().toISOString() }).eq("id", feedbackId).eq("client_id", clientId).is("handled_at", null);
  }

  revalidateLoop(clientId);
  const summary = changes.map((c) => `${c.name} ${fmtKg(c.before)} → ${fmtKg(c.after)} kg`).join(", ");
  return { status: "ok", message: `${summary}. ${firstName(fullName)} est prévenue dans ses messages.` };
}

/** « Garder » : aucune charge ne change, le retour passe simplement en traité. */
export async function markFeedbackHandled(_prev: AdjustState, formData: FormData): Promise<AdjustState> {
  const clientId = String(formData.get("clientId") ?? "");
  const feedbackId = String(formData.get("feedbackId") ?? "");
  if (!UUID.test(clientId) || !UUID.test(feedbackId)) return { status: "error", message: "Retour introuvable." };
  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const { data, error } = await auth.supabase
    .from("session_feedback")
    .update({ handled_at: new Date().toISOString() })
    .eq("id", feedbackId)
    .eq("client_id", clientId)
    .is("handled_at", null)
    .select("id");
  if (error || !data?.length) return { status: "error", message: "Ce retour est déjà traité ou introuvable." };
  revalidateLoop(clientId);
  return { status: "ok", message: "Retour marqué comme traité, charges inchangées." };
}
