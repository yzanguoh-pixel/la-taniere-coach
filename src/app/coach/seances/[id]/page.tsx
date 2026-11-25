import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModeBadge } from "@/components/seances/ModeBadge";
import { ExerciseCard } from "@/components/coach/seance/ExerciseCard";
import { FinishForm } from "@/components/coach/seance/FinishForm";
import { getCoachSession } from "@/lib/coach/seance/data";
import { FEELING_LABELS, longDate, type Feeling } from "@/lib/coache/format";

export const metadata: Metadata = { title: "Séance" };

type Params = Promise<{ id: string }>;

/**
 * Séance d'un coaché côté coach : Karim la complète lui-même pendant une séance encadrée à la salle
 * (ou corrige une séance en autonomie), puis la termine avec son compte rendu.
 */
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" aria-label="Chargement de la séance" />}>
      <Seance params={params} />
    </Suspense>
  );
}

const STATUS: Record<string, { label: string; tone: string }> = {
  planned: { label: "À faire", tone: "bg-separateur text-texte-2" },
  done: { label: "Faite", tone: "bg-olive-pale text-olive-fonce" },
  skipped: { label: "Sautée", tone: "bg-peche text-peche-fonce" },
};

async function Seance({ params }: { params: Params }) {
  const { id } = await params;
  const s = await getCoachSession(id);
  if (!s) notFound();

  const sets = s.exercises.flatMap((e) => e.sets);
  const doneCount = sets.filter((x) => x.done).length;
  const pct = sets.length ? Math.round((doneCount / sets.length) * 100) : 0;
  const status = STATUS[s.status] ?? { label: s.status, tone: "bg-separateur text-texte-2" };
  const isDone = s.status === "done";

  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <Link href={`/coach/coaches/${s.clientId}`} className="-ml-1 inline-flex min-h-11 w-fit items-center text-[15px] font-semibold text-olive-fonce hover:underline">
        ← Fiche de {s.clientFirstName}
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-titre">
          Séance {s.label} · {s.name}
        </h1>
        <p className="text-[17px]">
          <Link href={`/coach/coaches/${s.clientId}`} className="font-semibold text-olive-fonce hover:underline">
            {s.clientFullName}
          </Link>
          <span className="text-texte-2"> · {longDate(s.date)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={s.mode} startsAt={s.starts_at} compact />
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-legende font-semibold ${status.tone}`}>{status.label}</span>
        </div>
      </header>

      {s.mode === "solo" && (
        <p role="note" className="rounded-[16px] bg-beurre px-4 py-3 text-[15px] font-medium text-beurre-fonce">
          Séance en autonomie : normalement remplie par {s.clientFirstName}. Tu peux corriger les séries si besoin.
        </p>
      )}

      <div className="rounded-[20px] bg-carte p-4 shadow-legere">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[15px] font-semibold">Séries validées</span>
          <span className="text-[15px] font-semibold tabular-nums">
            {doneCount} / {sets.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Séries validées"
          aria-valuemin={0}
          aria-valuemax={sets.length}
          aria-valuenow={doneCount}
          className="h-2 overflow-hidden rounded-full bg-separateur"
        >
          <div className="h-full rounded-full bg-olive-fonce transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {s.feedback && (
        <div className="rounded-[20px] bg-olive-pale p-4 text-olive-fonce">
          <p className="font-semibold">Retour de séance{s.feedback.handled_at ? " · traité" : " · à traiter"}</p>
          <p className="mt-1 text-[15px] tabular-nums">
            RPE {s.feedback.rpe}/10 · {FEELING_LABELS[s.feedback.feeling as Feeling] ?? s.feedback.feeling}
            {s.feedback.pain_zone ? ` · douleur : ${s.feedback.pain_zone}` : ""}
          </p>
          {s.feedback.note && <p className="mt-1 text-[15px]">« {s.feedback.note} »</p>}
        </div>
      )}

      {s.exercises.length ? (
        <ol className="flex flex-col gap-6">
          {s.exercises.map((ex, i) => (
            <ExerciseCard key={ex.id} sessionId={s.id} index={i} exercise={ex} />
          ))}
        </ol>
      ) : (
        <p className="liste-groupee p-5 text-texte-2">Aucun exercice dans cette séance.</p>
      )}

      <FinishForm sessionId={s.id} clientFirstName={s.clientFirstName} remaining={sets.length - doneCount} done={isDone} initial={s.feedback} />
    </article>
  );
}
