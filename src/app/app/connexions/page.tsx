import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderRow } from "@/components/connexions/ProviderRow";
import { connectDevice, disconnectDevice, syncNow } from "@/lib/connexions/actions";
import { getCoacheConnexions } from "@/lib/connexions/data";
import { COACHE_PROVIDERS, kmFr, shortDateFr, syncLabel } from "@/lib/connexions/providers";

export const metadata: Metadata = { title: "Connexions" };

const STRAVA_BADGE = "visible par toi seule (règles Strava)";

async function Content() {
  const data = await getCoacheConnexions();
  const header = (
    <header>
      <p className="text-[15px] font-medium text-texte-2">Balance, montre, applis sport</p>
      <h1 className="text-titre">Connexions</h1>
    </header>
  );

  if (data.state !== "ok") {
    return (
      <section className="flex flex-col gap-6">
        {header}
        <div className="liste-groupee px-6 py-8 text-center">
          <p className="font-semibold">Connexions indisponibles</p>
          <p className="text-[15px] text-texte-2">Impossible de charger tes connexions pour le moment. Réessaie dans quelques instants.</p>
        </div>
      </section>
    );
  }

  const now = new Date();
  const detail = (key: string): string | undefined => {
    if (key === "withings") return data.counts.withings ? `${data.counts.withings} pesées` : undefined;
    if (key === "garmin") return data.counts.garmin ? `${data.counts.garmin} activités` : undefined;
    if (key === "strava") return data.counts.strava ? `${data.counts.strava} sorties` : undefined;
    return undefined;
  };

  return (
    <section className="flex flex-col gap-6">
      {header}
      <p className="text-[15px] text-texte-2">
        Démo : les connexions sont simulées et importent des données d’exemple. Withings et Garmin sont partagés avec ton coach ; Strava reste visible par toi seule.
      </p>

      <div className="liste-groupee">
        {COACHE_PROVIDERS.map((p) => {
          const s = data.integrations[p.key];
          return (
            <ProviderRow
              key={p.key}
              name={p.name}
              description={p.description}
              icon={p.icon}
              connected={s.status === "connected"}
              syncText={syncLabel(s.lastSyncAt, now)}
              confirmConnect={p.confirm}
              confirmDisconnect={p.disconnectNote}
              badge={p.privateToCoache ? STRAVA_BADGE : undefined}
              detail={detail(p.key)}
              connect={connectDevice.bind(null, p.key)}
              disconnect={disconnectDevice.bind(null, p.key)}
              sync={syncNow.bind(null, p.key)}
            />
          );
        })}
      </div>

      {data.stravaActivities.length > 0 && (
        <div>
          <h2 className="mx-1 mb-2 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">Mes sorties Strava</h2>
          <ul className="liste-groupee" aria-label={`Sorties Strava, ${STRAVA_BADGE}`}>
            {data.stravaActivities.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.type}</p>
                  <p className="text-legende text-texte-2">
                    {shortDateFr(a.date)} · {STRAVA_BADGE}
                  </p>
                </div>
                <p className="shrink-0 text-right text-[15px] tabular-nums">
                  {a.distanceKm !== null ? kmFr(a.distanceKm) : ""}
                  {a.durationMin !== null ? <span className="block text-legende text-texte-2">{a.durationMin} min</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col gap-6" aria-busy="true">
          <h1 className="text-titre">Connexions</h1>
          <div className="liste-groupee h-64 animate-pulse" />
        </section>
      }
    >
      <Content />
    </Suspense>
  );
}
