"use client";

import { useActionState } from "react";
import { saveGoals, type NutritionState } from "@/lib/nutrition/coach/actions";
import type { Goals } from "@/lib/nutrition/coach/queries";
import { dayTypeLabel, fmtKcal, type DayType } from "@/lib/nutrition/coach/rules";

const FIELDS = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protéines", unit: "g" },
  { key: "carbs_g", label: "Glucides", unit: "g" },
  { key: "fat_g", label: "Lipides", unit: "g" },
] as const;

const initial: NutritionState = { status: "idle" };

/** US25 — Objectifs par type de jour (entraînement / repos), modifiables. Erreurs sous les champs. */
export function GoalsForm({ clientId, goals, firstName }: { clientId: string; goals: Goals; firstName: string }) {
  const [state, action, pending] = useActionState(saveGoals, initial);

  const valueOf = (dt: DayType, key: (typeof FIELDS)[number]["key"]) => state.values?.[`${dt}.${key}`] ?? (goals[dt] ? String(goals[dt][key]) : "");

  return (
    <form key={state.stamp ?? 0} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(dayTypeLabel) as DayType[]).map((dt) => {
          const g = goals[dt];
          const fromMacros = g ? g.protein_g * 4 + g.carbs_g * 4 + g.fat_g * 9 : null;
          return (
            <fieldset key={dt} className="liste-groupee flex flex-col gap-3 p-5">
              <legend className="sr-only">{dayTypeLabel[dt]}</legend>
              <p aria-hidden="true" className="text-sous-titre">{dayTypeLabel[dt]}</p>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map((f) => {
                  const name = `${dt}.${f.key}`;
                  const id = `goal-${dt}-${f.key}`;
                  const err = state.fieldErrors?.[name];
                  return (
                    <div key={f.key} className="flex flex-col gap-1">
                      <label htmlFor={id} className="text-[15px] font-semibold">
                        {f.label} <span className="font-normal text-texte-2">({f.unit})</span>
                      </label>
                      <input
                        id={id}
                        name={name}
                        inputMode="numeric"
                        autoComplete="off"
                        defaultValue={valueOf(dt, f.key)}
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `${id}-err` : undefined}
                        className={`min-h-11 w-full rounded-[12px] border bg-carte px-3 text-[17px] tabular-nums ${err ? "border-peche-fonce" : "border-bordure"}`}
                      />
                      {err && (
                        <p id={`${id}-err`} className="text-legende font-semibold text-peche-fonce">
                          {err}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {fromMacros != null && (
                <p className="text-legende tabular-nums text-texte-2">Les macros enregistrées font {fmtKcal(fromMacros)} kcal (4 / 4 / 9 kcal par gramme).</p>
              )}
            </fieldset>
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
          {state.message}
        </p>
      )}
      <button type="submit" className="btn-principal self-start" disabled={pending}>
        {pending ? "Enregistrement…" : `Enregistrer les objectifs de ${firstName}`}
      </button>
    </form>
  );
}
