import Link from "next/link";
import type { AgendaBooking, AgendaSession, AgendaSlot, WeekData } from "@/lib/agenda/queries";
import { addDays, fmtTime, fmtWeekday, formatLabel, sessionEnd, weekDays, weekLabel } from "@/lib/agenda/week";
import { IconChevron } from "@/components/icons";
import { DeleteSlotButton } from "./DeleteSlotButton";
import { IntakeBadge } from "./BookingRequests";

type Item =
  | { kind: "slot"; at: string; slot: AgendaSlot; booking: AgendaBooking | null }
  | { kind: "booking"; at: string; booking: AgendaBooking }
  | { kind: "session"; at: string; session: AgendaSession };

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

/** Petite coche (séance faite). */
function Check(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={props.className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Légende des couleurs de l'agenda. */
function Legend() {
  const item = "inline-flex items-center gap-2";
  return (
    <ul aria-label="Légende" className="flex flex-wrap gap-x-5 gap-y-2 text-legende text-texte-2">
      <li className={item}>
        <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] bg-olive-fonce" />
        Séance encadrée
      </li>
      <li className={item}>
        <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] bg-lavande ring-1 ring-lavande-fonce/40" />
        Bilan réservé
      </li>
      <li className={item}>
        <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] bg-carte ring-1 ring-separateur" />
        Créneau libre
      </li>
      <li className={item}>
        <span aria-hidden="true" className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[4px] bg-olive-pale text-olive-fonce">
          <Check />
        </span>
        Séance faite
      </li>
    </ul>
  );
}

