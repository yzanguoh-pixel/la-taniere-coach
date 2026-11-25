import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IntakeForm } from "@/components/decouvrir/IntakeForm";
import { getFreeSlot } from "@/lib/decouvrir/data";
import { FORMAT_LABEL, MSG_SLOT_TAKEN, isFormat, longDateOf, slotFits, timeOf } from "@/lib/decouvrir/format";

export const metadata: Metadata = { title: "Questionnaire" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** P3-Questionnaire : coordonnées et questionnaire en 2 minutes. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-texte-2">Étape 2 sur 2</p>
        <h1 className="text-titre">Faisons connaissance</h1>
        <p className="text-texte-2">Vos réponses restent entre vous et Karim.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const id = typeof sp.creneau === "string" && UUID.test(sp.creneau) ? sp.creneau : null;
  const format = isFormat(sp.format) ? sp.format : null;
  const slot = id && format ? await getFreeSlot(id) : null;

  if (!slot || !format || !slotFits(slot.format, format)) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {id ? MSG_SLOT_TAKEN : "Choisissez d’abord un créneau."}
        </p>
        <Link href={`/decouvrir/creneau${format ? `?format=${format}` : ""}`} className="btn-principal w-full">
          Choisir un créneau
        </Link>
      </div>
    );
  }

  return (
    <IntakeForm
      slot={{ id: slot.id, dateLabel: longDateOf(slot.starts_at), time: timeOf(slot.starts_at), format, formatLabel: FORMAT_LABEL[format].replace("En ", "en ") }}
    />
  );
}
