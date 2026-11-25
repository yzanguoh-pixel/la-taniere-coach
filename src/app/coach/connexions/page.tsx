import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ProviderRow } from "@/components/connexions/ProviderRow";
import { ResetDemo } from "@/components/demo/ResetDemo";
import { connectCoachService, disconnectCoachService, syncNow } from "@/lib/connexions/actions";
import { getCoachConnexions, type IntegrationState } from "@/lib/connexions/data";
import { COACH_SECTIONS, syncLabel } from "@/lib/connexions/providers";

export const metadata: Metadata = { title: "Connexions et réglages" };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mx-1 mb-2 mt-2 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">{children}</h2>;
}

function DeviceStatus({ label, s, now }: { label: string; s: IntegrationState; now: Date }) {
  const on = s.status === "connected";
  return (
    <p className="text-legende tabular-nums">
      <span className={on ? "font-semibold text-olive-fonce" : "text-texte-2"}>
        {label} : {on ? "connecté" : "non connecté"}
      </span>
      {on && <span className="text-texte-2"> · {syncLabel(s.lastSyncAt, now)}</span>}
    </p>
  );
}

async function Content() {
  const data = await getCoachConnexions();
  const header = (
    <header>
      <p className="text-[15px] font-medium text-texte-2">Agenda, objets connectés, paiement, notifications</p>
      <h1 className="text-titre">Connexions et réglages</h1>
    </header>
  );

  if (data.state !== "ok") {
    return (
      <section className="flex max-w-3xl flex-col gap-6">
        {header}
        <div className="liste-groupee px-6 py-8 text-center">
          <p className="font-semibold">Connexions indisponibles</p>
          <p className="text-[15px] text-texte-2">Impossible de charger tes connexions pour le moment. Réessaie dans quelques instants.</p>
        </div>
      </section>
    );
  }

  const now = new Date();
  const [agenda, ...others] = COACH_SECTIONS;
  const renderSection = (section: (typeof COACH_SECTIONS)[number]) => (
    <div key={section.title}>
      <SectionTitle>{section.title}</SectionTitle>
      <div className="liste-groupee">
        {section.providers.map((p) => {
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
              connect={connectCoachService.bind(null, p.key)}
              disconnect={disconnectCoachService.bind(null, p.key)}
              sync={syncNow.bind(null, p.key)}
            />
          );
        })}
      </div>
    </div>
  );

  const connectedCount = data.coached.filter((c) => c.devices.withings.status === "connected" || c.devices.garmin.status === "connected").length;

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      {header}
      <p className="text-[15px] text-texte-2">Démo : toutes les connexions sont simulées, aucun service externe n’est contacté.</p>

      {renderSection(agenda)}

      <div>
        <SectionTitle>Objets connectés des coachés</SectionTitle>
        <p className="mx-1 mb-2 text-[15px] text-texte-2">
          Withings (pesées) et Garmin (activités), quand le coaché les connecte depuis son appli. Strava n’est jamais partagé avec le coach (règles Strava).
        </p>
        {data.coached.length === 0 ? (
          <div className="liste-groupee px-6 py-6 text-center text-[15px] text-texte-2">Aucun coaché pour le moment.</div>
        ) : (
          <ul className="liste-groupee" aria-label={`Objets connectés : ${connectedCount} coaché${connectedCount > 1 ? "s" : ""} connecté${connectedCount > 1 ? "s" : ""}`}>
            {data.coached.map((c) => (
              <li key={c.clientId}>
                <Link href={`/coach/coaches/${c.clientId}`} className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-fond">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.name}</p>
                    <DeviceStatus label="Withings" s={c.devices.withings} now={now} />
                    <DeviceStatus label="Garmin" s={c.devices.garmin} now={now} />
                  </div>
                  <span className="shrink-0 text-legende font-semibold text-olive-fonce">Voir la fiche</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {others.map(renderSection)}

      <div>
        <SectionTitle>Réglages</SectionTitle>
        <div className="liste-groupee">
          <ResetDemo />
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col gap-6" aria-busy="true">
          <h1 className="text-titre">Connexions et réglages</h1>
          <div className="liste-groupee h-64 animate-pulse" />
        </section>
      }
    >
      <Content />
    </Suspense>
  );
}
