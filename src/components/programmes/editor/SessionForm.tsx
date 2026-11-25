"use client";

import { useActionState, useId, useState } from "react";
import { deleteSessionAction, saveSessionAction } from "@/lib/programmes/editor";
import { DialogHeader, FieldError, inputClass } from "./Dialog";
import { ScopeFields } from "./ScopeFields";
import { initialEditorState, type EditorMode, type EditorState } from "./types";

type Common = {
  mode: EditorMode;
  ownerId: string;
  firstName: string;
  canUpdateTemplate: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

/** Ajout (sessionId null) ou renommage d'une séance. */
export function SessionForm({ sessionId, currentName, week, ...p }: Common & { sessionId: string | null; currentName: string; week: number | null }) {
  const uid = useId();
  const [name, setName] = useState(currentName);
  const [scope, setScope] = useState<"copie" | "modele">("copie");
  const [following, setFollowing] = useState(true);
  const [state, action, pending] = useActionState<EditorState, FormData>(async (prev, fd) => {
    const r = await saveSessionAction(prev, fd);
    if (r.status === "ok") p.onSaved(r.message ?? "Séance enregistrée");
    return r;
  }, initialEditorState);
  const err = state.fieldErrors?.name;
  return (
    <form action={action} noValidate className="flex flex-col gap-4 p-6">
      <DialogHeader id={`${uid}-t`} title={sessionId ? "Renommer la séance" : "Ajouter une séance"} onClose={p.onClose} />
      <input type="hidden" name="mode" value={p.mode} />
      <input type="hidden" name="ownerId" value={p.ownerId} />
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <input type="hidden" name="week" value={week ?? ""} />
      {state.status === "error" && state.message && !err && (
        <p role="alert" className="rounded-2xl bg-peche px-4 py-3 text-peche-fonce">
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor={`${uid}-n`} className="mb-1.5 block font-semibold">
          Nom de la séance
        </label>
        <input
          id={`${uid}-n`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          placeholder="Ex. Haut du corps"
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${uid}-ne` : undefined}
          className={inputClass}
        />
        <FieldError id={`${uid}-ne`} text={err} />
        {!sessionId && <p className="mt-1.5 text-legende text-texte-2">La séance reçoit la lettre suivante (A, B, C…). Ajoutez ensuite ses exercices depuis la bibliothèque.</p>}
      </div>
      {p.mode === "copie" && (
        <ScopeFields
          firstName={p.firstName}
          canUpdateTemplate={p.canUpdateTemplate}
          scope={scope}
          onScope={setScope}
          following={following}
          onFollowing={setFollowing}
          followingLabel={sessionId ? "Renommer aussi dans les semaines suivantes" : "Ajouter aussi aux semaines suivantes"}
        />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondaire" onClick={p.onClose}>
          Annuler
        </button>
        <button type="submit" className="btn-principal" disabled={pending}>
          {pending ? "Enregistrement…" : sessionId ? "Renommer" : "Ajouter la séance"}
        </button>
      </div>
    </form>
  );
}

/** Confirmation avant de supprimer une séance et ses exercices. */
export function DeleteSessionForm({ sessionId, title, ...p }: Common & { sessionId: string; title: string }) {
  const uid = useId();
  const [scope, setScope] = useState<"copie" | "modele">("copie");
  const [following, setFollowing] = useState(false);
  const [state, action, pending] = useActionState<EditorState, FormData>(async (prev, fd) => {
    const r = await deleteSessionAction(prev, fd);
    if (r.status === "ok") p.onSaved(r.message ?? "Séance supprimée");
    return r;
  }, initialEditorState);
  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <DialogHeader id={`${uid}-t`} title="Supprimer la séance ?" onClose={p.onClose} />
      <input type="hidden" name="mode" value={p.mode} />
      <input type="hidden" name="ownerId" value={p.ownerId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <p className="text-texte-2">
        {p.mode === "copie"
          ? `« ${title} » et ses exercices seront supprimés du programme de ${p.firstName}.`
          : `« ${title} » et ses exercices seront supprimés du modèle. Les copies déjà envoyées ne changent pas.`}
      </p>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-2xl bg-peche px-4 py-3 text-peche-fonce">
          {state.message}
        </p>
      )}
      {p.mode === "copie" && (
        <ScopeFields firstName={p.firstName} canUpdateTemplate={p.canUpdateTemplate} scope={scope} onScope={setScope} following={following} onFollowing={setFollowing} followingLabel="Supprimer aussi dans les semaines suivantes" />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondaire" onClick={p.onClose}>
          Annuler
        </button>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-peche px-5 font-semibold text-peche-fonce disabled:opacity-50" disabled={pending}>
          {pending ? "Suppression…" : "Supprimer la séance"}
        </button>
      </div>
    </form>
  );
}
