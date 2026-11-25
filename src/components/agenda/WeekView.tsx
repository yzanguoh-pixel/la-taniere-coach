import Link from "next/link";
import type { AgendaBooking, AgendaSlot, WeekData } from "@/lib/agenda/queries";
import { addDays, fmtTime, formatLabel, weekDays, weekLabel } from "@/lib/agenda/week";
import { IconChevron } from "@/components/icons";
import { DeleteSlotButton } from "./DeleteSlotButton";
import { IntakeBadge } from "./BookingRequests";

type Item =
  | { kind: "slot"; at: string; slot: AgendaSlot; booking: AgendaBooking | null }
  | { kind: "booking"; at: string; booking: AgendaBooking };

/** Navigation entre semaines (lien ?semaine=AAAA-MM-JJ, le lundi). */
export function WeekNav({ monday, currentMonday }: { monday: string; currentMonday: string }) {
  const link = "btn-secondaire min-h-11 px-4 text-[15px]";
  return (
    <nav aria-label="Changer de semaine" className="flex flex-wrap items-center gap-2">
      <Link href={`/coach/agenda?semaine=${addDays(monday, -7)}`} className={link} scroll={false}>
        <IconChevron className="rotate-180" width={18} height={18} />
        <span>Semaine précédente</span>
      </Link>
      {monday !== currentMonday && (
        <Link href="/coach/agenda" className={link} scroll={false}>
          Cette semaine
        </Link>
      )}
      <Link href={`/coach/agenda?semaine=${addDays(monday, 7)}`} className={link} scroll={false}>
        <span>Semaine suivante</span>
        <IconChevron width={18} height={18} />
      </Link>
    </nav>
  );
}

/** Vue de la semaine : 7 colonnes sur grand écran, liste par jour sur mobile. */
export function WeekView({ monday, today, data, nowIso }: { monday: string; today: string; data: WeekData; nowIso: string }) {
  const days = weekDays(monday);
  const bookingBySlot = new Map(data.bookings.filter((b) => b.slotId).map((b) => [b.slotId as string, b]));
  const slotIds = new Set(data.slots.map((s) => s.id));
  const free = data.slots.filter((s) => !s.isBooked).length;
  const booked = data.bookings.length;

  return (
    <section aria-labelledby="semaine-titre" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="semaine-titre" className="text-sous-titre">
            {weekLabel(monday)}
          </h2>
          <p className="mt-1 text-[15px] tabular-nums text-texte-2">
            {free} créneau{free > 1 ? "x" : ""} libre{free > 1 ? "s" : ""} · {booked} bilan{booked > 1 ? "s" : ""} réservé{booked > 1 ? "s" : ""} · {data.sessions.length} séance{data.sessions.length > 1 ? "s" : ""} de coachés
          </p>
        </div>
      </div>

      <ol className="grid gap-4 lg:grid-cols-7 lg:gap-2">
        {days.map((d) => {
          const items: Item[] = [
            ...data.slots.filter((s) => s.day === d.iso).map((s): Item => ({ kind: "slot", at: s.startsAt, slot: s, booking: bookingBySlot.get(s.id) ?? null })),
            ...data.bookings
              .filter((b) => b.day === d.iso && (!b.slotId || !slotIds.has(b.slotId)))
              .map((b): Item => ({ kind: "booking", at: b.startsAt ?? "", booking: b })),
          ].sort((a, b) => a.at.localeCompare(b.at));
          const sessions = data.sessions.filter((s) => s.day === d.iso);
          const isToday = d.iso === today;
          const isPast = d.iso < today;

          return (
            <li key={d.iso} className="flex min-w-0 flex-col gap-2" aria-label={d.long}>
              <h3 className={`flex items-baseline gap-2 px-1 text-[15px] font-semibold capitalize ${isToday ? "text-olive-fonce" : isPast ? "text-texte-2" : "text-texte"}`}>
                <span className="lg:hidden">{d.long}</span>
                <span className="hidden tabular-nums lg:inline">{d.short}</span>
                {isToday && <span className="rounded-full bg-olive-pale px-2 py-0.5 text-legende normal-case text-olive-fonce">Aujourd’hui</span>}
              </h3>
              {items.length === 0 && sessions.length === 0 ? (
                <p className="liste-groupee px-4 py-3 text-[15px] text-texte-2">Rien de prévu</p>
              ) : (
                <ul className={`liste-groupee ${isPast ? "opacity-70" : ""}`}>
                  {items.map((it) => (it.kind === "slot" ? <SlotRow key={it.slot.id} slot={it.slot} booking={it.booking} nowIso={nowIso} /> : <BookingRow key={it.booking.id} booking={it.booking} />))}
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <Link href={`/coach/coaches/${s.clientId}`} className="flex min-h-11 flex-col justify-center px-4 py-2.5 transition-colors hover:bg-fond">
                        <span className="text-legende font-semibold text-ciel-fonce">Séance {s.label}</span>
                        <span className="truncate text-[15px] font-semibold">{s.name}</span>
                        <span className="truncate text-legende text-texte-2">{s.sessionName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-legende text-texte-2">Heures de Paris. Un créneau réservé ne peut pas être retiré : ouvre le bilan pour le gérer.</p>
    </section>
  );
}

function SlotRow({ slot, booking, nowIso }: { slot: AgendaSlot; booking: AgendaBooking | null; nowIso: string }) {
  const time = `${fmtTime(slot.startsAt)} – ${fmtTime(slot.endsAt)}`;
  if (slot.isBooked) {
    if (booking) return <BookingRow booking={booking} time={time} />;
    return (
      <li className="flex flex-col px-4 py-2.5">
        <span className="text-[15px] font-semibold tabular-nums">{time}</span>
        <span className="text-legende font-semibold text-lavande-fonce">Réservé</span>
      </li>
    );
  }
  const past = slot.startsAt < nowIso;
  return (
    <li className="flex items-center justify-between gap-2 px-4 py-2 lg:flex-col lg:items-start lg:gap-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold tabular-nums">{time}</span>
        <span className="text-legende text-texte-2">
          <span className="font-semibold text-olive-fonce">Libre</span> · {formatLabel[slot.format] ?? slot.format}
        </span>
      </span>
      {!past && <DeleteSlotButton slotId={slot.id} label={time} />}
    </li>
  );
}

function BookingRow({ booking, time }: { booking: AgendaBooking; time?: string }) {
  return (
    <li>
      <Link href={`/coach/bilans/${booking.id}`} className="flex min-h-11 flex-col gap-1 bg-lavande/50 px-4 py-2.5 transition-colors hover:bg-lavande">
        <span className="text-[15px] font-semibold tabular-nums">{time ?? (booking.startsAt ? fmtTime(booking.startsAt) : "")}</span>
        <span className="text-legende font-semibold text-lavande-fonce">Bilan offert · {formatLabel[booking.format] ?? booking.format}</span>
        <span className="truncate text-[15px] font-semibold">{booking.name}</span>
        <span>
          <IntakeBadge intake={booking.intake} />
        </span>
      </Link>
    </li>
  );
}
