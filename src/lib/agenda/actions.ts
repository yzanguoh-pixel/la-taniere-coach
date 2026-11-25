"use server";

import { revalidatePath } from "next/cache";
import { coachSupabase } from "@/lib/coach/supabase";
import { fmtDayShort, fmtTime, isHhmm, isIsoDate, parisToUtc } from "./week";

/** Server Actions de l'agenda : ajout et suppression d'un créneau de disponibilité (RLS slots_coach_all). */

export type SlotState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"date" | "start" | "end" | "format", string>>;
  values?: { date: string; start: string; end: string; format: string };
};

const FORMATS = ["visio", "salle", "les_deux"];
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

function revalidateAgenda() {
  revalidatePath("/coach/agenda");
  revalidatePath("/decouvrir/creneau");
}

export async function addSlot(_prev: SlotState, formData: FormData): Promise<SlotState> {
  const values = {
    date: String(formData.get("date") ?? "").trim(),
    start: String(formData.get("start") ?? "").trim(),
    end: String(formData.get("end") ?? "").trim(),
    format: String(formData.get("format") ?? "").trim(),
  };
  const fieldErrors: SlotState["fieldErrors"] = {};
  if (!values.date) fieldErrors.date = "Choisis la date du créneau.";
  else if (!isIsoDate(values.date)) fieldErrors.date = "Date invalide.";
  if (!values.start) fieldErrors.start = "Indique l’heure de début.";
  else if (!isHhmm(values.start)) fieldErrors.start = "Heure invalide.";
  if (!values.end) fieldErrors.end = "Indique l’heure de fin.";
  else if (!isHhmm(values.end)) fieldErrors.end = "Heure invalide.";
  if (!FORMATS.includes(values.format)) fieldErrors.format = "Choisis un format.";

  if (!fieldErrors.date && !fieldErrors.start && !fieldErrors.end) {
    const startsAt = parisToUtc(values.date, values.start);
    const endsAt = parisToUtc(values.date, values.end);
    if (endsAt <= startsAt) fieldErrors.end = "L’heure de fin doit être après l’heure de début.";
    if (startsAt.getTime() <= Date.now()) fieldErrors.start = "Ce créneau est déjà passé : choisis une date et une heure à venir.";
  }
  if (Object.keys(fieldErrors).length) return { status: "error", fieldErrors, values };

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error, values };
  const { supabase, user } = auth;

  const startsAt = parisToUtc(values.date, values.start);
  const endsAt = parisToUtc(values.date, values.end);
  const { error } = await supabase.from("availability_slots").insert({
    coach_id: user.id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    format: values.format,
  });
  if (error) return { status: "error", message: "Le créneau n’a pas pu être ajouté. Réessaie.", values };

  revalidateAgenda();
  return { status: "ok", message: `Créneau ajouté : ${fmtDayShort(startsAt)}, ${fmtTime(startsAt)} – ${fmtTime(endsAt)}.` };
}

export type DeleteState = { status: "idle" | "ok" | "error"; message?: string };

/** Supprime un créneau libre. Un créneau réservé ne se supprime pas ici (le bilan y est rattaché). */
export async function deleteSlot(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const slotId = String(formData.get("slotId") ?? "");
  if (!UUID.test(slotId)) return { status: "error", message: "Créneau introuvable." };

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("coach_id", user.id)
    .eq("is_booked", false)
    .select("id");
  if (error) return { status: "error", message: "Le créneau n’a pas pu être supprimé. Réessaie." };
  if (!data?.length) return { status: "error", message: "Ce créneau est réservé ou n’existe plus : il ne peut pas être supprimé." };

  revalidateAgenda();
  return { status: "ok", message: "Créneau supprimé." };
}
