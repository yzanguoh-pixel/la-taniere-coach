"use client";

import { useActionState } from "react";
import { saveTests, type BilanState } from "@/lib/bilans/actions";
import type { PhysicalTests } from "@/lib/bilans/synthese";

const initial: BilanState = { status: "idle" };

type Field = { key: keyof Omit<PhysicalTests, "saved_at">; label: string; unit: string; hint: string; step: string; min: number; max: number };

const FIELDS: Field[] = [
  { key: "poids_kg", label: "Poids", unit: "kg", hint: "Entre 30 et 250 kg", step: "0.1", min: 30, max: 250 },
  { key: "pompes_max", label: "Pompes max", unit: "répétitions", hint: "D’affilée, technique propre", step: "1", min: 0, max: 150 },
  { key: "gainage_s", label: "Gainage", unit: "s", hint: "Planche sur les avant-bras", step: "1", min: 0, max: 600 },
  { key: "squats_1min", label: "Squats en 1 min", unit: "répétitions", hint: "Au poids du corps", step: "1", min: 0, max: 120 },
  { key: "souplesse_cm", label: "Souplesse", unit: "cm", hint: "Distance doigts-sol, négatif si les doigts ne touchent pas", step: "1", min: -40, max: 40 },
];

/** US10 — Saisie des tests physiques pendant le bilan. */
export function TestsForm({ bookingId, tests, disabled }: { bookingId: string; tests: PhysicalTests | null; disabled?: boolean }) {
  const [state, action, pending] = useActionState(saveTests, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="liste-groupee">
        {FIELDS.map((f) => {
          const id = `test-${f.key}`;
          const err = errors[f.key];
          const value = tests?.[f.key];
          return (
            <div key={f.key} className="flex flex-col gap-1 px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={id} className="flex min-w-0 flex-col">
                  <span className="text-[17px] font-semibold">{f.label}</span>
                  <span id={`${id}-hint`} className="text-legende text-texte-2">
                    {f.hint}
                  </span>
                </label>
                <span className="flex shrink-0 items-center gap-2">
                  <input
                    id={id}
                    name={f.key}
                    type="number"
                    inputMode={f.step === "1" && f.min >= 0 ? "numeric" : "decimal"}
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    defaultValue={value ?? ""}
                    disabled={disabled}
                    aria-invalid={err ? true : undefined}
                    aria-describedby={`${id}-hint${err ? ` ${id}-err` : ""}`}
                    className={`min-h-11 w-24 rounded-[12px] border bg-carte px-3 text-right text-[17px] tabular-nums ${
                      err ? "border-peche-fonce" : "border-bordure"
                    } disabled:opacity-60`}
                  />
                  <span className="w-[5.5rem] text-legende text-texte-2">{f.unit}</span>
                </span>
              </div>
              {err && (
                <p id={`${id}-err`} className="text-[15px] font-semibold text-peche-fonce">
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
          {state.message}
        </p>
      )}
      {state.status === "ok" && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message} Les charges du programme pourront être calées dessus.
        </p>
      )}
      {!disabled && (
        <div>
          <button type="submit" className="btn-principal" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer les tests"}
          </button>
        </div>
      )}
    </form>
  );
}
