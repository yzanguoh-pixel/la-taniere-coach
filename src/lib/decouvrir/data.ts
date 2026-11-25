import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONFIRMATION_COOKIE, DAYS_AHEAD, dayKeyOf, isFormat, nextDays, timeOf, type Confirmation, type DayOption, type FreeSlot } from "./format";

/**
 * Lectures du parcours prospect. Le visiteur est anonyme : la RLS (policy slots_public_free)
 * ne lui ouvre que les créneaux libres. On filtre quand même is_booked = false, car un coach
 * connecté verrait aussi ses créneaux réservés.
 */

export async function getFreeSlots(): Promise<{ slots: FreeSlot[]; days: DayOption[]; error: boolean }> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const days = nextDays(now);
  if (!supabase) return { slots: [], days, error: true };
  const until = new Date(`${days[DAYS_AHEAD - 1].key}T23:59:59Z`);
  until.setUTCHours(until.getUTCHours() + 2); // fin du dernier jour, heure de Paris
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, format")
    .eq("is_booked", false)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString())
    .order("starts_at");
  if (error) return { slots: [], days, error: true };
  const keys = new Set(days.map((d) => d.key));
  const slots = (data ?? [])
    .map((s) => ({ id: s.id, startsAt: s.starts_at, endsAt: s.ends_at, format: s.format, dayKey: dayKeyOf(new Date(s.starts_at)), time: timeOf(s.starts_at) }))
    .filter((s) => keys.has(s.dayKey));
  return { slots, days, error: false };
}

/** Un créneau encore libre et à venir, ou null s'il vient d'être pris. */
export async function getFreeSlot(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, format")
    .eq("id", id)
    .eq("is_booked", false)
    .gt("starts_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

/** Valeurs de configuration publiques (app_config est lisible par anon). */
export async function getPublicConfig(): Promise<{ adresse: string | null; lienVisio: string | null }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { adresse: null, lienVisio: null };
  const { data } = await supabase.from("app_config").select("key, value").in("key", ["adresse_salle", "lien_visio"]);
  const get = (k: string) => data?.find((r) => r.key === k)?.value?.trim() || null;
  return { adresse: get("adresse_salle"), lienVisio: get("lien_visio") };
}

export async function readConfirmation(): Promise<Confirmation | null> {
  const raw = (await cookies()).get(CONFIRMATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Confirmation;
    if (!c.bookingId || !c.startsAt || !isFormat(c.format)) return null;
    return c;
  } catch {
    return null;
  }
}
