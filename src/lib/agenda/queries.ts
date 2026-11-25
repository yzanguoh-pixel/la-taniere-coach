import "server-only";
import type { Supabase } from "@/lib/coach/supabase";
import { addDays, parisDate, parisToUtc } from "./week";

/**
 * Lectures de l'agenda du coach. Les créneaux libres sont lisibles par tous (réservation publique) :
 * on filtre donc toujours explicitement sur coach_id = le coach connecté.
 */

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type IntakeStatus = "recu" | "en_attente" | null;

export type AgendaSlot = { id: string; startsAt: string; endsAt: string; format: string; isBooked: boolean; day: string };
export type AgendaBooking = {
  id: string;
  slotId: string | null;
  name: string;
  startsAt: string | null;
  format: string;
  status: string;
  intake: IntakeStatus;
  day: string | null;
};
/** Séance d'un coaché : « presentiel » = encadrée par Karim à la salle (heure fixée, 1 h) ; « solo » = en autonomie, suivie à distance. */
export type AgendaSession = {
  id: string;
  clientId: string;
  name: string;
  firstName: string;
  label: string;
  sessionName: string;
  day: string;
  mode: "presentiel" | "solo";
  startsAt: string | null;
  done: boolean;
};

export type WeekData = { slots: AgendaSlot[]; bookings: AgendaBooking[]; sessions: AgendaSession[] };

/** Statuts de bilan encore « vivants » dans l'agenda (ni annulés ni déjà convertis). */
const OPEN_STATUSES = ["demande", "confirme"];

function intakeOf(v: unknown): IntakeStatus {
  const f = one(v as { status: string } | { status: string }[] | null);
  return f?.status === "recu" ? "recu" : f?.status === "en_attente" ? "en_attente" : null;
}

/** Créneaux, bilans et séances (encadrées et en autonomie, faites ou à venir) de la semaine commençant au lundi donné (heure de Paris). */
export async function getWeek(supabase: Supabase, coachId: string, monday: string): Promise<WeekData> {
  const from = parisToUtc(monday, "00:00").toISOString();
  const to = parisToUtc(addDays(monday, 7), "00:00").toISOString();

  const [slotsRes, bookingsRes, sessionsRes] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, format, is_booked")
      .eq("coach_id", coachId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase
      .from("bookings")
      .select("id, slot_id, full_name, starts_at, format, status, intake_forms(status)")
      .eq("coach_id", coachId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .in("status", [...OPEN_STATUSES, "realise", "converti"])
      .order("starts_at"),
    supabase
      .from("client_sessions")
      .select("id, client_id, label, name, date, mode, starts_at, status, clients!inner(coach_id, profiles!clients_profile_id_fkey(full_name))")
      .eq("clients.coach_id", coachId)
      .in("status", ["planned", "done"])
      .gte("date", monday)
      .lte("date", addDays(monday, 6))
      .order("date")
      .order("starts_at", { nullsFirst: false }),
  ]);
  if (slotsRes.error) throw new Error("Impossible de charger les créneaux : " + slotsRes.error.message);
  if (bookingsRes.error) throw new Error("Impossible de charger les bilans : " + bookingsRes.error.message);
  if (sessionsRes.error) throw new Error("Impossible de charger les séances : " + sessionsRes.error.message);

  return {
    slots: (slotsRes.data ?? []).map((s) => ({
      id: s.id,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      format: s.format,
      isBooked: s.is_booked,
      day: parisDate(s.starts_at),
    })),
    bookings: (bookingsRes.data ?? []).map((b) => ({
      id: b.id,
      slotId: b.slot_id,
      name: b.full_name,
      startsAt: b.starts_at,
      format: b.format,
      status: b.status,
      intake: intakeOf(b.intake_forms),
      day: b.starts_at ? parisDate(b.starts_at) : null,
    })),
    sessions: (sessionsRes.data ?? []).map((s) => {
      const client = one(s.clients as unknown as { profiles: { full_name: string } | { full_name: string }[] | null } | null);
      const name = one(client?.profiles)?.full_name ?? "Coaché";
      const presentiel = s.mode === "presentiel";
      return {
        id: s.id,
        clientId: s.client_id,
        name,
        firstName: name.split(/\s+/)[0] || name,
        label: s.label,
        sessionName: s.name,
        day: presentiel && s.starts_at ? parisDate(s.starts_at) : s.date,
        mode: presentiel ? "presentiel" : "solo",
        startsAt: presentiel ? (s.starts_at ?? null) : null,
        done: s.status === "done",
      };
    }),
  };
}

/** Demandes de bilan à venir (ou sans date), la plus proche d'abord. */
export async function getUpcomingRequests(supabase: Supabase, coachId: string, now: Date): Promise<AgendaBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, slot_id, full_name, starts_at, format, status, intake_forms(status)")
    .eq("coach_id", coachId)
    .in("status", OPEN_STATUSES)
    .or(`starts_at.gte."${now.toISOString()}",starts_at.is.null`)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error("Impossible de charger les demandes de bilan : " + error.message);
  return (data ?? []).map((b) => ({
    id: b.id,
    slotId: b.slot_id,
    name: b.full_name,
    startsAt: b.starts_at,
    format: b.format,
    status: b.status,
    intake: intakeOf(b.intake_forms),
    day: b.starts_at ? parisDate(b.starts_at) : null,
  }));
}
