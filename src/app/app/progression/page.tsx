import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AssiduiteChart } from "@/components/progression/AssiduiteChart";
import { ChargeChart } from "@/components/progression/ChargeChart";
import { IconProgression, IconSeance } from "@/components/icons";
import { attendance, currentStreak, kgLabel, kgNumber, pickReference, records, shortDate, todayParis, weeklyLoads } from "@/lib/progression/compute";
import { getProgression } from "@/lib/progression/data";

export const metadata: Metadata = { title: "Ma progression" };

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mx-1 mb-2 mt-7 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">
      {children}
    </h2>
  );
}

function Empty({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="liste-groupee flex flex-col items-center gap-2 px-6 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-olive-pale text-olive-fonce">
        <IconProgression width={22} height={22} />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="text-[15px] text-texte-2">{children}</p>
      {action}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col gap-6" aria-busy="true">
          <header>
            <h1 className="text-titre">Ma progression</h1>
          </header>
          <div className="h-64 animate-pulse rounded-[20px] bg-olive-pale" />
        </section>
      }
    >
      <ProgressionContent />
    </Suspense>
  );
}

async function ProgressionContent() {
  const data = await getProgression();
  const header = (
    <header>
      <p className="text-[15px] font-medium text-texte-2">Tes charges, ta régularité, tes records</p>
      <h1 className="text-titre">Ma progression</h1>
    </header>
  );

  if (data.state !== "ok") {
    return (
      <section className="flex flex-col gap-6">
        {header}
        <Empty title="Progression indisponible">Impossible de charger tes données pour le moment. Réessaie dans quelques instants.</Empty>
      </section>
    );
  }

  const today = todayParis();
  const { sessions, coachFirstName } = data;
  const doneCount = sessions.filter((s) => s.status === "done").length;

  if (doneCount === 0) {
    return (
      <section className="flex flex-col gap-6">
        {header}
        <Empty
          title="Pas encore de séance terminée"
          action={
            <Link href="/app" className="btn-principal mt-3">
              <IconSeance width={20} height={20} />
              Voir ma prochaine séance
            </Link>
          }
        >
          Termine ta première séance et envoie ton retour à {coachFirstName} : ta courbe de charge, ton assiduité et tes records apparaîtront ici.
        </Empty>
      </section>
    );
  }

  const ref = pickReference(data.targets, sessions);
  const points = ref ? weeklyLoads(sessions, ref.exerciseId) : [];
  const weeks = attendance(sessions, today);
  const streak = currentStreak(sessions, today);
  const recs = records(sessions, ref?.exerciseId ?? null);

  const current = points.at(-1)?.kg ?? null;
  const start = points[0]?.kg ?? null;
  const target = ref?.targetKg ?? null;
  const pct = current != null && target ? Math.min(100, Math.round((current / target) * 100)) : null;
  const gain = current != null && start != null ? current - start : 0;

  const shownDue = weeks.reduce((t, w) => t + w.due, 0);
  const shownDone = weeks.reduce((t, w) => t + w.done, 0);
  const rate = shownDue ? Math.round((shownDone / shownDue) * 100) : null;

  return (
    <section className="flex flex-col">
      {header}

      {/* Charge de référence */}
      <SectionTitle id="charge">{ref ? `Charge au ${ref.name.toLowerCase()}` : "Charge"}</SectionTitle>
      {ref && points.length && current != null ? (
        <section aria-labelledby="charge" className="liste-groupee p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">{target != null ? `Objectif : ${kgLabel(target)}` : "Ta charge actuelle"}</p>
            <p className="whitespace-nowrap text-[22px] font-bold tabular-nums">
              {kgNumber(current)}
              <span className="text-legende font-semibold text-texte-2">{target != null ? ` / ${kgLabel(target)}` : " kg"}</span>
            </p>
          </div>
          {pct != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-separateur" role="progressbar" aria-label={`Progression vers l’objectif ${ref.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full rounded-full bg-olive-fonce" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="mt-2 text-[15px] text-texte-2 tabular-nums">
            {gain > 0 ? `+${kgLabel(gain)} en ${points.length} semaine${points.length > 1 ? "s" : ""}` : points.length > 1 ? `Stable sur ${points.length} semaines` : "Première semaine enregistrée"}
            {target != null ? (current >= target ? " · Objectif atteint, bravo !" : ` · encore ${kgLabel(Math.round((target - current) * 100) / 100)} à gagner`) : ""}
          </p>
          <div className="mt-4">
            <ChargeChart points={points} targetKg={target} exerciseName={ref.name} />
          </div>
          {!ref.fromTarget && <p className="mt-2 text-legende text-texte-2">Exercice le plus fréquent de ton programme. {coachFirstName} n’a pas encore fixé d’objectif de charge.</p>}
        </section>
      ) : (
        <Empty title="Pas encore de charge enregistrée">Tes séances terminées ne comportent pas encore de série chargée. La courbe apparaîtra dès ta première série avec une charge.</Empty>
      )}

      {/* Assiduité */}
      <SectionTitle id="assiduite">Assiduité</SectionTitle>
      <section aria-labelledby="assiduite" className="liste-groupee p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-olive-pale px-4 py-3">
            <p className="text-legende font-medium text-olive-fonce">Série en cours</p>
            <p className="text-[22px] font-bold tabular-nums text-olive-fonce">
              {streak} <span className="text-[15px] font-semibold">semaine{streak > 1 ? "s" : ""}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-fond px-4 py-3">
            <p className="text-legende font-medium text-texte-2">Séances faites</p>
            <p className="text-[22px] font-bold tabular-nums">
              {shownDone}
              <span className="text-[15px] font-semibold text-texte-2"> / {shownDue}</span>
            </p>
          </div>
        </div>
        <p className="mt-3 text-[15px] text-texte-2 tabular-nums">
          {rate != null ? `${rate} % des séances prévues à ce jour sur les ${weeks.length} dernières semaines.` : "Aucune séance prévue sur la période."}
          {streak > 0 ? " Toutes tes séances faites, semaine après semaine : continue !" : ""}
        </p>
        <div className="mt-4">
          <AssiduiteChart weeks={weeks} />
        </div>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-legende text-texte-2">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-olive-fonce" />Faites</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-olive-pale" />Prévues</span>
        </p>
      </section>

      {/* Records */}
      <SectionTitle id="records">Records</SectionTitle>
      {recs.length ? (
        <ul aria-labelledby="records" className="liste-groupee">
          {recs.map((r) => (
            <li key={r.exerciseId} className="flex min-h-14 items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="font-semibold [overflow-wrap:anywhere]">{r.name}</p>
                <p className="text-legende text-texte-2 tabular-nums">
                  {`Le ${shortDate(r.date)}`}
                  {r.bestKg > r.firstKg ? ` · +${kgLabel(r.bestKg - r.firstKg)} depuis le début` : ""}
                </p>
              </div>
              <p className="whitespace-nowrap text-[17px] font-bold tabular-nums">{kgLabel(r.bestKg)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Pas encore de record">Tes records apparaîtront dès qu’une série chargée sera cochée dans une séance terminée.</Empty>
      )}
    </section>
  );
}
