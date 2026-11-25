import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconChevron, IconNutrition, IconProgression, IconSeance } from "@/components/icons";
import { getCurrentLoad, getMe, getNextSession } from "@/lib/coache/data";
import { dayLabel, estimateMinutes, formatKg, keyLoad, longDate, sessionTitle, todayIso, toNumber } from "@/lib/coache/format";

export const metadata: Metadata = { title: "Aujourd’hui" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** M1-Accueil : séance du jour ou prochaine séance, raccourcis Nutrition et Suivi. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <Today searchParams={searchParams} />
    </Suspense>
  );
}

function TodaySkeleton() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true">
      <header>
        <div className="h-5 w-40 animate-pulse rounded bg-olive-pale" />
        <h1 className="text-titre">Bonjour</h1>
      </header>
      <div className="h-72 animate-pulse rounded-[24px] bg-olive-pale" />
    </section>
  );
}

async function Today({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const me = await getMe();
  const today = todayIso();
  const sent = sp.retour === "envoye";

  if (!me) {
    return (
      <section className="flex flex-col gap-6">
        <header>
          <p className="text-[15px] font-medium text-texte-2">{longDate(today)}</p>
          <h1 className="text-titre">Bonjour</h1>
        </header>
        <p role="status" className="rounded-[20px] bg-beurre px-5 py-4 text-[15px] font-medium text-beurre-fonce">
          Impossible de charger ton espace pour le moment. Reconnecte-toi depuis l’accueil de la démo.
        </p>
      </section>
    );
  }

  const next = await getNextSession(me.clientId);
  const squatTarget = toNumber(me.targets.squat_kg as number | string | undefined);
  const squatNow = squatTarget != null ? await getCurrentLoad(me.clientId, "Squat barre") : null;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-[15px] font-medium text-texte-2">{longDate(today)}</p>
        <h1 className="text-titre">Bonjour {me.firstName}</h1>
      </header>

      {sent && (
        <p role="status" className="rounded-[20px] bg-olive-pale px-5 py-4 text-[15px] font-semibold text-olive-fonce">
          Merci, ton retour a été envoyé à {me.coachFirstName}.
        </p>
      )}

      {next ? <NextSessionCard session={next} today={today} /> : <NoSessionCard coach={me.coachFirstName} />}

      <nav aria-label="Raccourcis" className="grid grid-cols-2 gap-3">
        <Link href="/app/nutrition" className="flex min-h-36 flex-col gap-2 rounded-[20px] bg-carte p-4 shadow-legere transition-colors hover:bg-olive-pale/40">
          <span className="grid size-10 place-items-center rounded-xl bg-olive-pale text-olive-fonce">
            <IconNutrition width={20} height={20} />
          </span>
          <span className="mt-auto text-[17px] font-semibold">Nutrition</span>
          <span className="text-legende text-texte-2">Ton journal du jour</span>
        </Link>
        <Link href="/app/progression" className="flex min-h-36 flex-col gap-2 rounded-[20px] bg-carte p-4 shadow-legere transition-colors hover:bg-olive-pale/40">
          <span className="grid size-10 place-items-center rounded-xl bg-olive-pale text-olive-fonce">
            <IconProgression width={20} height={20} />
          </span>
          <span className="mt-auto text-[17px] font-semibold">Suivi</span>
          {squatTarget != null && squatNow != null ? (
            <>
              <span className="text-[22px] font-bold tabular-nums">
                {squatNow.toLocaleString("fr-FR")} <span className="text-[15px] font-medium text-texte-2">/ {formatKg(squatTarget)}</span>
              </span>
              <span className="text-legende text-texte-2">Squat barre</span>
              <span
                role="progressbar"
                aria-label="Progression vers l’objectif Squat barre"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round((squatNow / squatTarget) * 100))}
                className="block h-1.5 overflow-hidden rounded-full bg-separateur"
              >
                <span className="block h-full rounded-full bg-olive-fonce" style={{ width: `${Math.min(100, Math.round((squatNow / squatTarget) * 100))}%` }} />
              </span>
            </>
          ) : (
            <span className="text-legende text-texte-2">Ta progression</span>
          )}
        </Link>
      </nav>
    </section>
  );
}

function NextSessionCard({ session, today }: { session: NonNullable<Awaited<ReturnType<typeof getNextSession>>>; today: string }) {
  const n = session.exercises.length;
  const minutes = estimateMinutes(session.exercises);
  const key = keyLoad(session.exercises);
  const isToday = session.date === today;
  return (
    <section aria-labelledby="next-title" className="flex flex-col gap-4 rounded-[24px] bg-olive p-5 text-texte">
      <p className="flex items-center gap-2 text-legende font-semibold uppercase tracking-[0.04em]">
        <IconSeance width={16} height={16} />
        {isToday ? "Ta séance du jour" : "Ta prochaine séance"}
      </p>
      <div>
        <h2 id="next-title" className="text-[28px] font-bold leading-tight tracking-[-0.02em]">
          {sessionTitle(session)}
        </h2>
        <p className="mt-1 text-[15px] font-medium">
          {dayLabel(session.date, today)}
          {session.programName ? ` · ${session.programName}` : ""}
        </p>
      </div>
      <dl className="grid grid-cols-3 overflow-hidden rounded-[16px] bg-carte/40">
        <div className="flex flex-col-reverse gap-0.5 p-3">
          <dt className="text-legende">{n > 1 ? "exercices" : "exercice"}</dt>
          <dd className="text-[20px] font-bold tabular-nums">{n}</dd>
        </div>
        <div className="flex flex-col-reverse gap-0.5 border-x border-olive p-3">
          <dt className="text-legende">durée</dt>
          <dd className="text-[20px] font-bold tabular-nums">{minutes ? `≈ ${minutes} min` : "—"}</dd>
        </div>
        <div className="flex min-w-0 flex-col-reverse gap-0.5 p-3">
          <dt className="truncate text-legende" title={key?.name}>
            {key ? key.name : "poids du corps"}
          </dt>
          <dd className="text-[20px] font-bold tabular-nums">{key ? formatKg(key.kg) : "—"}</dd>
        </div>
      </dl>
      <Link href={`/app/seance/${session.id}`} className="btn-principal w-full">
        Voir ma séance
        <IconChevron width={18} height={18} />
      </Link>
    </section>
  );
}

function NoSessionCard({ coach }: { coach: string }) {
  return (
    <section className="rounded-[24px] bg-carte p-5 shadow-legere">
      <p className="flex items-center gap-2 text-legende font-semibold uppercase tracking-[0.04em] text-texte-2">
        <IconSeance width={16} height={16} />
        Ta prochaine séance
      </p>
      <p className="mt-2 text-sous-titre">Aucune séance planifiée</p>
      <p className="mt-1 text-texte-2">{coach} te prépare la suite. Tu la trouveras ici.</p>
    </section>
  );
}
