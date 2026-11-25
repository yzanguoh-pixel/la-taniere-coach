import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SlotPicker } from "@/components/decouvrir/SlotPicker";
import { getFreeSlots } from "@/lib/decouvrir/data";
import { MSG_SLOT_TAKEN, isFormat } from "@/lib/decouvrir/format";

export const metadata: Metadata = { title: "Choisir un créneau" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** P2-Creneau : format visio ou salle, jours et horaires libres. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/decouvrir" className="text-[15px] font-medium text-olive-fonce">
          Retour
        </Link>
        <p className="text-[15px] font-medium text-texte-2">Étape 1 sur 2</p>
        <h1 className="text-titre">Choisissez votre créneau</h1>
        <p className="text-texte-2">Bilan offert de 45 minutes avec Karim.</p>
      </header>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" />}>
        <Slots searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Slots({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { slots, days, error } = await getFreeSlots();
  const format = isFormat(sp.format) ? sp.format : "visio";
  return (
    <>
      {sp.pris === "1" && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {MSG_SLOT_TAKEN}
        </p>
      )}
      {error ? (
        <p role="alert" className="liste-groupee p-4 text-texte-2">
          Les créneaux ne peuvent pas être chargés pour le moment. Réessayez dans quelques minutes.
        </p>
      ) : (
        <SlotPicker slots={slots} days={days} initialFormat={format} />
      )}
    </>
  );
}
