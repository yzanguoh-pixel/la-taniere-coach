"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitFeedback, type FeedbackState } from "@/lib/coache/actions";
import { FEELINGS, FEELING_LABELS, type Feeling } from "@/lib/coache/format";

const chip = (selected: boolean, invalid: boolean) =>
  `grid min-h-11 place-items-center rounded-xl border text-[17px] font-semibold tabular-nums transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
    selected ? "border-olive-fonce bg-olive-fonce text-white" : invalid ? "border-peche-fonce bg-carte text-texte" : "border-bordure bg-carte text-texte hover:bg-olive-pale"
  }`;

const ErrorText = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-2 text-[15px] font-medium text-peche-fonce">
      {children}
    </p>
  ) : null;

/** Retour de fin de séance : RPE, ressenti, zone de douleur si « Douleur », mot pour le coach. */
export function FeedbackForm({ sessionId, coachName, sessionHref }: { sessionId: string; coachName: string; sessionHref: string }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback.bind(null, sessionId), {});
  const [rpe, setRpe] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [painZone, setPainZone] = useState("");
  const [note, setNote] = useState("");
  const e = state.errors ?? {};
  const fieldErrors = [e.rpe, e.feeling, e.pain_zone, e.note].filter(Boolean).length;

  return (
    <form action={action} noValidate className="flex flex-col gap-7">
      {(fieldErrors > 0 || e.form) && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {e.form ?? (fieldErrors === 1 ? "Un champ est à compléter." : `${fieldErrors} champs sont à compléter.`)}
        </p>
      )}

      <fieldset aria-describedby={e.rpe ? "err-rpe" : "rpe-ends"} aria-invalid={e.rpe ? true : undefined}>
        <legend className="mb-3 text-[17px] font-semibold">Effort ressenti (RPE)</legend>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <label key={n} className="relative">
              <input type="radio" name="rpe" value={n} checked={rpe === n} onChange={() => setRpe(n)} className="peer sr-only" />
              <span className={chip(rpe === n, Boolean(e.rpe) && rpe === null)}>{n}</span>
            </label>
          ))}
        </div>
        <p id="rpe-ends" className="mt-2 flex justify-between text-legende text-texte-2">
          <span>1 · très facile</span>
          <span>10 · maximal</span>
        </p>
        <ErrorText id="err-rpe">{e.rpe}</ErrorText>
      </fieldset>

      <fieldset aria-describedby={e.feeling ? "err-feeling" : undefined} aria-invalid={e.feeling ? true : undefined}>
        <legend className="mb-3 text-[17px] font-semibold">Ressenti</legend>
        <div className="grid grid-cols-2 gap-2">
          {FEELINGS.map((f) => (
            <label key={f} className="relative">
              <input type="radio" name="feeling" value={f} checked={feeling === f} onChange={() => setFeeling(f)} className="peer sr-only" />
              <span className={chip(feeling === f, Boolean(e.feeling) && feeling === null)}>{FEELING_LABELS[f]}</span>
            </label>
          ))}
        </div>
        <ErrorText id="err-feeling">{e.feeling}</ErrorText>
      </fieldset>

      {feeling === "douleur" && (
        <div>
          <label htmlFor="pain_zone" className="mb-2 block text-[17px] font-semibold">
            Où as-tu mal ?
          </label>
          <input
            id="pain_zone"
            name="pain_zone"
            value={painZone}
            onChange={(ev) => setPainZone(ev.target.value)}
            placeholder="Ex. genou droit"
            maxLength={80}
            required
            aria-invalid={e.pain_zone ? true : undefined}
            aria-describedby={e.pain_zone ? "err-pain" : undefined}
            className={`min-h-11 w-full rounded-xl border bg-carte px-3 text-[17px] ${e.pain_zone ? "border-peche-fonce" : "border-bordure"}`}
          />
          <ErrorText id="err-pain">{e.pain_zone}</ErrorText>
        </div>
      )}

      <div>
        <label htmlFor="note" className="mb-2 block text-[17px] font-semibold">
          Un mot pour {coachName} <span className="font-normal text-texte-2">(facultatif)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          maxLength={500}
          placeholder="Ex. Squat facile, j’aurais pu mettre +5 kg"
          aria-invalid={e.note ? true : undefined}
          aria-describedby={e.note ? "err-note" : undefined}
          className={`w-full rounded-xl border bg-carte px-3 py-2.5 text-[17px] ${e.note ? "border-peche-fonce" : "border-bordure"}`}
        />
        <ErrorText id="err-note">{e.note}</ErrorText>
      </div>

      <div className="flex gap-3">
        <Link href={sessionHref} className="btn-secondaire flex-1">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="btn-principal flex-[2]">
          {pending ? "Envoi…" : "Envoyer mon retour"}
        </button>
      </div>
    </form>
  );
}
