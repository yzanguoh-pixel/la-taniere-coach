"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChevron } from "@/components/icons";
import { FORMATS, FORMAT_LABEL, slotFits, type BilanFormat, type DayOption, type FreeSlot } from "@/lib/decouvrir/format";

/** P2-Creneau : format, jour (14 jours), horaire libre. Seuls les créneaux libres et compatibles avec le format sont proposés. */
export function SlotPicker({ slots, days, initialFormat }: { slots: FreeSlot[]; days: DayOption[]; initialFormat: BilanFormat }) {
  const [format, setFormat] = useState<BilanFormat>(initialFormat);
  const fitting = slots.filter((s) => slotFits(s.format, format));
  const daysWithSlots = new Set(fitting.map((s) => s.dayKey));
  const firstDay = days.find((d) => daysWithSlots.has(d.key))?.key ?? null;
  const [day, setDay] = useState<string | null>(firstDay);
  const [slotId, setSlotId] = useState<string | null>(null);

  const activeDay = day && daysWithSlots.has(day) ? day : firstDay;
  const daySlots = fitting.filter((s) => s.dayKey === activeDay);
  const chosen = daySlots.find((s) => s.id === slotId) ?? null;
  const dayLabel = days.find((d) => d.key === activeDay)?.label;

  const pickFormat = (f: BilanFormat) => {
    setFormat(f);
    setSlotId(null);
  };

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 text-[17px] font-semibold">Format du bilan</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-separateur p-1">
          {FORMATS.map((f) => (
            <label key={f} className="relative">
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => pickFormat(f)} className="peer sr-only" />
              <span
                className={`grid min-h-11 cursor-pointer place-items-center rounded-full text-[16px] font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
                  format === f ? "bg-carte text-texte shadow-legere" : "text-texte-2"
                }`}
              >
                {FORMAT_LABEL[f]}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-legende text-texte-2">
          {format === "visio" ? "Karim vous envoie le lien de la visio avant le rendez-vous." : "Le bilan se passe à la salle, tenue de sport conseillée."}
        </p>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[17px] font-semibold">Jour</legend>
        <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
          {days.map((d) => {
            const has = daysWithSlots.has(d.key);
            const selected = d.key === activeDay;
            return (
              <label key={d.key} className="relative shrink-0 snap-start">
                <input
                  type="radio"
                  name="jour"
                  value={d.key}
                  checked={selected}
                  disabled={!has}
                  onChange={() => {
                    setDay(d.key);
                    setSlotId(null);
                  }}
                  aria-label={`${d.label}${has ? "" : ", complet"}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex min-h-16 w-14 flex-col items-center justify-center rounded-2xl border text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
                    selected
                      ? "border-olive-fonce bg-olive-fonce text-white"
                      : has
                        ? "cursor-pointer border-bordure bg-carte text-texte hover:bg-olive-pale"
                        : "border-transparent bg-transparent text-texte-2 line-through opacity-60"
                  }`}
                >
                  <span className="text-legende font-medium">{d.weekday}</span>
                  <span className="text-[19px] font-bold tabular-nums">{d.day}</span>
                  <span className="text-[11px]">{d.month}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[17px] font-semibold">{dayLabel ? `Horaires libres · ${dayLabel}` : "Horaires libres"}</legend>
        {daySlots.length ? (
          <div className="grid grid-cols-3 gap-2">
            {daySlots.map((s) => (
              <label key={s.id} className="relative">
                <input type="radio" name="creneau" value={s.id} checked={slotId === s.id} onChange={() => setSlotId(s.id)} className="peer sr-only" />
                <span
                  className={`grid min-h-11 cursor-pointer place-items-center rounded-xl border text-[17px] font-semibold tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
                    slotId === s.id ? "border-olive-fonce bg-olive-fonce text-white" : "border-bordure bg-carte text-texte hover:bg-olive-pale"
                  }`}
                >
                  {s.time}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p role="status" className="liste-groupee p-4 text-texte-2">
            Aucun créneau {format === "visio" ? "en visio" : "en salle"} sur les deux prochaines semaines.{" "}
            {format === "visio" ? "Essayez en salle." : "Essayez en visio."}
          </p>
        )}
      </fieldset>

      <div className="sticky bottom-4 flex flex-col gap-2">
        {chosen ? (
          <Link href={`/decouvrir/questionnaire?creneau=${chosen.id}&format=${format}`} className="btn-principal w-full shadow-flottante">
            Continuer · {chosen.time}
            <IconChevron width={18} height={18} />
          </Link>
        ) : (
          <button type="button" disabled className="btn-principal w-full">
            Choisissez un horaire
          </button>
        )}
      </div>
    </div>
  );
}
