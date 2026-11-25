import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { coachSupabase } from "@/lib/coach/supabase";
import { firstName, fmtDay } from "@/lib/coach/format";
import { getClientNutrition, type LogEntry, type Macros } from "@/lib/nutrition/coach/queries";
import { MEALS, dayTypeLabel, fmtKcal, mealLabel } from "@/lib/nutrition/coach/rules";
import { Avatar } from "@/components/coach/UrgencyBadge";
import { GoalsForm } from "@/components/nutrition/coach/GoalsForm";
import { EntryComment } from "@/components/nutrition/coach/EntryComment";
import { AdaptationPills, MealList } from "@/components/nutrition/coach/MealPlan";
import { WeekChart } from "@/components/nutrition/coach/WeekChart";
import { WeightChart } from "@/components/nutrition/coach/WeightChart";

export const metadata: Metadata = { title: "Nutrition du coaché" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

/** US25 / US26 — Fiche nutrition : semaine face à l'objectif, journal du jour commenté, objectifs, plan type adapté, pesées. */
export default function Page({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <FicheNutrition params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const MACROS = [
  { key: "protein_g", label: "Protéines" },
  { key: "carbs_g", label: "Glucides" },
  { key: "fat_g", label: "Lipides" },
] as const;

function Section({ title, aside, children, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; id?: string }) {
  const hid = `${id ?? title.toLowerCase().replace(/[^a-z]+/g, "-")}-titre`;
  return (
    <section id={id} aria-labelledby={hid} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={hid} className="text-sous-titre">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Gauge({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target != null && value > target * 1.1;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-[15px]">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-texte-2">
          <strong className="text-texte">{fmtKcal(value)}</strong>
          {target != null ? ` / ${fmtKcal(target)}` : ""} {unit}
        </span>
      </div>
      {target != null && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={Math.round(value)}
          aria-valuetext={`${fmtKcal(value)} sur ${fmtKcal(target)} ${unit}`}
          className="h-2 overflow-hidden rounded-full bg-separateur"
        >
          <div className={`h-full rounded-full ${over ? "bg-beurre-fonce" : "bg-olive-fonce"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function sum(entries: LogEntry[]): Macros {
  return entries.reduce((s, e) => ({ kcal: s.kcal + e.kcal, protein_g: s.protein_g + e.protein_g, carbs_g: s.carbs_g + e.carbs_g, fat_g: s.fat_g + e.fat_g }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

const fmtQty = (e: LogEntry) => (e.unit === "portion" ? `${e.quantity.toLocaleString("fr-FR")} portion${e.quantity > 1 ? "s" : ""}` : `${Math.round(e.quantity)} g`);

async function FicheNutrition({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await coachSupabase();
  if (!supabase) return <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : la fiche nutrition ne peut pas être chargée.</p>;
  const jour = typeof sp.jour === "string" ? sp.jour : undefined;
  const n = await getClientNutrition(supabase, id, jour);
  if (!n) notFound();

  const name = firstName(n.fullName);
  const basePath = `/coach/coaches/${n.id}/nutrition`;
  const totals = sum(n.entries);
  const target = n.goals[n.dayType] ?? null;
  const dayTitle = n.day === n.today ? "aujourd’hui" : fmtDay(n.day);
  const byMeal = MEALS.map((m) => ({ meal: m, items: n.entries.filter((e) => e.meal === m) })).filter((g) => g.items.length);

  return (
    <article className="flex flex-col gap-8">
      <div>
        <nav aria-label="Retour" className="flex flex-wrap gap-x-5">
          <Link href={`/coach/coaches/${n.id}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce hover:underline">
            ← Fiche de {name}
          </Link>
          <Link href="/coach/nutrition" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce hover:underline">
            Espace Nutrition
          </Link>
        </nav>
        <header className="mt-2 flex items-center gap-4">
          <Avatar initials={n.initials} size={56} />
          <div className="min-w-0">
            <h1 className="text-titre break-words">{n.fullName}</h1>
            <p className="mt-1 text-texte-2">
              Nutrition{n.goal ? ` · ${n.goal}` : ""}
              {n.weightKg ? <span className="tabular-nums"> · {n.weightKg.toLocaleString("fr-FR")} kg</span> : null}
            </p>
          </div>
        </header>
        {n.exclusions.length > 0 && (
          <ul aria-label="Aliments exclus" className="mt-3 flex flex-wrap gap-1.5">
            {n.exclusions.map((x) => (
              <li key={x} className="rounded-full bg-peche px-3 py-1 text-legende font-semibold text-peche-fonce">
                Sans {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Section title="Semaine" aside={<span className="text-legende text-texte-2">7 derniers jours · touche un jour pour ouvrir son journal</span>}>
        <div className="liste-groupee p-4 sm:p-5">
          <WeekChart week={n.week} selected={n.day} basePath={basePath} />
        </div>
      </Section>

      <Section
        id="journal"
        title={`Journal ${n.day === n.today ? "d’aujourd’hui" : `du ${fmtDay(n.day)}`}`}
        aside={<span className="text-legende text-texte-2">{dayTypeLabel[n.dayType]}</span>}
      >
        <div className="liste-groupee grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Gauge label="Calories" value={totals.kcal} target={target?.kcal ?? null} unit="kcal" />
          </div>
          {MACROS.map((m) => (
            <Gauge key={m.key} label={m.label} value={totals[m.key]} target={target?.[m.key] ?? null} unit="g" />
          ))}
          {!target && <p className="text-[15px] text-texte-2 sm:col-span-2">Pas d’objectif pour ce type de jour : renseigne-le plus bas.</p>}
        </div>

        {byMeal.length ? (
          <div className="flex flex-col gap-4">
            {byMeal.map((g) => (
              <div key={g.meal} className="flex flex-col gap-2">
                <h3 className="px-1 text-[15px] font-semibold text-texte-2">
                  {mealLabel[g.meal]} <span className="font-normal tabular-nums">· {fmtKcal(g.items.reduce((s, e) => s + e.kcal, 0))} kcal</span>
                </h3>
                <ul className="liste-groupee">
                  {g.items.map((e) => (
                    <li key={e.id} className="flex flex-col gap-1 px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-[17px] font-semibold">{e.name}</span>
                        <span className="text-[15px] tabular-nums text-texte-2">
                          {fmtQty(e)} · <strong className="text-texte">{fmtKcal(e.kcal)} kcal</strong>
                        </span>
                      </div>
                      <span className="text-legende tabular-nums text-texte-2">
                        P {fmtKcal(e.protein_g)} g · G {fmtKcal(e.carbs_g)} g · L {fmtKcal(e.fat_g)} g
                      </span>
                      <EntryComment clientId={n.id} entryId={e.id} entryName={e.name} comment={e.coachComment} firstName={name} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="liste-groupee p-5 text-texte-2">
            {name} n’a rien noté {dayTitle === "aujourd’hui" ? "aujourd’hui" : `le ${dayTitle}`}. Choisis un autre jour dans la semaine.
          </p>
        )}
      </Section>

      <Section title="Objectifs par type de jour" aside={<span className="text-legende text-texte-2">Un jour avec séance prévue ou faite compte comme entraînement</span>}>
        <GoalsForm clientId={n.id} goals={n.goals} firstName={name} />
      </Section>

      <Section
        title="Plan type adapté"
        aside={
          <Link href="/coach/nutrition#plans-types" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce hover:underline">
            {n.plan ? "Changer de plan" : "Choisir un plan type"}
          </Link>
        }
      >
        {n.plan ? (
          <div className="liste-groupee flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-[17px] font-semibold">{n.plan.name}</h3>
              <span className="text-[15px] font-semibold tabular-nums">{fmtKcal(n.plan.kcal)} kcal par jour</span>
            </div>
            <AdaptationPills items={n.plan.adaptations} />
            <MealList meals={n.plan.meals} />
          </div>
        ) : (
          <p className="liste-groupee p-5 text-texte-2">Aucun plan actif. Pars d’un plan type et personnalise-le pour {name}.</p>
        )}
      </Section>

      {n.weights.length > 0 && (
        <Section title="Pesées">
          <div className="liste-groupee p-4 sm:p-5">
            <WeightChart points={n.weights} />
          </div>
        </Section>
      )}
    </article>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche nutrition" className="flex flex-col gap-6">
      <div className="h-14 w-2/3 animate-pulse rounded-[16px] bg-separateur" />
      <div className="h-56 animate-pulse rounded-[20px] bg-separateur" />
      <div className="h-40 animate-pulse rounded-[20px] bg-separateur" />
    </div>
  );
}
