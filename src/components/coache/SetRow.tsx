"use client";

import { useActionState, useId } from "react";
import { validateSet, type SetState } from "@/lib/coache/actions";
import { formatKg, rpeLabel, setPrescription } from "@/lib/coache/format";
import type { SetRow as SetData } from "@/lib/coache/data";

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Une série : prescription, puis saisie du réalisé (répétitions, charge) et validation. */
export function SetRow({ set, sessionId, timed, editable }: { set: SetData; sessionId: string; timed: boolean; editable: boolean }) {
  const [state, action, pending] = useActionState<SetState, FormData>(validateSet.bind(null, set.id, sessionId), {});
  const uid = useId();
  const hasLoad = set.target_load_kg != null;
  const target = setPrescription(set, timed);
  const rpe = rpeLabel(set.target_rpe);

  if (set.done) {
    const done = [set.reps != null ? (timed ? `${set.reps} s` : `${set.reps} reps`) : "", set.load_kg != null ? formatKg(set.load_kg) : ""].filter(Boolean).join(" × ");
    return (
      <li className="flex min-h-14 items-center gap-3 px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-olive-pale text-olive-fonce">
          <Check />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold">Série {set.set_number}</span>
          <span className="block text-legende text-texte-2 tabular-nums">Prévu {target}</span>
        </span>
        <span className="text-[15px] font-semibold tabular-nums">
          {done || "Faite"}
          <span className="sr-only"> : série validée</span>
        </span>
      </li>
    );
  }

  const repsErr = state.errors?.reps;
  const loadErr = state.errors?.load;
  return (
    <li className="px-4 py-3">
      <form action={action} className="flex flex-col gap-2" noValidate>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-semibold">Série {set.set_number}</span>
          <span className="text-legende text-texte-2 tabular-nums">
            Prévu {target}
            {rpe ? ` · ${rpe}` : ""}
          </span>
        </div>
        {editable && (
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${uid}-reps`} className="text-legende text-texte-2">
                {timed ? "Secondes" : "Répétitions"}
              </label>
              <input
                id={`${uid}-reps`}
                name="reps"
                inputMode="numeric"
                defaultValue={set.target_reps ?? ""}
                aria-invalid={repsErr ? true : undefined}
                aria-describedby={repsErr ? `${uid}-reps-err` : undefined}
                className={`min-h-11 w-full rounded-xl border bg-carte px-3 text-[17px] tabular-nums ${repsErr ? "border-peche-fonce" : "border-bordure"}`}
              />
              {repsErr && (
                <p id={`${uid}-reps-err`} className="text-legende font-medium text-peche-fonce">
                  {repsErr}
                </p>
              )}
            </div>
            {hasLoad && (
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor={`${uid}-load`} className="text-legende text-texte-2">
                  Charge (kg)
                </label>
                <input
                  id={`${uid}-load`}
                  name="load"
                  inputMode="decimal"
                  defaultValue={String(set.target_load_kg).replace(".", ",")}
                  aria-invalid={loadErr ? true : undefined}
                  aria-describedby={loadErr ? `${uid}-load-err` : undefined}
                  className={`min-h-11 w-full rounded-xl border bg-carte px-3 text-[17px] tabular-nums ${loadErr ? "border-peche-fonce" : "border-bordure"}`}
                />
                {loadErr && (
                  <p id={`${uid}-load-err`} className="text-legende font-medium text-peche-fonce">
                    {loadErr}
                  </p>
                )}
              </div>
            )}
            <button type="submit" disabled={pending} className="btn-principal mt-[22px] shrink-0 px-4 text-[15px]" aria-label={`Valider la série ${set.set_number}`}>
              {pending ? "…" : "Valider"}
            </button>
          </div>
        )}
        {state.errors?.form && (
          <p role="alert" className="text-legende font-medium text-peche-fonce">
            {state.errors.form}
          </p>
        )}
      </form>
    </li>
  );
}
