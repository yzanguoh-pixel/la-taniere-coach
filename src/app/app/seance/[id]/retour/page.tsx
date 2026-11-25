import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconChevron } from "@/components/icons";
import { FeedbackForm } from "@/components/coache/FeedbackForm";
import { getMe, getSession } from "@/lib/coache/data";
import { sessionTitle } from "@/lib/coache/format";

export const metadata: Metadata = { title: "Retour de séance" };

type Params = Promise<{ id: string }>;

/** M3-Retour : RPE 1 à 10, ressenti, zone de douleur si « Douleur », mot facultatif pour le coach. */
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" />}>
      <Retour params={params} />
    </Suspense>
  );
}

async function Retour({ params }: { params: Params }) {
  const { id } = await params;
  const [s, me] = await Promise.all([getSession(id), getMe()]);
  if (!s) notFound();
  const coach = me?.coachFirstName ?? "ton coach";
  const back = `/app/seance/${s.id}`;

  return (
    <section className="flex flex-col gap-6">
      <Link href={back} className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 text-[15px] font-semibold text-olive-fonce">
        <IconChevron width={18} height={18} className="rotate-180" />
        Retour à la séance
      </Link>
      <header>
        <p className="text-[15px] font-medium text-texte-2">Terminer la séance</p>
        <h1 className="text-titre">{sessionTitle(s)}</h1>
      </header>

      {s.feedback ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-[20px] bg-olive-pale px-5 py-4 text-[15px] font-semibold text-olive-fonce">
            Retour déjà envoyé.
          </p>
          <Link href="/app" className="btn-secondaire">
            Revenir à l’accueil
          </Link>
        </div>
      ) : (
        <FeedbackForm sessionId={s.id} coachName={coach} sessionHref={back} />
      )}
    </section>
  );
}
