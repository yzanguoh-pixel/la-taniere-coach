"use client";

import { useActionState, useState } from "react";
import { finishSessionByCoach, type FinishState } from "@/lib/coach/seance/actions";
import { FEELINGS, FEELING_LABELS, type Feeling } from "@/lib/coache/format";

const chip = (selected: boolean, invalid: boolean) =>
  `grid min-h-12 place-items-center rounded-xl border text-[17px] font-semibold tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
    selected ? "border-olive-fonce bg-olive-fonce text-white" : invalid ? "border-peche-fonce bg-carte text-texte" : "border-bordure bg-carte text-texte hover:bg-olive-pale"
  }`;

const ErrorText = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-2 text-[15px] font-medium text-peche-fonce">
      {children}
    </p>
  ) : null;

type Initial = { rpe: number; feeling: string; pain_zone: string | null; note: string | null } | null;

/** « Terminer la séance » : compte rendu du coach (RPE global, ressenti, zone douloureuse, note). */
export function FinishForm({ sessionId, clientFirstName, remaining, done, initial }: { sessionId: string; clientFirstName: string; remaining: number; done: boolean; initial: Initial }) {
  const [state, action, pending] = useActionState<FinishState, FormData>(finishSessionByCoach.bind(null, sessionId), {});
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null);
  const [feeling, setFeeling] = useState<Feeling | null>((FEELINGS as readonly string[]).includes(initial?.feeling ?? "") ? (initial?.feeling as Feeling) : null);
  const [painZone, setPainZone] = useState(initial?.pain_zone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-6 rounded-[20px] bg-carte p-4 shadow-legere sm:p-5" aria-labelledby="fin-seance">
      <div>
        <h2 id="fin-seance" className="text-sous-titre">
          {done ? "Compte rendu de la séance" : "Terminer la séance"}
        </h2>
        <p className="mt-1 text-[15px] text-texte-2">
          {done ? `Le compte rendu est visible dans le suivi de ${clientFirstName}.` : `Ton compte rendu est enregistré comme retour de la séance ; ${clientFirstName} reçoit un message dans son fil.`}
        </p>
      </div>

      {e.form && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {e.form}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message}
        </p>
      )}

      {!done && remaining > 0 && (
        <label className="flex min-h-12 items-start gap-3 rounded-xl bg-fond px-3 py-3 text-[15px]">
          <input type="checkbox" name="complete_rest" defaultChecked className="mt-0.5 size-5 shrink-0 accent-olive-fonce" />
          <span>
            Valider aussi les <span className="font-semibold tabular-nums">{remaining}</span> série{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} avec les valeurs prévues
          </span>
        </label>
      )}

      <fieldset aria-describedby={e.rpe ? "c-err-rpe" : "c-rpe-ends"} aria-invalid={e.rpe ? true : undefined}>
        <legend className="mb-3 text-[17px] font-semibold">Effort global (RPE)</legend>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <label key={n} className="relative">
              <input type="radio" name="rpe" value={n} checked={rpe === n} onChange={() => setRpe(n)} className="peer sr-only" />
              <span className={chip(rpe === n, Boolean(e.rpe) && rpe === null)}>{n}</span>
            </label>
          ))}
        </div>
        <p id="c-rpe-ends" className="mt-2 flex justify-between text-legende text-texte-2">
          <span>1 · très facile</span>
          <span>10 · maximal</span>
        </p>
        <ErrorText id="c-err-rpe">{e.rpe}</ErrorText>
      </fieldset>

      <fieldset aria-describedby={e.feeling ? "c-err-feeling" : undefined} aria-invalid={e.feeling ? true : undefined}>
        <legend className="mb-3 text-[17px] font-semibold">Ressenti</legend>
        <div className="grid grid-cols-2 gap-2">
          {FEELINGS.map((f) => (
            <label key={f} className="relative">
              <input type="radio" name="feeling" value={f} checked={feeling === f} onChange={() => setFeeling(f)} className="peer sr-only" />
              <span className={chip(feeling === f, Boolean(e.feeling) && feeling === null)}>{FEELING_LABELS[f]}</span>
            </label>
          ))}
        </div>
        <ErrorText id="c-err-feeling">{e.feeling}</ErrorText>
      </fieldset>

      {feeling === "douleur" && (
        <div>
          <label htmlFor="c-pain" className="mb-2 block text-[17px] font-semibold">
            Zone douloureuse
          </label>
          <input
            id="c-pain"
            name="pain_zone"
            value={painZone}
            onChange={(ev) => setPainZone(ev.target.value)}
            placeholder="Ex. genou droit"
            maxLength={80}
            aria-invalid={e.pain_zone ? true : undefined}
            aria-describedby={e.pain_zone ? "c-err-pain" : undefined}
            className={`min-h-12 w-full rounded-xl border bg-carte px-3 text-[17px] ${e.pain_zone ? "border-peche-fonce" : "border-bordure"}`}
          />
          <ErrorText id="c-err-pain">{e.pain_zone}</ErrorText>
        </div>
      )}

      <div>
        <label htmlFor="c-note" className="mb-2 block text-[17px] font-semibold">
          Note <span className="font-normal text-texte-2">(facultatif)</span>
        </label>
        <textarea
          id="c-note"
          name="note"
          rows={3}
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          maxLength={500}
          placeholder="Ex. Bonne technique, on garde la charge la semaine prochaine"
          aria-invalid={e.note ? true : undefined}
          aria-describedby={e.note ? "c-err-note" : undefined}
          className={`w-full rounded-xl border bg-carte px-3 py-2.5 text-[17px] ${e.note ? "border-peche-fonce" : "border-bordure"}`}
        />
        <ErrorText id="c-err-note">{e.note}</ErrorText>
      </div>

      <button type="submit" disabled={pending} className="btn-principal min-h-12 w-full">
        {pending ? "Enregistrement…" : done ? "Mettre à jour le compte rendu" : "Terminer la séance"}
      </button>
    </form>
  );
}
