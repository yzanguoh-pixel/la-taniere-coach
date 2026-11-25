import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconChevron, IconMessages } from "@/components/icons";
import { CalorieRing } from "@/components/nutrition/coache/CalorieRing";
import { CheckToggle } from "@/components/nutrition/coache/CheckToggle";
import { MacroBars } from "@/components/nutrition/coache/MacroBars";
import { GlyphAdd, GlyphBack } from "@/components/nutrition/coache/glyphs";
import { dayLabel, longDate } from "@/lib/coache/format";
import { toggleSupplement } from "@/lib/nutrition/coache/actions";
import { getJournal, type Journal, type JournalMeal } from "@/lib/nutrition/coache/data";
import { DAY_TYPE_LABELS, JOURNAL_DAYS_BACK, MEAL_AU, MEAL_LABELS, fmt, shiftIso } from "@/lib/nutrition/coache/format";

export const metadata: Metadata = { title: "Nutrition" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** M7-Nutrition : journal du jour (calories restantes, macros, repas, commentaire du coach, compléments). */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalView searchParams={searchParams} />
    </Suspense>
  );
}

function JournalSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true">
      <header>
        <p className="text-[15px] font-medium text-texte-2">Journal</p>
        <h1 className="text-titre">Nutrition</h1>
      </header>
      <div className="h-80 animate-pulse rounded-[24px] bg-olive-pale" />
      <div className="h-40 animate-pulse rounded-[20px] bg-olive-pale" />
    </section>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function JournalView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const journal = await getJournal(one(sp.date));
  const added = one(sp.ajout)?.slice(0, 200);

  if (!journal) {
    return (
      <section className="flex flex-col gap-6">
        <header>
          <h1 className="text-titre">Nutrition</h1>
        </header>
        <p role="status" className="rounded-[20px] bg-beurre px-5 py-4 text-[15px] font-medium text-beurre-fonce">
          Impossible de charger ton journal pour le moment. Reconnecte-toi depuis l’accueil de la démo.
        </p>
      </section>
    );
  }

  const { date, today, goal, total } = journal;
  const isToday = date === today;
  const prev = shiftIso(date, -1);
  const next = shiftIso(date, 1);
  const canPrev = prev >= shiftIso(today, -JOURNAL_DAYS_BACK);
  const canNext = next <= today;
  const addHref = (meal?: string) => `/app/nutrition/ajouter?${new URLSearchParams({ date, ...(meal ? { repas: meal } : {}) }).toString()}`;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-texte-2">Journal partagé avec {journal.coachFirstName}</p>
        <h1 className="text-titre">Nutrition</h1>
      </header>

      {added && (
        <p role="status" className="rounded-[20px] bg-olive-pale px-5 py-4 text-[15px] font-semibold text-olive-fonce">
          {added}
        </p>
      )}

      <nav aria-label="Changer de jour" className="flex items-center justify-between gap-2">
        {canPrev ? (
          <Link href={`/app/nutrition?date=${prev}`} aria-label={`Jour précédent : ${longDate(prev)}`} className="grid size-11 place-items-center rounded-full bg-carte text-olive-fonce shadow-legere">
            <GlyphBack />
          </Link>
        ) : (
          <span className="size-11" />
        )}
        <div className="text-center">
          <p className="text-[17px] font-semibold">{dayLabel(date, today)}</p>
          <p className="text-[13px] text-texte-2">
            {isToday ? `${longDate(date)} · ` : ""}
            {DAY_TYPE_LABELS[journal.dayType]}
          </p>
        </div>
        {canNext ? (
          <Link href={`/app/nutrition?date=${next}`} aria-label={`Jour suivant : ${longDate(next)}`} className="grid size-11 place-items-center rounded-full bg-carte text-olive-fonce shadow-legere">
            <GlyphBack className="rotate-180" />
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </nav>

      {journal.fallback && (
        <p className="rounded-[16px] bg-carte px-4 py-3 text-[15px] text-texte-2 shadow-legere">
          Rien n’est encore noté aujourd’hui. Voici ton dernier jour noté.{" "}
          <Link href={`/app/nutrition?date=${today}`} className="font-semibold text-olive-fonce underline underline-offset-2">
            Voir aujourd’hui
          </Link>
        </p>
      )}

      <section aria-labelledby="bilan-titre" className="flex flex-col items-center gap-5 rounded-[24px] bg-carte p-5 shadow-legere">
        <h2 id="bilan-titre" className="sr-only">
          Bilan du jour
        </h2>
        <CalorieRing consumed={total.kcal} goal={goal?.kcal ?? null} />
        <p className="text-[15px] text-texte-2 tabular-nums">
          <span className="font-semibold text-texte">{fmt(total.kcal)}</span>
          {goal ? ` / ${fmt(goal.kcal)} kcal · objectif ${journal.dayType === "training" ? "entraînement" : "repos"}` : " kcal"}
        </p>
        <div className="w-full">
          <MacroBars total={total} goal={goal} />
        </div>
      </section>

      <Link href={addHref()} className="btn-principal w-full">
        <GlyphAdd />
        Ajouter un aliment
      </Link>

      <section aria-labelledby="repas-titre" className="flex flex-col gap-3">
        <h2 id="repas-titre" className="text-sous-titre">
          Repas
        </h2>
        {journal.meals.map((m) => (
          <MealBlock key={m.meal} meal={m} coach={journal.coachFirstName} addHref={addHref(m.meal)} />
        ))}
      </section>

      <Supplements journal={journal} />

      <Link href="/app/nutrition/plan" className="flex min-h-14 items-center justify-between gap-3 rounded-[20px] bg-carte px-4 shadow-legere">
        <span>
          <span className="block text-[17px] font-semibold">Plan du jour et liste de courses</span>
          <span className="block text-[13px] text-texte-2">Ton plan préparé par {journal.coachFirstName}</span>
        </span>
        <IconChevron width={20} height={20} className="shrink-0 text-icone" />
      </Link>
    </section>
  );
}

