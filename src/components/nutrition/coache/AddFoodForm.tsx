"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { addFoodEntry, type AddEntryState } from "@/lib/nutrition/coache/actions";
import type { CatalogFood, CatalogRecipe } from "@/lib/nutrition/coache/data";
import { MEALS, MEAL_LABELS, fmt, foodMacros, matches, recipeMacros, type Meal } from "@/lib/nutrition/coache/format";
import { GlyphSearch } from "./glyphs";

type Tab = "food" | "recipe";
const MAX_RESULTS = 30;

const ErrorText = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-2 text-[15px] font-medium text-peche-fonce">
      {children}
    </p>
  ) : null;

const chip = (selected: boolean, invalid: boolean) =>
  `grid min-h-11 place-items-center rounded-xl border px-2 text-[15px] font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-olive-fonce ${
    selected ? "border-olive-fonce bg-olive-fonce text-white" : invalid ? "border-peche-fonce bg-carte text-texte" : "border-bordure bg-carte text-texte hover:bg-olive-pale"
  }`;

const parseQty = (s: string) => {
  const x = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return s.trim() !== "" && Number.isFinite(x) && x > 0 ? x : null;
};

/** Formulaire M8 : onglets Aliments / Recettes, recherche sans accents, repas, quantité et calcul en direct. */
export function AddFoodForm({
  foods,
  recipes,
  date,
  defaultMeal,
  defaultTab,
  defaultRecipeId,
  backHref,
}: {
  foods: CatalogFood[];
  recipes: CatalogRecipe[];
  date: string;
  defaultMeal: Meal | null;
  defaultTab: Tab;
  defaultRecipeId: string | null;
  backHref: string;
}) {
  const [state, action, pending] = useActionState<AddEntryState, FormData>(addFoodEntry, {});
  const initialRecipe = recipes.find((r) => r.id === defaultRecipeId) ?? null;
  const [tab, setTab] = useState<Tab>(initialRecipe ? "recipe" : defaultTab);
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(initialRecipe?.id ?? null);
  const [meal, setMeal] = useState<Meal | null>(defaultMeal);
  const [grams, setGrams] = useState("100");
  const [portions, setPortions] = useState("1");
  const e = state.errors ?? {};

  const isRecipe = tab === "recipe";
  const food = foods.find((f) => f.id === foodId) ?? null;
  const recipe = recipes.find((r) => r.id === recipeId) ?? null;
  const selectedId = isRecipe ? recipeId : foodId;
  const qtyText = isRecipe ? portions : grams;
  const qty = parseQty(qtyText);

  const results = useMemo(() => {
    if (isRecipe) return recipes.filter((r) => matches(`${r.name} ${r.tags.join(" ")}`, query));
    if (query.trim().length < 2) return [];
    return foods.filter((f) => matches(`${f.name} ${f.brand ?? ""} ${f.category ?? ""}`, query));
  }, [isRecipe, foods, recipes, query]);

  const live = qty == null ? null : isRecipe ? (recipe ? recipeMacros(recipe.perServing, qty) : null) : food ? foodMacros(food.per100, qty) : null;
  const fieldErrors = [e.item, e.meal, e.quantity].filter(Boolean).length;

  const switchTab = (t: Tab) => {
    setTab(t);
    setQuery("");
  };

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="kind" value={tab} />
      <input type="hidden" name="item_id" value={selectedId ?? ""} />

      {(fieldErrors > 0 || e.form) && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {e.form ?? (fieldErrors === 1 ? "Un champ est à compléter." : `${fieldErrors} champs sont à compléter.`)}
        </p>
      )}

      <div role="tablist" aria-label="Type d’ajout" className="grid grid-cols-2 gap-1 rounded-full bg-separateur p-1">
        {(
          [
            ["food", "Aliments"],
            ["recipe", "Recettes"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="panel-choix"
            onClick={() => switchTab(t)}
            className={`min-h-11 rounded-full text-[15px] font-semibold transition-colors ${tab === t ? "bg-carte text-texte shadow-legere" : "text-texte-2"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-choix" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-3">
        <label htmlFor="recherche" className="text-[17px] font-semibold">
          {isRecipe ? "Rechercher une recette" : "Rechercher un aliment"}
        </label>
        <div className="relative">
          <GlyphSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-icone" />
          <input
            id="recherche"
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder={isRecipe ? "Ex. bowl, petit-déjeuner" : "Ex. creme, poulet, riz"}
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby="recherche-aide"
            className="min-h-12 w-full rounded-xl border border-bordure bg-carte pl-10 pr-3 text-[17px]"
            onKeyDown={(ev) => {
              if (ev.key === "Enter") ev.preventDefault();
            }}
          />
        </div>
        <p id="recherche-aide" aria-live="polite" className="text-[13px] text-texte-2">
          {!isRecipe && query.trim().length < 2
            ? `Tape au moins 2 lettres, accents facultatifs (${fmt(foods.length)} aliments).`
            : results.length === 0
              ? "Aucun résultat. Essaie un autre mot."
              : results.length > MAX_RESULTS
                ? `${results.length} résultats, les ${MAX_RESULTS} premiers sont affichés : précise ta recherche.`
                : `${results.length} ${results.length > 1 ? "résultats" : "résultat"}.`}
        </p>

        {results.length > 0 && (
          <fieldset aria-describedby={e.item ? "err-item" : undefined} aria-invalid={e.item ? true : undefined}>
            <legend className="sr-only">{isRecipe ? "Recettes trouvées" : "Aliments trouvés"}</legend>
            <div className="liste-groupee">
              {results.slice(0, MAX_RESULTS).map((item) => {
                const checked = selectedId === item.id;
                const meta =
                  "per100" in item
                    ? `${[item.brand, item.category].filter(Boolean).join(" · ")}${item.brand || item.category ? " · " : ""}${fmt(item.per100.kcal)} kcal / 100 g`
                    : `${fmt(item.perServing.kcal)} kcal / portion · P ${fmt(item.perServing.protein)} g`;
                return (
                  <label key={item.id} className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 ${checked ? "bg-olive-pale" : ""}`}>
                    <input
                      type="radio"
                      name="choix"
                      value={item.id}
                      checked={checked}
                      onChange={() => (isRecipe ? setRecipeId(item.id) : setFoodId(item.id))}
                      className="size-5 shrink-0 accent-olive-fonce"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px]">{item.name}</span>
                      <span className="block text-[13px] text-texte-2 tabular-nums">{meta}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <ErrorText id="err-item">{e.item}</ErrorText>
      </div>

      {(isRecipe ? recipe : food) && (
        <p className="rounded-[16px] bg-carte px-4 py-3 text-[15px] shadow-legere">
          <span className="text-texte-2">Sélection : </span>
          <span className="font-semibold">{isRecipe ? recipe?.name : food?.name}</span>
        </p>
      )}

      <fieldset aria-describedby={e.meal ? "err-meal" : undefined} aria-invalid={e.meal ? true : undefined}>
        <legend className="mb-3 text-[17px] font-semibold">Repas</legend>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <label key={m} className="relative">
              <input type="radio" name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} className="peer sr-only" />
              <span className={chip(meal === m, Boolean(e.meal) && meal === null)}>{MEAL_LABELS[m]}</span>
            </label>
          ))}
        </div>
        <ErrorText id="err-meal">{e.meal}</ErrorText>
      </fieldset>

      <div>
        <label htmlFor="quantity" className="mb-2 block text-[17px] font-semibold">
          {isRecipe ? "Nombre de portions" : "Quantité"}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quantity"
            name="quantity"
            inputMode="decimal"
            autoComplete="off"
            value={qtyText}
            onChange={(ev) => (isRecipe ? setPortions(ev.target.value) : setGrams(ev.target.value))}
            aria-invalid={e.quantity ? true : undefined}
            aria-describedby={e.quantity ? "err-qty" : undefined}
            className={`min-h-12 w-32 rounded-xl border bg-carte px-3 text-[17px] tabular-nums ${e.quantity ? "border-peche-fonce" : "border-bordure"}`}
          />
          <span className="text-[17px] text-texte-2">{isRecipe ? (qty != null && qty > 1 ? "portions" : "portion") : "g"}</span>
        </div>
        {recipe && isRecipe && <p className="mt-2 text-[13px] text-texte-2">Recette prévue pour {recipe.servings} {recipe.servings > 1 ? "portions" : "portion"}.</p>}
        <ErrorText id="err-qty">{e.quantity}</ErrorText>
      </div>

      <section aria-label="Apports calculés" aria-live="polite" className="rounded-[20px] bg-olive-pale px-5 py-4">
        {live ? (
          <>
            <p className="text-[28px] font-bold leading-tight tabular-nums text-texte">
              {fmt(live.kcal)} <span className="text-[15px] font-medium text-texte-2">kcal</span>
            </p>
            <p className="mt-1 text-[15px] tabular-nums text-texte">
              Protéines {fmt(live.protein, 1)} g · Glucides {fmt(live.carbs, 1)} g · Lipides {fmt(live.fat, 1)} g
            </p>
          </>
        ) : (
          <p className="text-[15px] text-olive-fonce">{selectedId ? "Indique une quantité pour voir le calcul." : isRecipe ? "Choisis une recette pour voir le calcul." : "Choisis un aliment pour voir le calcul."}</p>
        )}
      </section>

      <div className="flex gap-3">
        <Link href={backHref} className="btn-secondaire flex-1">
          Annuler
        </Link>
        <button type="submit" disabled={pending} className="btn-principal flex-[2]">
          {pending ? "Ajout…" : "Ajouter au journal"}
        </button>
      </div>
    </form>
  );
}
