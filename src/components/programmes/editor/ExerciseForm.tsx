"use client";

import { useActionState, useId, useState } from "react";
import { deleteExerciseAction, saveExerciseAction } from "@/lib/programmes/editor";
import { DialogHeader, FieldError, inputClass } from "./Dialog";
import { ScopeFields } from "./ScopeFields";
import { fmtNum, initialEditorState, type EditorMode, type EditorState } from "./types";

export type ExerciseDraft = {
  rowId: string | null;
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  loadKg: number | null;
  rpe: number | null;
  restS: number | null;
  consigne: string | null;
};

type Common = {
  mode: EditorMode;
  ownerId: string;
  sessionId: string;
  sessionTitle: string;
  firstName: string;
  canUpdateTemplate: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const num = (n: number | null) => (n == null ? "" : fmtNum(n));

/** Ajout ou modification d'un exercice (séries, reps, charge, RPE visé, repos, consigne). Erreurs sous les champs. */
export function ExerciseForm({ draft, ...p }: Common & { draft: ExerciseDraft }) {
  const uid = useId();
  const titleId = `${uid}-t`;
  const [v, setV] = useState({
    sets: String(draft.sets),
    reps: draft.reps,
    load: num(draft.loadKg),
    rpe: num(draft.rpe),
    rest: draft.restS == null ? "" : String(draft.restS),
    consigne: draft.consigne ?? "",
  });
  const [scope, setScope] = useState<"copie" | "modele">("copie");
  const [following, setFollowing] = useState(true);
  const [state, action, pending] = useActionState<EditorState, FormData>(async (prev, fd) => {
    const r = await saveExerciseAction(prev, fd);
    if (r.status === "ok") p.onSaved(r.message ?? "Exercice enregistré");
    return r;
  }, initialEditorState);
  const fe = state.fieldErrors ?? {};
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const field = (k: keyof typeof v, label: string, opts: { hint?: string; optional?: boolean; inputMode?: "numeric" | "decimal" | "text"; placeholder?: string; suffix?: string }) => {
    const id = `${uid}-${k}`;
    const err = fe[k];
    const hintId = `${id}-h`;
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block font-semibold">
          {label} {opts.optional && <span className="font-normal text-texte-2">facultatif</span>}
        </label>
        <div className="relative">
          <input
            id={id}
            name={k}
            value={v[k]}
            onChange={set(k)}
            inputMode={opts.inputMode ?? "text"}
            autoComplete="off"
            placeholder={opts.placeholder}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${id}-e` : opts.hint ? hintId : undefined}
            className={`${inputClass} ${opts.suffix ? "pr-12" : ""}`}
          />
          {opts.suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-texte-2">{opts.suffix}</span>}
        </div>
        {err ? <FieldError id={`${id}-e`} text={err} /> : opts.hint ? <p id={hintId} className="mt-1.5 text-legende text-texte-2">{opts.hint}</p> : null}
      </div>
    );
  };

  return (
    <form action={action} noValidate className="flex max-h-[88dvh] flex-col gap-4 overflow-y-auto p-6">
      <DialogHeader id={titleId} title={draft.rowId ? `Modifier ${draft.name}` : `Ajouter ${draft.name}`} onClose={p.onClose} />
      <p className="-mt-2 text-texte-2">{p.sessionTitle}</p>
      <input type="hidden" name="mode" value={p.mode} />
      <input type="hidden" name="ownerId" value={p.ownerId} />
      <input type="hidden" name="sessionId" value={p.sessionId} />
      <input type="hidden" name="rowId" value={draft.rowId ?? ""} />
      <input type="hidden" name="exerciseId" value={draft.exerciseId} />

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-2xl bg-peche px-4 py-3 text-peche-fonce">
          {state.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {field("sets", "Séries", { inputMode: "numeric", placeholder: "4" })}
        {field("reps", "Répétitions", {
          inputMode: p.mode === "copie" ? "numeric" : "text",
          placeholder: p.mode === "copie" ? "8" : "10, 45 s",
          hint: p.mode === "copie" ? "Ou secondes pour un gainage." : "Ex. 10, 10 par jambe, 45 s",
        })}
        {field("load", "Charge", { optional: true, inputMode: "decimal", placeholder: "Poids du corps", suffix: "kg", hint: "Par pas de 0,5 kg. Vide = poids du corps." })}
        {field("rpe", "RPE visé", { optional: true, inputMode: "decimal", placeholder: "7", hint: "De 1 à 10." })}
        {field("rest", "Repos", { optional: true, inputMode: "numeric", placeholder: "90", suffix: "s" })}
      </div>
      <div>
        <label htmlFor={`${uid}-consigne`} className="mb-1.5 block font-semibold">
          Consigne <span className="font-normal text-texte-2">facultatif</span>
        </label>
        <textarea
          id={`${uid}-consigne`}
          name="consigne"
          rows={2}
          value={v.consigne}
          onChange={set("consigne")}
          placeholder="Ex. Descendre sous la parallèle si le genou le permet"
          aria-invalid={fe.consigne ? true : undefined}
          aria-describedby={fe.consigne ? `${uid}-consigne-e` : undefined}
          className={`${inputClass} py-2.5`}
        />
        <FieldError id={`${uid}-consigne-e`} text={fe.consigne} />
      </div>

      {p.mode === "copie" && (
        <ScopeFields
          firstName={p.firstName}
          canUpdateTemplate={p.canUpdateTemplate}
          scope={scope}
          onScope={setScope}
          following={following}
          onFollowing={setFollowing}
          error={fe.scope}
        />
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <button type="button" className="btn-secondaire" onClick={p.onClose}>
          Annuler
        </button>
        <button type="submit" className="btn-principal" disabled={pending}>
          {pending ? "Enregistrement…" : draft.rowId ? "Enregistrer l’exercice" : "Ajouter l’exercice"}
        </button>
      </div>
    </form>
  );
}

/** Confirmation avant de retirer un exercice. */
export function DeleteExerciseForm({ rowId, name, ...p }: Common & { rowId: string; name: string }) {
  const uid = useId();
  const [scope, setScope] = useState<"copie" | "modele">("copie");
  const [following, setFollowing] = useState(true);
  const [state, action, pending] = useActionState<EditorState, FormData>(async (prev, fd) => {
    const r = await deleteExerciseAction(prev, fd);
    if (r.status === "ok") p.onSaved(r.message ?? "Exercice retiré");
    return r;
  }, initialEditorState);
  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <DialogHeader id={`${uid}-t`} title={`Retirer ${name} ?`} onClose={p.onClose} />
      <input type="hidden" name="mode" value={p.mode} />
      <input type="hidden" name="ownerId" value={p.ownerId} />
      <input type="hidden" name="sessionId" value={p.sessionId} />
      <input type="hidden" name="rowId" value={rowId} />
      <p className="text-texte-2">
        {p.mode === "copie"
          ? `L’exercice sera retiré de « ${p.sessionTitle} » pour ${p.firstName}. Les séances déjà faites ne changent pas.`
          : `L’exercice sera retiré de « ${p.sessionTitle} » dans le modèle. Les copies déjà envoyées ne changent pas.`}
      </p>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-2xl bg-peche px-4 py-3 text-peche-fonce">
          {state.message}
        </p>
      )}
      {p.mode === "copie" && (
        <ScopeFields firstName={p.firstName} canUpdateTemplate={p.canUpdateTemplate} scope={scope} onScope={setScope} following={following} onFollowing={setFollowing} followingLabel="Retirer aussi des semaines suivantes" />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondaire" onClick={p.onClose}>
          Annuler
        </button>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-peche px-5 font-semibold text-peche-fonce disabled:opacity-50" disabled={pending}>
          {pending ? "Suppression…" : "Retirer l’exercice"}
        </button>
      </div>
    </form>
  );
}
