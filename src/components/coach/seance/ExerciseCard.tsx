"use client";

import { useActionState, useId } from "react";
import { saveExerciseSets, type ExerciseState } from "@/lib/coach/seance/actions";
import { isTimed, rpeLabel, setPrescription } from "@/lib/coache/format";
import type { CoachExercise, CoachSet } from "@/lib/coach/seance/data";

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

const fr = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));

function formatRest(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m} min ${r}` : `${m} min`;
}

/**
 * Un exercice de la séance côté coach : une ligne par série (cible + réalisé à saisir),
 * « Valider » par série et « Valider tout l'exercice ». Une série validée reste modifiable.
 */
export function ExerciseCard({ sessionId, index, exercise }: { sessionId: string; index: number; exercise: CoachExercise }) {
  const [state, action, pending] = useActionState<ExerciseState, FormData>(saveExerciseSets.bind(null, sessionId, exercise.id), {});
  const timed = isTimed(exercise.category);
  const doneCount = exercise.sets.filter((s) => s.done).length;
  const allDone = doneCount === exercise.sets.length;
  const headingId = `ex-${exercise.id}`;
  const savedAll = state.ok && state.saved && state.saved.length > 1;

  return (
    <li aria-labelledby={headingId}>
      <div className="mb-2 px-1">
        <h2 id={headingId} className="flex items-baseline justify-between gap-3 text-sous-titre">
          <span>
            <span className="text-texte-2 tabular-nums">{index + 1}. </span>
            {exercise.name}
          </span>
          <span className="shrink-0 text-legende font-medium text-texte-2 tabular-nums">
            {doneCount}/{exercise.sets.length}
            <span className="sr-only"> séries validées</span>
          </span>
        </h2>
        {exercise.consigne && <p className="mt-1 text-[15px] text-texte-2">{exercise.consigne}</p>}
        {exercise.rest_s ? <p className="mt-0.5 text-legende text-texte-2 tabular-nums">Repos {formatRest(exercise.rest_s)}</p> : null}
      </div>

      <form action={action} noValidate>
        <ul className="liste-groupee">
          {exercise.sets.map((set) => (
            <SetLine key={set.id} set={set} timed={timed} pending={pending} errors={state.errors?.[set.id]} justSaved={Boolean(state.ok && state.saved?.includes(set.id))} />
          ))}
          <li className="flex flex-col gap-2 px-4 py-3">
            <button type="submit" disabled={pending} className={`${allDone ? "btn-secondaire" : "btn-principal"} min-h-12 w-full`}>
              {pending ? "Enregistrement…" : allDone ? "Réenregistrer tout l’exercice" : "Valider tout l’exercice"}
            </button>
            <p aria-live="polite" className="text-center text-legende font-medium">
              {state.form ? (
                <span role="alert" className="text-peche-fonce">
                  {state.form}
                </span>
              ) : state.errors ? (
                <span className="text-peche-fonce">Corrige les champs signalés.</span>
              ) : savedAll ? (
                <span className="text-olive-fonce">Exercice enregistré.</span>
              ) : null}
            </p>
          </li>
        </ul>
      </form>
    </li>
  );
}

function SetLine({ set, timed, pending, errors, justSaved }: { set: CoachSet; timed: boolean; pending: boolean; errors?: { reps?: string; load?: string; rpe?: string }; justSaved: boolean }) {
  const uid = useId();
  const hasLoad = set.target_load_kg != null || set.load_kg != null;
  const target = setPrescription(set, timed);
  const rpe = rpeLabel(set.target_rpe);
  const reps = set.done ? set.reps : set.target_reps;
  const load = set.done ? set.load_kg : set.target_load_kg;
  const rpeVal = set.done ? set.rpe : set.target_rpe;

  const input = (invalid: boolean) =>
    `min-h-14 w-full rounded-xl border bg-carte px-3 text-center text-[22px] font-semibold tabular-nums ${invalid ? "border-peche-fonce" : "border-bordure"}`;

  return (
    <li className={`px-4 py-3 ${set.done ? "bg-olive-pale/40" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-[17px] font-semibold">
          {set.done && (
            <span className="grid size-6 place-items-center rounded-full bg-olive-pale text-olive-fonce">
              <Check />
            </span>
          )}
          Série {set.set_number}
          {set.done && <span className="sr-only"> (validée)</span>}
        </span>
        <span className="text-legende text-texte-2 tabular-nums">
          Cible {target}
          {rpe ? ` · ${rpe}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field id={`${uid}-r`} label={timed ? "Secondes" : "Reps"} error={errors?.reps}>
          <input
            id={`${uid}-r`}
            name={`reps:${set.id}`}
            inputMode="numeric"
            defaultValue={reps ?? ""}
            aria-invalid={errors?.reps ? true : undefined}
            aria-describedby={errors?.reps ? `${uid}-r-err` : undefined}
            className={input(Boolean(errors?.reps))}
          />
        </Field>
        {hasLoad ? (
          <Field id={`${uid}-l`} label="Kg" error={errors?.load}>
            <input
              id={`${uid}-l`}
              name={`load:${set.id}`}
              inputMode="decimal"
              defaultValue={fr(load)}
              aria-invalid={errors?.load ? true : undefined}
              aria-describedby={errors?.load ? `${uid}-l-err` : undefined}
              className={input(Boolean(errors?.load))}
            />
          </Field>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-legende text-texte-2">Kg</span>
            <span className="grid min-h-14 place-items-center rounded-xl bg-separateur text-[15px] text-texte-2">—</span>
          </div>
        )}
        <Field id={`${uid}-p`} label="RPE" error={errors?.rpe}>
          <input
            id={`${uid}-p`}
            name={`rpe:${set.id}`}
            inputMode="decimal"
            defaultValue={fr(rpeVal)}
            placeholder="—"
            aria-invalid={errors?.rpe ? true : undefined}
            aria-describedby={errors?.rpe ? `${uid}-p-err` : undefined}
            className={input(Boolean(errors?.rpe))}
          />
        </Field>
        <button
          type="submit"
          name="only"
          value={set.id}
          disabled={pending}
          aria-label={`${set.done ? "Corriger" : "Valider"} la série ${set.set_number}`}
          className={`${set.done ? "btn-secondaire" : "btn-principal"} col-span-3 min-h-12 sm:col-span-1 sm:min-h-14`}
        >
          {set.done ? "Corriger" : "Valider"}
        </button>
      </div>
      {justSaved && (
        <p role="status" className="mt-1.5 text-legende font-medium text-olive-fonce">
          Série {set.set_number} enregistrée.
        </p>
      )}
    </li>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-legende text-texte-2">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="text-legende font-medium text-peche-fonce">
          {error}
        </p>
      )}
    </div>
  );
}
