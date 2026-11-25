import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddFoodForm } from "@/components/nutrition/coache/AddFoodForm";
import { GlyphBack } from "@/components/nutrition/coache/glyphs";
import { dayLabel, todayIso } from "@/lib/coache/format";
import { getCatalog } from "@/lib/nutrition/coache/data";
import { isJournalDate, isMeal, mealForHour } from "@/lib/nutrition/coache/format";

export const metadata: Metadata = { title: "Ajouter un aliment" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** M8-Aliment : recherche d'un aliment ou d'une recette, repas, quantité avec calcul en direct. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<AddSkeleton />}>
      <AddView searchParams={searchParams} />
    </Suspense>
  );
}

function Header({ backHref, sub }: { backHref: string; sub: string }) {
  return (
    <header className="flex flex-col gap-1">
      <Link href={backHref} className="-ml-2 mb-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-olive-fonce">
        <GlyphBack width={18} height={18} />
        Journal
      </Link>
      <p className="text-[15px] font-medium text-texte-2">{sub}</p>
      <h1 className="text-titre">Ajouter un aliment</h1>
    </header>
  );
}

function AddSkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true">
      <Header backHref="/app/nutrition" sub="Journal" />
      <div className="h-12 animate-pulse rounded-xl bg-olive-pale" />
      <div className="h-64 animate-pulse rounded-[20px] bg-olive-pale" />
    </section>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parisHour(): [number, number] {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return [Number(parts.find((p) => p.type === "hour")?.value ?? 12), Number(parts.find((p) => p.type === "minute")?.value ?? 0)];
}

async function AddView({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const today = todayIso();
  const reqDate = one(sp.date);
  const date = isJournalDate(reqDate, today) ? reqDate : today;
  const repas = one(sp.repas);
  const meal = isMeal(repas) ? repas : date === today ? mealForHour(...parisHour()) : null;
  const tab = one(sp.onglet) === "recettes" ? "recipe" : "food";
  const backHref = `/app/nutrition?date=${date}`;

  const catalog = await getCatalog();
  if (!catalog) {
    return (
      <section className="flex flex-col gap-6">
        <Header backHref={backHref} sub={dayLabel(date, today)} />
        <p role="status" className="rounded-[20px] bg-beurre px-5 py-4 text-[15px] font-medium text-beurre-fonce">
          Impossible de charger les aliments pour le moment. Reconnecte-toi depuis l’accueil de la démo.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Header backHref={backHref} sub={`Journal · ${dayLabel(date, today)}`} />
      <AddFoodForm
        foods={catalog.foods}
        recipes={catalog.recipes}
        date={date}
        defaultMeal={meal}
        defaultTab={tab}
        defaultRecipeId={one(sp.recette) ?? null}
        backHref={backHref}
      />
    </section>
  );
}
