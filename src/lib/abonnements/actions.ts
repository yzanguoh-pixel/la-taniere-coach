"use server";

import { revalidatePath } from "next/cache";
import { addEventMessage } from "@/lib/messages/thread";
import { todayParis } from "@/lib/progression/compute";
import { abonnementsSupabase, getClientProgress } from "./queries";
import { addMonths, asPeriod, longDay, periodMonths, progressSummary, reminderBody } from "./format";

/** Server Actions des abonnements (espace coach). Écritures via la RLS existante (politiques *_coach_all). */

export type SubActionState = { status: "idle" | "ok" | "error"; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SubWithClient = {
  id: string;
  client_id: string;
  plan_name: string;
  price_eur: number | null;
  period: string;
  renews_on: string;
  status: string;
  clients: { coach_id: string; profiles: { full_name: string } | null } | null;
};

async function loadOwnSubscription(formData: FormData) {
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!UUID.test(subscriptionId)) return { error: "Abonnement introuvable." } as const;
  const supabase = await abonnementsSupabase();
  if (!supabase) return { error: "La base de données n’est pas configurée." } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnecte-toi." } as const;
  const { data } = await supabase
    .from("subscriptions")
    .select("id, client_id, plan_name, price_eur, period, renews_on, status, clients(coach_id, profiles!clients_profile_id_fkey(full_name))")
    .eq("id", subscriptionId)
    .maybeSingle();
  const sub = data as unknown as SubWithClient | null;
  if (!sub || sub.clients?.coach_id !== user.id) return { error: "Cet abonnement ne concerne pas un de tes coachés." } as const;
  const firstName = sub.clients?.profiles?.full_name?.trim().split(/\s+/)[0] || "ton coaché";
  return { supabase, sub, firstName } as const;
}

function revalidateAll() {
  revalidatePath("/coach/abonnements");
  revalidatePath("/coach/coaches");
  revalidatePath("/app/profil");
  revalidatePath("/app/messages");
}

/** Rappel J-7 (envoi simulé) : message événement avec un bilan de progression court dans le fil du coaché. */
export async function sendReminder(_prev: SubActionState, formData: FormData): Promise<SubActionState> {
  const ctx = await loadOwnSubscription(formData);
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { supabase, sub, firstName } = ctx;

  const today = todayParis();
  const { sessions, targets } = await getClientProgress(supabase, sub.client_id);
  const summary = progressSummary(sessions, targets, sub.renews_on, asPeriod(sub.period), today);
  const body = reminderBody(sub.plan_name, sub.renews_on, today, summary);

  const res = await addEventMessage(sub.client_id, body, {
    type: "rappel_abonnement",
    subscription_id: sub.id,
    renews_on: sub.renews_on,
    simulated: true,
    reference: summary.reference,
    done: summary.done,
    due: summary.due,
  });
  if (!res.ok) return { status: "error", message: `Le rappel n’a pas pu être envoyé : ${res.error}` };
  revalidateAll();
  return { status: "ok", message: `Rappel envoyé à ${firstName} (simulation)` };
}

/** Renouvelle : prolonge l'échéance d'une période, repasse l'abonnement en actif et crée une facture en attente. */
export async function renewSubscription(_prev: SubActionState, formData: FormData): Promise<SubActionState> {
  const ctx = await loadOwnSubscription(formData);
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { supabase, sub, firstName } = ctx;

  const expected = String(formData.get("renewsOn") ?? "");
  if (expected && expected !== sub.renews_on) {
    return { status: "error", message: "Cet abonnement vient déjà d’être renouvelé. La page a été mise à jour." };
  }

  const today = todayParis();
  const next = addMonths(sub.renews_on, periodMonths[asPeriod(sub.period)]);

  // Mise à jour conditionnelle : un double envoi ne prolonge pas deux fois.
  const { data: updated, error: upErr } = await supabase
    .from("subscriptions")
    .update({ renews_on: next, status: "actif" })
    .eq("id", sub.id)
    .eq("renews_on", sub.renews_on)
    .select("id");
  if (upErr) return { status: "error", message: "Le renouvellement n’a pas pu être enregistré. Réessaie." };
  if (!updated?.length) {
    revalidateAll();
    return { status: "error", message: "Cet abonnement vient déjà d’être renouvelé. La page a été mise à jour." };
  }

  // Numéro de facture F-AAAAMM-NNN, suivant le plus grand numéro du mois.
  const prefix = `F-${today.slice(0, 4)}${today.slice(5, 7)}-`;
  const { data: existing } = await supabase.from("invoices").select("number").like("number", `${prefix}%`);
  let seq = Math.max(0, ...(existing ?? []).map((f) => Number(f.number.slice(prefix.length)) || 0)) + 1;

  for (let attempt = 0; attempt < 5; attempt++, seq++) {
    const { error } = await supabase.from("invoices").insert({
      subscription_id: sub.id,
      client_id: sub.client_id,
      number: `${prefix}${String(seq).padStart(3, "0")}`,
      amount_eur: sub.price_eur,
      issued_on: today,
      status: "en_attente",
    });
    if (!error) {
      revalidateAll();
      return { status: "ok", message: `Abonnement de ${firstName} renouvelé jusqu’au ${longDay(next)}. Facture en attente créée.` };
    }
    if (error.code !== "23505") break; // autre erreur que « numéro déjà pris »
  }

  // Facture impossible : on annule la prolongation pour rester cohérent.
  await supabase.from("subscriptions").update({ renews_on: sub.renews_on, status: sub.status }).eq("id", sub.id).eq("renews_on", next);
  revalidateAll();
  return { status: "error", message: "La facture n’a pas pu être créée : renouvellement annulé. Réessaie." };
}
