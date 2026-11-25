"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { personalizePlan, type NutritionState } from "@/lib/nutrition/coach/actions";
import { KCAL_PER_KG, isObjective, objectiveFromGoal, objectiveLabel, personalize, fmtKcal, type Objective, type PlanMeal } from "@/lib/nutrition/coach/rules";
import { AdaptationPills } from "./MealPlan";

export type PersonalizeClient = { id: string; name: string; weightKg: number | null; goal: string | null; exclusions: string[] };

const initial: NutritionState = { status: "idle" };

/** US27 — « Personnaliser pour… » : copie personnalisée du plan type, avec aperçu des adaptations avant création. */
export function PersonalizeForm({ templateId, templateName, templateKcal, meals, clients }: { templateId: string; templateName: string; templateKcal: number; meals: PlanMeal[]; clients: PersonalizeClient[] }) {
  const [clientId, setClientId] = useState("");
  const [objective, setObjective] = useState<"auto" | Objective>("auto");
  const [state, action, pending] = useActionState(personalizePlan, initial);
  const base = `perso-${templateId}`;
  const client = clients.find((c) => c.id === clientId);
  const effective: Objective | null = client ? (isObjective(objective) ? objective : objectiveFromGoal(client.goal)) : null;
  const preview = client && effective ? personalize({ templateKcal, meals, weightKg: client.weightKg, objective: effective, exclusions: client.exclusions }) : null;
  const clientErr = state.fieldErrors?.clientId;

  if (!clients.length) return <p className="text-[15px] text-texte-2">Aucun coaché actif à qui proposer ce plan.</p>;

  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="templateId" value={templateId} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${base}-client`} className="text-[15px] font-semibold">
          Personnaliser « {templateName} » pour…
        </label>
        <select
          id={`${base}-client`}
          name="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-invalid={clientErr ? true : undefined}
          aria-describedby={clientErr ? `${base}-client-err` : undefined}
          className={`min-h-11 w-full rounded-[12px] border bg-carte px-3 text-[17px] ${clientErr ? "border-peche-fonce" : "border-bordure"}`}
        >
          <option value="">Choisir un coaché</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.weightKg ? ` · ${c.weightKg.toLocaleString("fr-FR")} kg` : ""}
            </option>
          ))}
        </select>
        {clientErr && (
          <p id={`${base}-client-err`} className="text-legende font-semibold text-peche-fonce">
            {clientErr}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-[15px] font-semibold">Objectif pour le calcul des calories</legend>
        <div className="flex flex-wrap gap-2">
          {(["auto", "perte", "maintien", "prise"] as const).map((o) => (
            <label
              key={o}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[15px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-olive-fonce ${
                objective === o ? "bg-olive-fonce text-white" : "bg-separateur text-texte"
              }`}
            >
              <input type="radio" name="objective" value={o} checked={objective === o} onChange={() => setObjective(o)} className="sr-only" />
              {o === "auto" ? "Selon son objectif" : `${objectiveLabel[o]} · ${KCAL_PER_KG[o]} kcal/kg`}
            </label>
          ))}
        </div>
      </fieldset>

      {preview && client && (
        <div aria-live="polite" className="flex flex-col gap-2 rounded-[16px] bg-olive-pale px-4 py-3">
          <p className="text-[15px] font-semibold tabular-nums text-olive-fonce">
            Aperçu pour {client.name} : {fmtKcal(preview.kcal)} kcal par jour
            {client.goal ? <span className="font-normal"> · objectif « {client.goal} »</span> : null}
          </p>
          <AdaptationPills items={preview.adaptations} label="Adaptations prévues" />
        </div>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="text-[15px] font-semibold text-peche-fonce">
          {state.message}
        </p>
      )}
      {state.status === "ok" && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message}{" "}
          {state.href && (
            <Link href={state.href} className="underline">
              Voir sa fiche nutrition
            </Link>
          )}
        </p>
      )}

      <button type="submit" className="btn-principal self-start" disabled={pending}>
        {pending ? "Création…" : client ? `Créer le plan de ${client.name.split(" ")[0]}` : "Créer la copie personnalisée"}
      </button>
    </form>
  );
}
