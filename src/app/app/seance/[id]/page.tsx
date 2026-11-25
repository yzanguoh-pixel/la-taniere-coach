import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconChevron } from "@/components/icons";
import { SetRow } from "@/components/coache/SetRow";
import { ModeBadge } from "@/components/seances/ModeBadge";
import { getMe, getSession } from "@/lib/coache/data";
import { FEELING_LABELS, dayLabel, estimateMinutes, isTimed, plural, sessionTitle, type Feeling } from "@/lib/coache/format";

export const metadata: Metadata = { title: "Séance" };

type Params = Promise<{ id: string }>;

/** M2-Seance : exercices dans l'ordre, séries à valider une par une, puis « Terminer la séance ». */
export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-olive-pale" aria-busy="true" />}>
      <Session params={params} />
    </Suspense>
  );
}

async function Session({ params }: { params: Params }) {
  const { id } = await params;
  const [s, me] = await Promise.all([getSession(id), getMe()]);
  if (!s) notFound();

  const sets = s.exercises.flatMap((e) => e.sets);
  const doneCount = sets.filter((x) => x.done).length;
  const pct = sets.length ? Math.round((doneCount / sets.length) * 100) : 0;
  const minutes = estimateMinutes(s.exercises);
  const editable = s.status === "planned" && !s.feedback;

  return (
    <section className="flex flex-col gap-6">
      <Link href="/app" className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 text-[15px] font-semibold text-olive-fonce">
        <IconChevron width={18} height={18} className="rotate-180" />
        Aujourd’hui
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-texte-2">
          {s.programName} · semaine {s.week} · {dayLabel(s.date)}
        </p>
        <h1 className="text-titre">{sessionTitle(s)}</h1>
        <div className="mt-1 flex">
          <ModeBadge mode={s.mode} startsAt={s.starts_at} coach={me?.coachFirstName} />
        </div>
        <p className="text-texte-2 tabular-nums">
          {plural(s.exercises.length, "exercice")}
          {minutes ? ` · ≈ ${minutes} min` : ""}
        </p>
        {s.adaptations.length > 0 && (
          <ul aria-label="Adaptations faites pour toi" className="mt-2 flex flex-wrap gap-2">
            {s.adaptations.map((a) => (
              <li key={a} className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">
                {a}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="rounded-[20px] bg-carte p-4 shadow-legere">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[15px] font-semibold">Progression</span>
          <span className="text-[15px] font-semibold tabular-nums">
            {doneCount} / {plural(sets.length, "série")}
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
        <div role="status" className="rounded-[20px] bg-olive-pale p-4 text-olive-fonce">
          <p className="font-semibold">Séance terminée · retour envoyé</p>
          <p className="mt-1 text-[15px] tabular-nums">
            RPE {s.feedback.rpe}/10 · {FEELING_LABELS[s.feedback.feeling as Feeling] ?? s.feedback.feeling}
            {s.feedback.pain_zone ? ` · douleur : ${s.feedback.pain_zone}` : ""}
          </p>
          {s.feedback.note && <p className="mt-1 text-[15px]">« {s.feedback.note} »</p>}
        </div>
      )}

      <ol className="flex flex-col gap-5">
        {s.exercises.map((ex, i) => {
          const timed = isTimed(ex.category);
          const exDone = ex.sets.filter((x) => x.done).length;
          return (
            <li key={ex.id} aria-labelledby={`ex-${ex.id}`}>
              <div className="mb-2 px-1">
                <h2 id={`ex-${ex.id}`} className="flex items-baseline justify-between gap-3 text-sous-titre">
                  <span>
                    <span className="text-texte-2 tabular-nums">{i + 1}. </span>
                    {ex.name}
                  </span>
                  <span className="shrink-0 text-legende font-medium text-texte-2 tabular-nums">
                    {exDone}/{ex.sets.length}
                  </span>
                </h2>
                {ex.consigne && <p className="mt-1 text-[15px] text-texte-2">{ex.consigne}</p>}
                {ex.rest_s ? <p className="mt-0.5 text-legende text-texte-2 tabular-nums">Repos {formatRest(ex.rest_s)}</p> : null}
              </div>
              <ul className="liste-groupee">
                {ex.sets.map((set) => (
                  <SetRow key={set.id} set={set} sessionId={s.id} timed={timed} editable={editable} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {!s.feedback && (
        <div className="sticky bottom-24 z-[5]">
          <Link href={`/app/seance/${s.id}/retour`} className="btn-principal w-full shadow-flottante">
            Terminer la séance
          </Link>
        </div>
      )}
    </section>
  );
}

function formatRest(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m} min ${r}` : `${m} min`;
}
