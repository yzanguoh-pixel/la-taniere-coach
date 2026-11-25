"use client";

import { useActionState, useState } from "react";
import { convertProspect, type BilanState } from "@/lib/bilans/actions";
import type { TemplateOption } from "@/lib/bilans/synthese";

const initial: BilanState = { status: "idle" };

/** US11 — Convertir le prospect en coachée avec un programme personnalisé tiré du modèle conseillé. */
export function ConvertForm({
  bookingId,
  firstName,
  templates,
  recommendedId,
  adaptations,
}: {
  bookingId: string;
  firstName: string;
  templates: TemplateOption[];
  recommendedId: string | null;
  adaptations: string[];
}) {
  const [state, action, pending] = useActionState(convertProspect, initial);
  const [templateId, setTemplateId] = useState(recommendedId ?? "");
  const chosen = templates.find((t) => t.id === templateId);
  const tplError = state.fieldErrors?.templateId;

  if (!templates.length) {
    return <p className="liste-groupee p-5 text-texte-2">Aucun modèle dans ta bibliothèque : crée un modèle avant de convertir.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="liste-groupee flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="convert-template" className="text-[17px] font-semibold">
            Modèle de départ
          </label>
          <select
            id="convert-template"
            name="templateId"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            aria-invalid={tplError ? true : undefined}
            aria-describedby={tplError ? "convert-template-err" : "convert-template-hint"}
            className={`min-h-11 rounded-[12px] border bg-carte px-3 text-[17px] ${tplError ? "border-peche-fonce" : "border-bordure"}`}
          >
            <option value="">Choisir un modèle</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === recommendedId ? " (conseillé)" : ""}
              </option>
            ))}
          </select>
          {tplError ? (
            <p id="convert-template-err" className="text-[15px] font-semibold text-peche-fonce">
              {tplError}
            </p>
          ) : (
            <p id="convert-template-hint" className="text-legende tabular-nums text-texte-2">
              {chosen ? `${chosen.weeks} semaines · ${chosen.sessions_per_week} séances par semaine · démarre lundi prochain` : "Le modèle n’est jamais modifié : une copie est créée pour " + firstName + "."}
            </p>
          )}
        </div>

        {adaptations.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[17px] font-semibold">Adaptations du programme</legend>
            {adaptations.map((a, i) => (
              <label key={a} htmlFor={`adapt-${i}`} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input id={`adapt-${i}`} type="checkbox" name="adaptation" value={a} defaultChecked className="size-5 accent-olive-fonce" />
                <span className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">{a}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" className="btn-principal" disabled={pending}>
          {pending ? "Conversion…" : `Convertir ${firstName} en coachée`}
        </button>
        <span className="text-legende text-texte-2">Crée sa fiche, son programme personnalisé, puis ouvre l’éditeur.</span>
      </div>
    </form>
  );
}
