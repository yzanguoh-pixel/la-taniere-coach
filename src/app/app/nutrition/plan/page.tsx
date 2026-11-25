import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckToggle } from "@/components/nutrition/coache/CheckToggle";
import { GenerateShoppingButton } from "@/components/nutrition/coache/GenerateShoppingButton";
import { GlyphAdd, GlyphBack } from "@/components/nutrition/coache/glyphs";
import { IconChevron } from "@/components/icons";
import { toggleShoppingItem } from "@/lib/nutrition/coache/actions";
import { getPlanData, type PlanData, type PlanRecipe } from "@/lib/nutrition/coache/data";
import { DAY_PARAM, DAY_TYPE_LABELS, MEAL_LABELS, dayTypeFromParam, fmt, recipeFitsMeal, type DayType } from "@/lib/nutrition/coache/format";

export const metadata: Metadata = { title: "Plan du jour" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** M9-Plan : plan alimentaire selon le type de jour, recettes et liste de courses à cocher. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PlanSkeleton />}>
      <PlanView searchParams={searchParams} />
    </Suspense>
  );
}

function Header({ sub }: { sub: string }) {
  return (
    <header className="flex flex-col gap-1">
      <Link href="/app/nutrition" className="-ml-2 mb-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-olive-fonce">
        <GlyphBack width={18} height={18} />
        Journal
      </Link>
      <p className="text-[15px] font-medium text-texte-2">{sub}</p>
      <h1 className="text-titre">Plan du jour</h1>
    </header>
  );
}

function PlanSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true">
      <Header sub="Nutrition" />
      <div className="h-11 animate-pulse rounded-full bg-olive-pale" />
      <div className="h-72 animate-pulse rounded-[20px] bg-olive-pale" />
    </section>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function PlanView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const data = await getPlanData(dayTypeFromParam(one(sp.jour)));
  if (!data) {
    return (
      <section className="flex flex-col gap-6">
        <Header sub="Nutrition" />
        <p role="status" className="rounded-[20px] bg-beurre px-5 py-4 text-[15px] font-medium text-beurre-fonce">
          Impossible de charger ton plan pour le moment. Reconnecte-toi depuis l’accueil de la démo.
        </p>
      </section>
    );
  }

  const { dayType, goals, plan } = data;
  const goal = goals[dayType];

  return (
    <section className="flex flex-col gap-6">
      <Header sub={`Préparé par ${data.coachFirstName}`} />

      <nav aria-label="Type de jour" className="grid grid-cols-2 gap-1 rounded-full bg-separateur p-1">
        {(["training", "rest"] as DayType[]).map((t) => (
          <Link
            key={t}
            href={`/app/nutrition/plan?jour=${DAY_PARAM[t]}`}
            aria-current={dayType === t ? "page" : undefined}
            className={`grid min-h-11 place-items-center rounded-full text-[15px] font-semibold transition-colors ${dayType === t ? "bg-carte text-texte shadow-legere" : "text-texte-2"}`}
          >
            {t === "training" ? "Entraînement" : "Repos"}
            {data.todayType === t && <span className="sr-only"> (aujourd’hui)</span>}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="objectif-titre" className="rounded-[24px] bg-olive p-5 text-texte">
        <p id="objectif-titre" className="text-legende font-semibold uppercase tracking-[0.04em]">
          {DAY_TYPE_LABELS[dayType]}
          {data.todayType === dayType ? " · aujourd’hui" : ""}
        </p>
        {goal ? (
          <>
            <p className="mt-2 text-[34px] font-bold leading-none tabular-nums">
              {fmt(goal.kcal)} <span className="text-[17px] font-semibold">kcal</span>
            </p>
            <p className="mt-2 text-[15px] font-medium tabular-nums">
              Protéines {fmt(goal.protein)} g · Glucides {fmt(goal.carbs)} g · Lipides {fmt(goal.fat)} g
            </p>
          </>
        ) : (
          <p className="mt-2 text-[15px] font-medium">{data.coachFirstName} n’a pas encore fixé d’objectif pour ce type de jour.</p>
        )}
      </section>

      {plan ? <PlanMeals data={data} /> : (
        <p className="rounded-[20px] bg-carte px-5 py-4 text-[15px] text-texte-2 shadow-legere">
          Pas encore de plan alimentaire. {data.coachFirstName} te l’enverra ici dès qu’il sera prêt.
        </p>
      )}

      <Shopping data={data} />
    </section>
  );
}

function PlanMeals({ data }: { data: PlanData }) {
  const plan = data.plan!;
  return (
    <>
      <section aria-labelledby="plan-titre" className="flex flex-col gap-3">
        <div>
          <h2 id="plan-titre" className="text-sous-titre">
            {plan.name}
          </h2>
          {plan.adaptations.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Adaptations de ton coach">
              {plan.adaptations.map((a) => (
                <li key={a} className="rounded-full bg-olive-pale px-3 py-1 text-[13px] font-medium text-olive-fonce">
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
        {plan.meals.length === 0 ? (
          <p className="rounded-[20px] bg-carte px-5 py-4 text-[15px] text-texte-2 shadow-legere">Aucun repas prévu pour ce type de jour.</p>
        ) : (
          <div className="liste-groupee">
            {plan.meals.map((m, i) => (
              <div key={`${m.label}-${i}`} className="px-4 py-3.5">
                <h3 className="text-[15px] font-semibold text-olive-fonce">{m.label}</h3>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {m.items.map((it, j) => (
                    <li key={`${it.text}-${j}`} className="flex items-baseline justify-between gap-3 text-[17px]">
                      <span>{it.name}</span>
                      {it.quantity && <span className="shrink-0 text-[15px] tabular-nums text-texte-2">{it.quantity}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <Recipes data={data} />
    </>
  );
}

function Recipes({ data }: { data: PlanData }) {
  const meals = data.plan!.meals.map((m) => m.meal).filter((m): m is NonNullable<typeof m> => m !== null);
  const groups = meals
    .map((meal) => ({ meal, recipes: data.recipes.filter((r) => recipeFitsMeal(r.tags, meal)) }))
    .filter((g) => g.recipes.length > 0);
  if (!groups.length) return null;
  return (
    <section aria-labelledby="recettes-titre" className="flex flex-col gap-3">
      <h2 id="recettes-titre" className="text-sous-titre">
        Recettes pour ce plan
      </h2>
      {groups.map((g) => (
        <div key={g.meal} className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-texte-2">{MEAL_LABELS[g.meal]}</h3>
          <div className="liste-groupee">
            {g.recipes.map((r) => (
              <RecipeRow key={r.id} recipe={r} meal={g.meal} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function RecipeRow({ recipe, meal }: { recipe: PlanRecipe; meal: string }) {
  const add = `/app/nutrition/ajouter?${new URLSearchParams({ onglet: "recettes", recette: recipe.id, repas: meal }).toString()}`;
  return (
    <details className="group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{recipe.name}</span>
          <span className="block text-[13px] tabular-nums text-texte-2">
            {fmt(recipe.perServing.kcal)} kcal / portion · P {fmt(recipe.perServing.protein)} g · G {fmt(recipe.perServing.carbs)} g · L {fmt(recipe.perServing.fat)} g
          </span>
        </span>
        <IconChevron width={18} height={18} className="shrink-0 rotate-90 text-icone transition-transform group-open:-rotate-90" />
      </summary>
      <div className="px-4 pb-3">
        <p className="text-[13px] font-semibold text-texte-2">
          Ingrédients pour {recipe.servings} {recipe.servings > 1 ? "portions" : "portion"}
        </p>
        <ul className="mt-1 flex flex-col gap-0.5 text-[15px]">
          {recipe.ingredients.map((i, k) => (
            <li key={`${i.name}-${k}`} className="flex justify-between gap-3">
              <span>{i.name}</span>
              <span className="tabular-nums text-texte-2">{i.quantity}</span>
            </li>
          ))}
        </ul>
        <Link href={add} className="mt-2 flex min-h-11 items-center gap-2 text-[15px] font-semibold text-olive-fonce">
          <GlyphAdd width={18} height={18} />
          Ajouter au journal
        </Link>
      </div>
    </details>
  );
}

function Shopping({ data }: { data: PlanData }) {
  const items = [...data.shopping].sort((a, b) => Number(a.checked) - Number(b.checked));
  const left = items.filter((i) => !i.checked).length;
  return (
    <section aria-labelledby="courses-titre" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="courses-titre" className="text-sous-titre">
          Liste de courses
        </h2>
        {items.length > 0 && (
          <span className="text-[13px] font-medium tabular-nums text-texte-2">
            {left === 0 ? "Tout est acheté" : `${left} à acheter`}
          </span>
        )}
      </div>
      {items.length > 0 ? (
        <div className="liste-groupee">
          {items.map((i) => (
            <CheckToggle key={i.id} checked={i.checked} action={toggleShoppingItem.bind(null, i.id)} title={i.name} detail={i.quantity} strike />
          ))}
        </div>
      ) : (
        <p className="rounded-[20px] bg-carte px-5 py-4 text-[15px] text-texte-2 shadow-legere">Ta liste est vide.</p>
      )}
      {data.plan && <GenerateShoppingButton dayParam={DAY_PARAM[data.dayType]} />}
    </section>
  );
}
