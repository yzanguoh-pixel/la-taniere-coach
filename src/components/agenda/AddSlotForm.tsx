"use client";

import { useActionState } from "react";
import { addSlot, type SlotState } from "@/lib/agenda/actions";

const initial: SlotState = { status: "idle" };

const inputClass = "min-h-11 w-full rounded-[12px] border bg-carte px-3 text-[17px] tabular-nums text-texte";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[15px] font-semibold text-peche-fonce">
      {message}
    </p>
  );
}

/** Ajout d'un créneau de disponibilité (heure de Paris). */
export function AddSlotForm({ defaultDate, minDate }: { defaultDate: string; minDate: string }) {
  const [state, action, pending] = useActionState(addSlot, initial);
  const e = state.fieldErrors ?? {};
  const v = state.status === "error" ? state.values : undefined;
  // Après un ajout réussi, le formulaire repart des valeurs par défaut (clé changée).
  const formKey = state.status === "ok" ? state.message : "form";

  return (
    <section aria-labelledby="ajout-titre" className="liste-groupee flex flex-col gap-4 p-5">
      <h2 id="ajout-titre" className="text-sous-titre">
        Ajouter un créneau
      </h2>
      <form key={formKey} action={action} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slot-date" className="text-[15px] font-semibold">
            Date
          </label>
          <input
            id="slot-date"
            name="date"
            type="date"
            min={minDate}
            defaultValue={v?.date ?? defaultDate}
            aria-invalid={!!e.date}
            aria-describedby={e.date ? "slot-date-err" : undefined}
            className={`${inputClass} ${e.date ? "border-peche-fonce" : "border-bordure"}`}
          />
          <FieldError id="slot-date-err" message={e.date} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slot-start" className="text-[15px] font-semibold">
              Début
            </label>
            <input
              id="slot-start"
              name="start"
              type="time"
              step={300}
              defaultValue={v?.start ?? "18:00"}
              aria-invalid={!!e.start}
              aria-describedby={e.start ? "slot-start-err" : undefined}
              className={`${inputClass} ${e.start ? "border-peche-fonce" : "border-bordure"}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slot-end" className="text-[15px] font-semibold">
              Fin
            </label>
            <input
              id="slot-end"
              name="end"
              type="time"
              step={300}
              defaultValue={v?.end ?? "18:45"}
              aria-invalid={!!e.end}
              aria-describedby={e.end ? "slot-end-err" : undefined}
              className={`${inputClass} ${e.end ? "border-peche-fonce" : "border-bordure"}`}
            />
          </div>
        </div>
        <FieldError id="slot-start-err" message={e.start} />
        <FieldError id="slot-end-err" message={e.end} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slot-format" className="text-[15px] font-semibold">
            Format
          </label>
          <select
            id="slot-format"
            name="format"
            defaultValue={v?.format ?? "les_deux"}
            aria-invalid={!!e.format}
            aria-describedby={e.format ? "slot-format-err" : undefined}
            className={`${inputClass} ${e.format ? "border-peche-fonce" : "border-bordure"}`}
          >
            <option value="visio">Visio</option>
            <option value="salle">En salle</option>
            <option value="les_deux">Visio ou salle</option>
          </select>
          <FieldError id="slot-format-err" message={e.format} />
        </div>
        {state.status === "error" && state.message && (
          <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn-principal self-start" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter le créneau"}
        </button>
      </form>
      {state.status === "ok" && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message}
        </p>
      )}
    </section>
  );
}
