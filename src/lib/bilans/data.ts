import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import { readTests, type PhysicalTests, type TemplateOption } from "./synthese";

export type Supabase = SupabaseClient<Database>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BilanFile = {
  bookingId: string;
  intakeId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  startsAt: string | null;
  format: string;
  status: string;
  intakeStatus: string | null;
  answers: Json | null;
  tests: PhysicalTests | null;
  savedSummary: Json | null;
  convertedClientId: string | null;
  convertedProgramId: string | null;
  templates: TemplateOption[];
};

export async function bilansSupabase(): Promise<Supabase | null> {
  return (await createSupabaseServerClient()) as unknown as Supabase | null;
}

/** Bilan (booking) du coach connecté, avec son questionnaire et ses modèles. La RLS limite aux bookings du coach. */
export async function getBilan(supabase: Supabase, bookingId: string, coachId: string): Promise<BilanFile | null> {
  if (!UUID.test(bookingId)) return null;
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, coach_id, full_name, phone, email, starts_at, format, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.coach_id !== coachId) return null;

  const [{ data: intake }, { data: templates }] = await Promise.all([
    supabase
      .from("intake_forms")
      .select("id, status, answers, tests, summary, converted_client_id")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("program_templates").select("id, name, goal, level, weeks, sessions_per_week").eq("coach_id", coachId).order("name"),
  ]);

  let convertedProgramId: string | null = null;
  if (intake?.converted_client_id) {
    const { data: prog } = await supabase
      .from("client_programs")
      .select("id")
      .eq("client_id", intake.converted_client_id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    convertedProgramId = prog?.id ?? null;
  }

  return {
    bookingId: booking.id,
    intakeId: intake?.id ?? null,
    fullName: booking.full_name,
    phone: booking.phone,
    email: booking.email,
    startsAt: booking.starts_at,
    format: booking.format,
    status: booking.status,
    intakeStatus: intake?.status ?? null,
    answers: intake?.answers ?? null,
    tests: readTests(intake?.tests),
    savedSummary: intake?.summary ?? null,
    convertedClientId: intake?.converted_client_id ?? null,
    convertedProgramId,
    templates: (templates ?? []).map((t) => ({ ...t, weeks: t.weeks ?? 1, sessions_per_week: t.sessions_per_week ?? 1 })),
  };
}
