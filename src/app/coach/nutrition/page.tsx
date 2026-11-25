import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { coachSupabase } from "@/lib/coach/supabase";
import { fmtLongToday, relativeTime } from "@/lib/coach/format";
import { getNutritionOverview, listRecipes, listTemplates, type OverviewRow } from "@/lib/nutrition/coach/queries";
import { KCAL_PER_KG, fmtKcal, mealLabel, objectiveLabel } from "@/lib/nutrition/coach/rules";
import { Avatar } from "@/components/coach/UrgencyBadge";
import { IconChevron } from "@/components/icons";
import { MealList } from "@/components/nutrition/coach/MealPlan";
import { PersonalizeForm, type PersonalizeClient } from "@/components/nutrition/coach/PersonalizeForm";

export const metadata: Metadata = { title: "Nutrition" };

/** US27 — Espace Nutrition : suivi de tous les coachés, plans types personnalisables, recettes. */
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Nutrition />
    </Suspense>
  );
}

function TodayStatus({ row, start = false }: { row: OverviewRow; start?: boolean }) {
  if (!row.target) return <span className="text-texte-2">Pas d’objectif</span>;
  const pct = Math.round((row.kcalToday / row.target) * 100);
  const tone = row.kcalToday === 0 ? "text-texte-2" : pct > 110 ? "text-beurre-fonce" : "text-olive-fonce";
  return (
    <span className={`flex flex-col tabular-nums ${start ? "items-start" : "items-end"}`}>
      <span className={`text-[17px] font-semibold ${tone}`}>
        {fmtKcal(row.kcalToday)} <span className="font-normal text-texte-2">/ {fmtKcal(row.target)} kcal</span>
      </span>
      <span className="text-legende text-texte-2">{row.dayType === "training" ? "Entraînement" : "Repos"}{row.kcalToday ? ` · ${pct} %` : ""}</span>
    </span>
  );
}

async function Nutrition() {
  const supabase = await coachSupabase();
  if (!supabase) return <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : l’espace Nutrition ne peut pas être chargé.</p>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <p className="liste-groupee p-5 text-texte-2">Session expirée : reconnecte-toi.</p>;

  const [{ rows }, templates, recipes] = await Promise.all([getNutritionOverview(supabase), listTemplates(supabase, user.id), listRecipes(supabase, user.id)]);
  const now = new Date();
  const clients: PersonalizeClient[] = rows.map((r) => ({ id: r.id, name: r.fullName, weightKg: r.weightKg, goal: r.goal, exclusions: r.exclusions }));
  const logged = rows.filter((r) => r.kcalToday > 0).length;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-titre">Nutrition</h1>
        <p className="mt-1 text-texte-2">{fmtLongToday(now)} · {logged} coaché{logged > 1 ? "s ont" : " a"} noté un repas aujourd’hui</p>
      </header>

      <section aria-labelledby="suivi-titre" className="flex flex-col gap-3">
        <h2 id="suivi-titre" className="text-sous-titre">
          Suivi des coachés
        </h2>
        {rows.length ? (
          <ul className="liste-groupee">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/coach/coaches/${r.id}/nutrition`} className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-fond sm:px-5">
                  <Avatar initials={r.initials} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[17px] font-semibold">{r.fullName}</span>
                    <span className="truncate text-legende text-texte-2">
                      {r.last ? `Dernier repas : ${mealLabel[r.last.meal] ?? r.last.meal}, ${r.last.name} · ${relativeTime(r.last.createdAt, now)}` : "Aucun repas noté ces 30 derniers jours"}
                    </span>
                    {r.planName && <span className="truncate text-legende text-texte-2">Plan : {r.planName}</span>}
                  </span>
                  <span className="hidden sm:block">
                    <TodayStatus row={r} />
                  </span>
                  <IconChevron className="shrink-0 text-icone" width={18} height={18} />
                </Link>
                <div className="-mt-1 pb-3 pl-[4.25rem] pr-4 sm:hidden">
                  <TodayStatus row={r} start />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="liste-groupee p-5 text-texte-2">Aucun coaché actif : les journaux nutrition apparaîtront ici.</p>
        )}
      </section>

      <section id="plans-types" aria-labelledby="plans-titre" className="flex scroll-mt-8 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="plans-titre" className="text-sous-titre">
            Plans types
          </h2>
          <p className="text-[15px] text-texte-2">
            « Personnaliser pour… » crée une copie pour le coaché : calories = poids × {KCAL_PER_KG.perte} kcal/kg ({objectiveLabel.perte.toLowerCase()}), {KCAL_PER_KG.maintien} (
            {objectiveLabel.maintien.toLowerCase()}) ou {KCAL_PER_KG.prise} (prise), arrondi à 50 kcal ; ses aliments exclus sont retirés. Chaque adaptation apparaît en pastille.
          </p>
        </div>
        {templates.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {templates.map((t) => (
              <li key={t.id} className="liste-groupee flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-[17px] font-semibold">{t.name}</h3>
                  <span className="text-[15px] tabular-nums text-texte-2">
                    {t.goal} · <strong className="text-texte">{fmtKcal(t.kcal)} kcal</strong>
                  </span>
                </div>
                {t.description && <p className="-mt-2 text-[15px] text-texte-2">{t.description}</p>}
                <MealList meals={t.meals} />
                <div className="border-t border-separateur pt-4">
                  <PersonalizeForm templateId={t.id} templateName={t.name} templateKcal={t.kcal} meals={t.meals} clients={clients} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="liste-groupee p-5 text-texte-2">Aucun plan type pour l’instant.</p>
        )}
      </section>

      <section aria-labelledby="recettes-titre" className="flex flex-col gap-3">
        <h2 id="recettes-titre" className="text-sous-titre">
          Recettes <span className="text-[15px] font-normal tabular-nums text-texte-2">· {recipes.length}</span>
        </h2>
        {recipes.length ? (
          <ul className="liste-groupee">
            {recipes.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 px-5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-[17px] font-semibold">{r.name}</span>
                  <span className="text-[15px] tabular-nums text-texte-2">
                    <strong className="text-texte">{fmtKcal(r.kcal)} kcal</strong> par portion · {r.servings} portion{r.servings > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-legende tabular-nums text-texte-2">
                  P {fmtKcal(r.protein_g)} g · G {fmtKcal(r.carbs_g)} g · L {fmtKcal(r.fat_g)} g
                  {r.ingredients.length ? ` · ${r.ingredients.map((i) => i.aliment).join(", ")}` : ""}
                </span>
                {r.tags.length > 0 && (
                  <ul aria-label="Étiquettes" className="mt-1 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <li key={tag} className="rounded-full bg-separateur px-2.5 py-0.5 text-legende font-semibold text-texte-2">
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="liste-groupee p-5 text-texte-2">Aucune recette pour l’instant.</p>
        )}
      </section>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de l’espace Nutrition" className="flex flex-col gap-6">
      <div className="h-12 w-1/2 animate-pulse rounded-[16px] bg-separateur" />
      <div className="h-64 animate-pulse rounded-[20px] bg-separateur" />
      <div className="h-64 animate-pulse rounded-[20px] bg-separateur" />
    </div>
  );
}