function MealBlock({ meal, coach, addHref }: { meal: JournalMeal; coach: string; addHref: string }) {
  const count = meal.entries.length;
  const comments = meal.entries.filter((e) => e.coachComment).length;
  return (
    <details open={count > 0} className="group liste-groupee">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{MEAL_LABELS[meal.meal]}</span>
          <span className="block text-[13px] text-texte-2">
            {count === 0 ? "Rien de noté" : `${count} ${count > 1 ? "aliments" : "aliment"}`}
            {comments > 0 && <span className="font-semibold text-olive-fonce"> · note de {coach}</span>}
          </span>
        </span>
        {count > 0 && (
          <span className="text-[17px] font-semibold tabular-nums">
            {fmt(meal.total.kcal)} <span className="text-[13px] font-medium text-texte-2">kcal</span>
          </span>
        )}
        <IconChevron width={18} height={18} className="shrink-0 rotate-90 text-icone transition-transform group-open:-rotate-90" />
      </summary>
      {meal.entries.map((e) => (
        <div key={e.id} className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[17px]">{e.name}</p>
              <p className="text-[13px] text-texte-2 tabular-nums">
                {e.quantityLabel}
                {e.quantityLabel ? " · " : ""}P {fmt(e.macros.protein, 1)} g · G {fmt(e.macros.carbs, 1)} g · L {fmt(e.macros.fat, 1)} g
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">
              {fmt(e.macros.kcal)} <span className="text-[13px] font-medium text-texte-2">kcal</span>
            </span>
          </div>
          {e.coachComment && (
            <figure className="mt-2.5 rounded-[14px] bg-olive-pale px-3.5 py-2.5">
              <figcaption className="flex items-center gap-1.5 text-[13px] font-semibold text-olive-fonce">
                <IconMessages width={15} height={15} />
                Note de {coach}, ton coach
              </figcaption>
              <blockquote className="mt-1 text-[15px] text-texte">{e.coachComment}</blockquote>
            </figure>
          )}
        </div>
      ))}
      <div className="px-2 py-1">
        <Link href={addHref} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-[15px] font-semibold text-olive-fonce hover:bg-olive-pale/60">
          <GlyphAdd width={18} height={18} />
          Ajouter {MEAL_AU[meal.meal]}
        </Link>
      </div>
    </details>
  );
}

function Supplements({ journal }: { journal: Journal }) {
  if (!journal.supplements.length) return null;
  const taken = journal.supplements.filter((s) => s.taken).length;
  return (
    <section aria-labelledby="supp-titre" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="supp-titre" className="text-sous-titre">
          Compléments
        </h2>
        <span className="text-[13px] font-medium text-texte-2 tabular-nums">
          {taken} / {journal.supplements.length} pris
        </span>
      </div>
      <div className="liste-groupee">
        {journal.supplements.map((s) => (
          <CheckToggle
            key={`${s.id}-${journal.date}`}
            checked={s.taken}
            action={toggleSupplement.bind(null, s.id, journal.date)}
            title={s.name}
            detail={[s.dose, s.timing].filter(Boolean).join(" · ") || null}
          />
        ))}
      </div>
    </section>
  );
}