/** Vue de la semaine : 7 colonnes sur grand écran, liste par jour sur mobile. */
export function WeekView({ monday, today, data, nowIso }: { monday: string; today: string; data: WeekData; nowIso: string }) {
  const days = weekDays(monday);
  const bookingBySlot = new Map(data.bookings.filter((b) => b.slotId).map((b) => [b.slotId as string, b]));
  const slotIds = new Set(data.slots.map((s) => s.id));
  const coached = data.sessions.filter((s) => s.mode === "presentiel");
  const solo = data.sessions.filter((s) => s.mode === "solo");
  const free = data.slots.filter((s) => !s.isBooked && s.endsAt > nowIso).length;
  const booked = data.bookings.length;

  return (
    <section aria-labelledby="semaine-titre" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <h2 id="semaine-titre" className="text-sous-titre">
            {weekLabel(monday)}
          </h2>
          <p className="mt-1 text-[15px] font-semibold tabular-nums text-texte">
            {plural(coached.length, "séance encadrée", "séances encadrées")} · {plural(booked, "bilan", "bilans")} · {plural(free, "créneau libre", "créneaux libres")}
          </p>
          <p className="text-legende text-texte-2">Séances encadrées : Karim est avec le coaché à la salle (1 h). Les autres séances se font en autonomie, suivies à distance.</p>
        </div>
        <Legend />
      </div>

      <ol className="grid gap-4 lg:grid-cols-7 lg:gap-2">
        {days.map((d) => {
          const items: Item[] = [
            ...data.slots.filter((s) => s.day === d.iso).map((s): Item => ({ kind: "slot", at: s.startsAt, slot: s, booking: bookingBySlot.get(s.id) ?? null })),
            ...data.bookings
              .filter((b) => b.day === d.iso && (!b.slotId || !slotIds.has(b.slotId)))
              .map((b): Item => ({ kind: "booking", at: b.startsAt ?? "", booking: b })),
            // Séance sans heure : en fin de journée.
            ...coached.filter((s) => s.day === d.iso).map((s): Item => ({ kind: "session", at: s.startsAt ?? "\uffff", session: s })),
          ].sort((a, b) => a.at.localeCompare(b.at));
          const isToday = d.iso === today;
          const isPast = d.iso < today;

          return (
            <li key={d.iso} className="flex min-w-0 flex-col gap-2" aria-label={d.long}>
              <h3 className={`flex items-baseline gap-2 px-1 text-[15px] font-semibold capitalize ${isToday ? "text-olive-fonce" : isPast ? "text-texte-2" : "text-texte"}`}>
                <span className="lg:hidden">{d.long}</span>
                <span className="hidden tabular-nums lg:inline">{d.short}</span>
                {isToday && <span className="rounded-full bg-olive-pale px-2 py-0.5 text-legende normal-case text-olive-fonce">Aujourd’hui</span>}
              </h3>
              {items.length === 0 ? (
                <p className="liste-groupee px-4 py-3 text-[15px] text-texte-2">Rien de prévu</p>
              ) : (
                <ul className="liste-groupee">
                  {items.map((it) =>
                    it.kind === "slot" ? (
                      <SlotRow key={it.slot.id} slot={it.slot} booking={it.booking} nowIso={nowIso} />
                    ) : it.kind === "booking" ? (
                      <BookingRow key={it.booking.id} booking={it.booking} />
                    ) : (
                      <SessionBlock key={it.session.id} session={it.session} />
                    ),
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-legende text-texte-2">Heures de Paris. Un créneau réservé ne peut pas être retiré : ouvre le bilan pour le gérer.</p>

      <SoloSessions sessions={solo} />
    </section>
  );
}

/** Séance encadrée à la salle : bloc olive plein (à venir) ou olive pâle avec coche (faite). */
function SessionBlock({ session: s }: { session: AgendaSession }) {
  const time = s.startsAt ? `${fmtTime(s.startsAt)} – ${fmtTime(sessionEnd(s.startsAt))}` : "Heure à fixer";
  const tone = s.done ? "bg-olive-pale text-olive-fonce hover:bg-olive-pale/70" : "bg-olive-fonce text-white hover:bg-olive-survol";
  return (
    <li>
      <Link
        href={`/coach/coaches/${s.clientId}`}
        aria-label={`${time}, séance encadrée avec ${s.name} : ${s.sessionName}, ${s.done ? "faite" : "à venir"}`}
        className={`flex min-h-11 flex-col gap-0.5 px-4 py-2.5 transition-colors ${tone}`}
      >
        <span className="flex flex-wrap items-center justify-between gap-x-2">
          <span className="whitespace-nowrap text-[15px] font-semibold tabular-nums">{time}</span>
          {s.done ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-legende font-semibold">
              <Check />
              Faite
            </span>
          ) : (
            <span className="shrink-0 text-legende font-semibold opacity-90">À venir</span>
          )}
        </span>
        <span className="truncate text-[15px] font-semibold">{s.name}</span>
        <span className="truncate text-legende">
          Séance {s.label} · {s.sessionName}
        </span>
        <span className="truncate text-legende opacity-90">Présentiel · à la salle</span>
      </Link>
    </li>
  );
}

/** Séances en autonomie : une ligne compacte par coaché, pour montrer le suivi à distance. */
function SoloSessions({ sessions }: { sessions: AgendaSession[] }) {
  const byClient = new Map<string, AgendaSession[]>();
  for (const s of sessions) byClient.set(s.clientId, [...(byClient.get(s.clientId) ?? []), s]);
  const rows = [...byClient.values()].sort((a, b) => a[0].firstName.localeCompare(b[0].firstName, "fr"));
  const done = sessions.filter((s) => s.done).length;

  return (
    <section aria-labelledby="autonomie-titre" className="flex flex-col gap-2">
      <h3 id="autonomie-titre" className="px-1 text-[15px] font-semibold">
        Séances en autonomie cette semaine : <span className="tabular-nums">{sessions.length}</span>
        {sessions.length > 0 && <span className="font-normal text-texte-2 tabular-nums"> · {done} faite{done > 1 ? "s" : ""}</span>}
      </h3>
      {rows.length === 0 ? (
        <p className="liste-groupee px-4 py-3 text-[15px] text-texte-2">Aucune séance en autonomie cette semaine.</p>
      ) : (
        <ul className="liste-groupee">
          {rows.map((list) => (
            <li key={list[0].clientId}>
              <Link href={`/coach/coaches/${list[0].clientId}`} className="flex min-h-11 flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 transition-colors hover:bg-fond">
                <span className="text-[15px] font-semibold">{list[0].firstName}</span>
                <span className="min-w-0 text-legende text-texte-2">
                  {list.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && " · "}
                      <span className="capitalize">{fmtWeekday(s.day)}</span> {s.sessionName}
                      {s.done && (
                        <span className="ml-1 inline-flex items-center gap-0.5 font-semibold text-olive-fonce">
                          <Check />
                          faite
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="px-1 text-legende text-texte-2">Le coaché s’entraîne seul et envoie son retour : Karim le suit à distance.</p>
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
  const past = slot.endsAt <= nowIso;
  return (
    <li className="flex items-center justify-between gap-2 px-4 py-2 lg:flex-col lg:items-start lg:gap-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold tabular-nums">{time}</span>
        <span className="text-legende text-texte-2">
          {past ? <span>Non réservé</span> : <span className="font-semibold text-olive-fonce">Libre</span>} · {formatLabel[slot.format] ?? slot.format}
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
