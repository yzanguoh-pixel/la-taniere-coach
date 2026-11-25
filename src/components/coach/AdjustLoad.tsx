"use client";

import { useActionState, useState } from "react";
import { applyAdjustment, markFeedbackHandled, type AdjustState } from "@/lib/coach/actions";
import type { AdjustableExercise } from "@/lib/coach/queries";
import { fmtDay, fmtKg } from "@/lib/coach/format";

const STEPS = [
  { value: -2.5, label: "−2,5 kg", verb: "Baisser" },
  { value: 0, label: "Garder", verb: "Garder" },
  { value: 2.5, label: "+2,5 kg", verb: "Monter" },
] as const;

const initial: AdjustState = { status: "idle" };

/** Ajustement de charge par exercice, par pas de 2,5 kg, avec aperçu puis « Appliquer et prévenir <prénom> ». */
export function AdjustLoad({
  clientId,
  feedbackId,
  firstName,
  exercises,
  suggestion,
}: {
  clientId: string;
  feedbackId: string | null;
  firstName: string;
  exercises: AdjustableExercise[];
  suggestion?: string | null;
}) {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [state, apply, pending] = useActionState(async (prev: AdjustState, fd: FormData) => {
    const res = await applyAdjustment(prev, fd);
    // Les charges relues après enregistrement deviennent la nouvelle base : on repart de « Garder ».
    if (res.status === "ok") setDeltas({});
    return res;
  }, initial);
  const [keepState, keep, keepPending] = useActionState(markFeedbackHandled, initial);

  const changes = exercises.filter((x) => (deltas[x.exerciseId] ?? 0) !== 0);
  const adjustError = state.fieldErrors?.adjust;

  if (!exercises.length) {
    return <p className="text-texte-2">Aucune séance à venir avec une charge à régler dans le programme actif.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {suggestion && <p className="text-[15px] text-texte-2">{suggestion}</p>}
      <form action={apply} className="flex flex-col gap-4" aria-describedby={adjustError ? "adjust-error" : undefined}>
        <input type="hidden" name="clientId" value={clientId} />
        {feedbackId && <input type="hidden" name="feedbackId" value={feedbackId} />}
        <ul className="liste-groupee">
          {exercises.map((x) => {
            const d = deltas[x.exerciseId] ?? 0;
            return (
              <li key={x.exerciseId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 flex-col">
                  <strong className="text-[17px] font-semibold">{x.name}</strong>
                  <span className="text-legende tabular-nums text-texte-2">
                    {fmtKg(x.currentKg)} kg · prochaine le {fmtDay(x.nextDate)} · {x.sessions} séance{x.sessions > 1 ? "s" : ""} à venir
                  </span>
                </span>
                <fieldset className="shrink-0">
                  <legend className="sr-only">Ajuster {x.name}</legend>
                  <input type="hidden" name={`delta:${x.exerciseId}`} value={d} />
                  <div className="inline-flex rounded-full bg-separateur p-1" role="group">
                    {STEPS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={d === s.value}
                        aria-label={`${s.verb} ${x.name}${s.value !== 0 ? " de 2,5 kg" : ""}`}
                        onClick={() => setDeltas((prev) => ({ ...prev, [x.exerciseId]: s.value }))}
                        className={`min-h-11 min-w-[4.75rem] rounded-full px-3 text-[15px] font-semibold tabular-nums transition-colors ${
                          d === s.value ? "bg-carte text-texte shadow-legere" : "text-texte-2 hover:text-texte"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="rounded-[16px] bg-olive-pale px-5 py-4">
          <p className="text-legende font-semibold text-olive-fonce">Aperçu</p>
          {changes.length ? (
            <ul className="mt-1 flex flex-col gap-0.5">
              {changes.map((x) => (
                <li key={x.exerciseId} className="text-[17px] font-semibold tabular-nums text-olive-fonce">
                  {x.name} {fmtKg(x.currentKg)} → {fmtKg(Math.max(0, x.currentKg + (deltas[x.exerciseId] ?? 0)))} kg
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[15px] text-olive-fonce">Charges inchangées. Choisis −2,5 kg ou +2,5 kg pour préparer un ajustement.</p>
          )}
          <p className="mt-1 text-legende text-olive-fonce">S’applique aux séances à venir du programme de {firstName}, qui reçoit un message.</p>
        </div>

        {adjustError && (
          <p id="adjust-error" role="alert" className="text-[15px] font-semibold text-peche-fonce">
            {adjustError}
          </p>
        )}
        {state.status === "error" && state.message && (
          <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
            {state.message}
          </p>
        )}
        {state.status === "ok" && (
          <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
            Programme mis à jour : {state.message}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className="btn-principal" disabled={pending || changes.length === 0}>
            {pending ? "Enregistrement…" : `Appliquer et prévenir ${firstName}`}
          </button>
        </div>
      </form>

      {feedbackId && (
        <form action={keep} className="flex flex-col gap-2">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="feedbackId" value={feedbackId} />
          <button type="submit" className="btn-secondaire self-start" disabled={keepPending}>
            {keepPending ? "Enregistrement…" : "Garder les charges et marquer comme traité"}
          </button>
          {keepState.status === "error" && keepState.message && (
            <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
              {keepState.message}
            </p>
          )}
        </form>
      )}
      {keepState.status === "ok" && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {keepState.message}
        </p>
      )}
    </div>
  );
}
