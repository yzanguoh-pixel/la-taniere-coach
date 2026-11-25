import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportPreview } from "@/components/bilans-progression/coach/ReportPreview";
import { SendReportForm } from "@/components/bilans-progression/coach/SendReportForm";
import { buildProgressReport, defaultPeriod, reportTitle } from "@/lib/bilans-progression/compute";
import { listReports, loadReportInput, requireCoach } from "@/lib/bilans-progression/data";
import { fmtDateTime } from "@/lib/coach/format";
import { todayParis } from "@/lib/progression/compute";

export const metadata: Metadata = { title: "Préparer un bilan de progression" };

type Props = { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Aperçu du bilan calculé pour un coaché, mot du coach, envoi et historique. */
export default function Page({ params, searchParams }: Props) {
  return (
    <article className="flex flex-col gap-8">
      <Link href="/coach/bilans-progression" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-olive-fonce hover:underline">
        ← Bilans de progression
      </Link>
      <Suspense fallback={<PrepareSkeleton />}>
        <Prepare params={params} searchParams={searchParams} />
      </Suspense>
    </article>
  );
}

/** Cible de charge (clé `<exercice>_kg`, hors poids) pour la ligne « Objectif » du graphique. */

async function Prepare({ params, searchParams }: Props) {
  const { clientId } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const auth = await requireCoach();
  if ("error" in auth) return <p className="liste-groupee p-5 text-texte-2">{auth.error}</p>;
  const period = defaultPeriod(todayParis(new Date()));
  const loaded = await loadReportInput(auth.supabase, clientId, period);
  if (!loaded) notFound();
  const data = buildProgressReport(loaded.input, period);
  const history = await listReports(auth.supabase, clientId);
  const { client } = loaded;

  return (
    <>
      <header>
        <h1 className="text-titre break-words">Bilan de {client.fullName}</h1>
        <p className="mt-2 text-texte-2">Aperçu de ce que {client.firstName} verra dans sa Progression, calculé sur les 4 dernières semaines.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Aperçu du bilan" className="min-w-0 rounded-[20px] bg-fond">
          <ReportPreview data={data} title={reportTitle(period)} periodStart={period.start} periodEnd={period.end} coachName="Karim" exerciseParam={one(sp.exercice)} viewParam={one(sp.vue)} />
        </section>
        <SendReportForm clientId={client.id} firstName={client.firstName} nextFocus={data.nextFocus} />
      </div>

      <section aria-labelledby="historique-titre" className="flex flex-col gap-3">
        <h2 id="historique-titre" className="text-sous-titre">
          Bilans envoyés à {client.firstName}
        </h2>
        {history.length === 0 ? (
          <p className="liste-groupee p-5 text-texte-2">Aucun bilan envoyé pour le moment.</p>
        ) : (
          <ul className="liste-groupee">
            {history.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
                <p className="min-w-0 break-words font-medium">{r.title}</p>
                <p className="shrink-0 text-[15px] tabular-nums text-texte-2">
                  Envoyé le {fmtDateTime(r.sentAt)} · {r.readAt ? <span className="text-olive-fonce">lu le {fmtDateTime(r.readAt)}</span> : "non lu"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PrepareSkeleton() {
  return (
    <div aria-busy="true" aria-label="Calcul du bilan" className="flex flex-col gap-6">
      <span className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-separateur" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="liste-groupee h-96 animate-pulse" />
        <div className="liste-groupee h-72 animate-pulse" />
      </div>
    </div>
  );
}
