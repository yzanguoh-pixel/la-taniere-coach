import type { PlanMeal } from "@/lib/nutrition/coach/rules";

/** Pastilles d'adaptation d'un plan (même rendu que les adaptations de programme sur la fiche). */
export function AdaptationPills({ items, label = "Adaptations du plan" }: { items: string[]; label?: string }) {
  if (!items.length) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((a) => (
        <li key={a} className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">
          {a}
        </li>
      ))}
    </ul>
  );
}

/** Repas d'un plan : une ligne par repas, contenu en liste. */
export function MealList({ meals }: { meals: PlanMeal[] }) {
  if (!meals.length) return <p className="text-texte-2">Ce plan ne contient aucun repas.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {meals.map((m, i) => (
        <div key={m.repas + i} className="flex flex-col gap-0.5">
          <dt className="text-legende font-semibold uppercase tracking-wide text-texte-2">{m.repas}</dt>
          <dd className="text-[15px]">{m.contenu.length ? m.contenu.join(" · ") : <span className="text-texte-2">Rien de prévu (aliments retirés)</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
