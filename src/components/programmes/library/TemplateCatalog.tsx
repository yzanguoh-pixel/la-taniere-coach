"use client";

import { useActionState, useId, useMemo, useRef, useState } from "react";
import { personnaliserModele, type PersonnaliserState } from "@/app/coach/modeles/actions";

/** Données sérialisées par la page serveur (voir getTemplates / getClientChoices). */
export type CatalogTemplate = {
  id: string;
  name: string;
  goal: string;
  level: string | null;
  weeks: number;
  sessionsPerWeek: number;
  description: string | null;
  sessions: { label: string; name: string }[];
};
export type CatalogClient = { id: string; fullName: string; initials: string; goal: string | null; program: string | null };

const LEVELS: { key: string; label: string }[] = [
  { key: "debutant", label: "Débutant" },
  { key: "intermediaire", label: "Intermédiaire" },
  { key: "confirme", label: "Confirmé" },
];
const levelLabel = (l: string | null) => LEVELS.find((x) => x.key === l)?.label ?? "Tous niveaux";

/** US13 — Modèles filtrables (objectif, niveau) et « Personnaliser pour… » qui crée la copie du coaché. */
export function TemplateCatalog({ templates, clients }: { templates: CatalogTemplate[]; clients: CatalogClient[] }) {
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [target, setTarget] = useState<CatalogTemplate | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const goals = useMemo(() => [...new Set(templates.map((t) => t.goal))].sort((a, b) => a.localeCompare(b, "fr")), [templates]);
  const list = templates.filter((t) => (goal == null || t.goal === goal) && (level == null || t.level === level));

  const open = (t: CatalogTemplate) => {
    setTarget(t);
    dialogRef.current?.showModal();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <FilterRow label="Objectif" options={goals.map((g) => ({ key: g, label: g }))} value={goal} onChange={setGoal} />
        <FilterRow label="Niveau" options={LEVELS} value={level} onChange={setLevel} />
      </div>

      <p className="text-legende text-texte-2" role="status" aria-live="polite">
        {list.length} {list.length > 1 ? "modèles" : "modèle"}
        {goal || level ? " avec ces filtres" : ""}
      </p>

      {list.length === 0 ? (
        <div className="liste-groupee">
          <div className="flex flex-col items-start gap-2 p-5">
            <strong>Aucun modèle ne correspond</strong>
            <span className="text-texte-2">Essayez un autre objectif ou un autre niveau.</span>
            <button
              type="button"
              className="btn-secondaire mt-1"
              onClick={() => {
                setGoal(null);
                setLevel(null);
              }}
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Modèles de programme">
          {list.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 rounded-[20px] bg-carte p-5 shadow-legere">
              <div className="flex flex-wrap gap-1.5 text-legende font-semibold">
                <span className="rounded-full bg-olive-pale px-2.5 py-0.5 text-olive-fonce">{t.goal}</span>
                <span className="rounded-full bg-separateur px-2.5 py-0.5 text-texte-2">{levelLabel(t.level)}</span>
              </div>
              <h2 className="text-sous-titre">{t.name}</h2>
              <p className="text-texte-2 tabular-nums">
                {t.weeks} semaines · {t.sessionsPerWeek} {t.sessionsPerWeek > 1 ? "séances" : "séance"} par semaine
              </p>
              {t.description && <p>{t.description}</p>}
              {t.sessions.length > 0 && (
                <p className="text-legende text-texte-2">
                  Séances types : {t.sessions.map((s) => `${s.label} ${s.name}`).join(", ")}
                </p>
              )}
              <div className="mt-auto pt-2">
                <button type="button" className="btn-principal w-full" onClick={() => open(t)} aria-haspopup="dialog">
                  Personnaliser pour…
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="perso-title"
        onClose={() => setTarget(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,520px)] rounded-[24px] bg-carte p-0 text-texte shadow-flottante backdrop:bg-texte/40"
      >
        {target && <PersonnaliserForm key={target.id} template={target} clients={clients} onCancel={() => dialogRef.current?.close()} />}
      </dialog>
    </div>
  );
}

function PersonnaliserForm({ template, clients, onCancel }: { template: CatalogTemplate; clients: CatalogClient[]; onCancel: () => void }) {
  const uid = useId();
  const [state, action, pending] = useActionState<PersonnaliserState, FormData>(personnaliserModele, {});
  const mine = state.templateId === template.id ? state : {};
  const errId = `${uid}-err`;

  return (
    <form action={action} className="flex max-h-[85dvh] flex-col gap-4 p-6" noValidate>
      <input type="hidden" name="templateId" value={template.id} />
      <div className="flex items-start justify-between gap-3">
        <h2 id="perso-title" className="text-sous-titre">
          Personnaliser « {template.name} »
        </h2>
        <button type="button" onClick={onCancel} aria-label="Fermer" className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-icone hover:bg-separateur">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {mine.error && (
        <p role="alert" className="rounded-2xl bg-peche px-4 py-3 text-peche-fonce">
          {mine.error}
        </p>
      )}

      <fieldset className="flex min-h-0 flex-col gap-2" aria-describedby={mine.fieldError ? errId : `${uid}-hint`} aria-invalid={mine.fieldError ? true : undefined}>
        <legend className="mb-2 font-semibold">Coaché</legend>
        {clients.length === 0 ? (
          <p className="text-texte-2">Aucun coaché actif pour le moment.</p>
        ) : (
          <div className="liste-groupee min-h-0 overflow-y-auto">
            {clients.map((c) => (
              <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-3 has-[:checked]:bg-olive-pale">
                <input type="radio" name="clientId" value={c.id} required className="size-5 accent-olive-fonce" />
                <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-olive-pale text-legende font-semibold text-olive-fonce">
                  {c.initials}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{c.fullName}</span>
                  <span className="block truncate text-legende text-texte-2">
                    {c.goal ?? "Objectif à préciser"}
                    {c.program ? ` · en cours : ${c.program}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        {mine.fieldError ? (
          <p id={errId} role="alert" className="text-legende font-medium text-peche-fonce">
            {mine.fieldError}
          </p>
        ) : (
          <p id={`${uid}-hint`} className="text-legende text-texte-2">
            Une copie personnalisée est créée pour ce coaché ; le modèle ne change pas. Vous l’ajustez ensuite dans l’éditeur.
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondaire" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-principal" disabled={pending || clients.length === 0}>
          {pending ? "Création de la copie…" : "Créer la copie personnalisée"}
        </button>
      </div>
    </form>
  );
}

function FilterRow({ label, options, value, onChange }: { label: string; options: { key: string; label: string }[]; value: string | null; onChange: (v: string | null) => void }) {
  const chip = (key: string | null, text: string) => {
    const pressed = value === key;
    return (
      <button
        key={key ?? "__all"}
        type="button"
        aria-pressed={pressed}
        onClick={() => onChange(pressed && key != null ? null : key)}
        className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[15px] font-semibold transition-colors ${
          pressed ? "bg-olive-fonce text-white" : "bg-separateur text-texte hover:bg-olive-pale"
        }`}
      >
        {text}
      </button>
    );
  };
  return (
    <div role="group" aria-label={`Filtrer par ${label.toLowerCase()}`} className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="w-20 shrink-0 text-legende font-semibold text-texte-2">{label}</span>
      {chip(null, "Tous")}
      {options.map((o) => chip(o.key, o.label))}
    </div>
  );
}
