"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CONFIRMATION_COOKIE,
  CONTACT_FIELDS,
  INTAKE_FIELDS,
  MSG_SLOT_TAKEN,
  isFormat,
  normalizePhone,
  prettyPhone,
  slotFits,
  validateReservation,
  type Confirmation,
  type ReserveState,
  type ReserveValues,
} from "./format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Réservation du bilan offert par un visiteur sans compte :
 * book_slot() crée la réservation (le déclencheur refuse un créneau déjà pris),
 * puis submit_intake() enregistre le questionnaire. Les deux fonctions sont ouvertes à anon (0002_rls.sql).
 */
export async function reserveBilan(slotId: string, format: string, _prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const values: ReserveValues = {};
  for (const f of [...CONTACT_FIELDS, ...INTAKE_FIELDS]) values[f] = String(formData.get(f) ?? "").slice(0, 500);

  if (!UUID.test(slotId) || !isFormat(format)) return { values, errors: { slot: MSG_SLOT_TAKEN } };
  const errors = validateReservation(values);
  if (Object.keys(errors).length) return { values, errors };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { values, errors: { form: "La réservation est indisponible pour le moment. Réessayez dans quelques minutes." } };

  // Le créneau est-il toujours libre, à venir et compatible avec le format choisi ?
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, format")
    .eq("id", slotId)
    .eq("is_booked", false)
    .gt("starts_at", new Date().toISOString())
    .maybeSingle();
  if (!slot || !slotFits(slot.format, format)) return { values, errors: { slot: MSG_SLOT_TAKEN } };

  const phone = prettyPhone(normalizePhone(values.phone ?? "") ?? "");
  const fullName = (values.full_name ?? "").trim().replace(/\s+/g, " ");
  const { data: bookingId, error } = await supabase.rpc("book_slot", {
    p_slot_id: slot.id,
    p_full_name: fullName,
    p_phone: phone,
    p_email: (values.email ?? "").trim(),
    p_format: format,
  });
  if (error || !bookingId) {
    if (error?.message?.includes("plus disponible") || error?.message?.includes("introuvable")) return { values, errors: { slot: MSG_SLOT_TAKEN } };
    return { values, errors: { form: "La réservation n’a pas pu être enregistrée. Réessayez." } };
  }

  const answers: Record<string, string> = {};
  for (const f of INTAKE_FIELDS) {
    const v = (values[f] ?? "").trim();
    if (v) answers[f] = v;
  }
  const { error: intakeError } = await supabase.rpc("submit_intake", { p_booking_id: bookingId, p_answers: answers });

  const confirmation: Confirmation = {
    bookingId,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    format,
    firstName: fullName.split(" ")[0] ?? fullName,
    phone,
    intakeSent: !intakeError,
  };
  (await cookies()).set(CONFIRMATION_COOKIE, JSON.stringify(confirmation), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/decouvrir",
    maxAge: 60 * 60 * 24,
  });
  redirect("/decouvrir/confirmation");
}
