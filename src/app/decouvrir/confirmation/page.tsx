import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconAgenda } from "@/components/icons";
import { getPublicConfig, readConfirmation } from "@/lib/decouvrir/data";
import { FORMAT_LABEL, longDateOf, timeOf } from "@/lib/decouvrir/format";

export const metadata: Metadata = { title: "Rendez-vous confirmé" };

/** P4-Confirmation : date, heure, format, rappel du lien visio ou de l'adresse. */
export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" />}>
      <Confirmation />
    </Suspense>
  );
}

async function Confirmation() {
  const c = await readConfirmation();
  if (!c) {
    return (
      <section className="flex flex-col gap-5">
        <h1 className="text-titre">Aucune réservation en cours</h1>
        <p className="text-texte-2">Choisissez un créneau pour réserver votre bilan offert.</p>
        <Link href="/decouvrir/creneau" className="btn-principal w-full">
          Réserver mon bilan offert
        </Link>
      </section>
    );
  }
  const { adresse, lienVisio } = await getPublicConfig();
  const visio = c.format === "visio";

  return (
    <section className="flex flex-col gap-6" aria-labelledby="titre">
      <header className="flex flex-col gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-olive-pale text-olive-fonce">
          <IconAgenda width={28} height={28} />
        </span>
        <h1 id="titre" className="text-titre">
          C’est réservé, {c.firstName}
        </h1>
        <p className="text-texte-2" role="status">
          Votre bilan offert avec Karim est confirmé.
        </p>
      </header>

      <dl className="liste-groupee">
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-texte-2">Date</dt>
          <dd className="text-right font-semibold">{longDateOf(c.startsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-texte-2">Heure</dt>
          <dd className="text-right font-semibold tabular-nums">
            {timeOf(c.startsAt)} – {timeOf(c.endsAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-texte-2">Format</dt>
          <dd className="text-right font-semibold">{FORMAT_LABEL[c.format]}</dd>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <dt className="text-texte-2">{visio ? "Lien de la visio" : "Adresse"}</dt>
          <dd className="font-semibold break-words">
            {visio ? (
              lienVisio ? (
                <a href={lienVisio} className="text-olive-fonce underline underline-offset-2">
                  {lienVisio}
                </a>
              ) : (
                <>Karim vous envoie le lien par SMS au <span className="tabular-nums">{c.phone}</span> avant le rendez-vous.</>
              )
            ) : (
              adresse ?? "[ADRESSE]"
            )}
          </dd>
        </div>
      </dl>

      {!c.intakeSent && (
        <p role="alert" className="rounded-[16px] bg-beurre px-4 py-3 text-[15px] font-medium text-beurre-fonce">
          Votre créneau est réservé, mais le questionnaire n’a pas pu être envoyé. Karim vous posera les questions pendant le bilan.
        </p>
      )}

      <p className="text-[15px] text-texte-2">
        Un empêchement ? Répondez simplement au SMS de confirmation de Karim pour déplacer le rendez-vous.
      </p>

      <Link href="/decouvrir" className="btn-secondaire w-full">
        Retour à l’accueil
      </Link>
    </section>
  );
}
