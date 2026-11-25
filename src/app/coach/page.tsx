import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { coachSupabase } from "@/lib/coach/supabase";
import { countActiveClients, getCoachedToday, getOpenFeedbacks, getUpcomingSessions, type CoachedToday } from "@/lib/coach/queries";
import { sessionHour } from "@/components/seances/ModeBadge";
import { fmtLongToday, plural } from "@/lib/coach/format";
import { FeedbackQueue } from "@/components/coach/FeedbackQueue";
import { UpcomingSessions } from "@/components/coach/UpcomingSessions";

export const metadata: Metadata = { title: "Vue d’ensemble" };

/** US19 — Tableau de bord du coach : retours à traiter triés par urgence, séances à venir. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6 md:gap-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </section>
  );
}

async function Dashboard() {
  const supabase = await coachSupabase();
  const now = new Date();
  if (!supabase) {
    return (
      <>
        <Header subtitle={fmtLongToday(now)} />
        <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : les retours ne peuvent pas être chargés.</p>
      </>
    );
  }
  const [queue, upcoming, actifs, atGym] = await Promise.all([
    getOpenFeedbacks(supabase),
    getUpcomingSessions(supabase),
    countActiveClients(supabase),
    getCoachedToday(supabase).catch(() => null),
  ]);
  return (
    <>
      <Header subtitle={`${fmtLongToday(now)} · ${plural(actifs, "coaché actif", "coachés actifs")}`} />
      {atGym && <TodayAtGym items={atGym} />}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <FeedbackQueue items={queue} now={now} />
        <aside aria-label="À venir" className="flex flex-col gap-6">
          <UpcomingSessions items={upcoming} now={now} />
        </aside>
      </div>
    </>
  );
}

/** Ligne « Aujourd’hui à la salle : 17:00 Léa · … » (séances encadrées du jour). */
function TodayAtGym({ items }: { items: CoachedToday[] }) {
  if (!items.length) return <p className="-mt-3 text-[15px] text-texte-2 md:-mt-5">Aucune séance encadrée aujourd’hui</p>;
  return (
    <p className="-mt-3 text-[15px] md:-mt-5">
      <span className="text-texte-2">Aujourd’hui à la salle : </span>
      {items.map((s, i) => (
        <span key={s.sessionId}>
          {i > 0 && <span className="text-texte-2"> · </span>}
          <Link href={`/coach/coaches/${s.clientId}`} className="inline-block whitespace-nowrap font-semibold text-olive-fonce hover:underline">
            <span className="tabular-nums">{sessionHour(s.startsAt) || "—"}</span> {s.firstName}
          </Link>
        </span>
      ))}
    </p>
  );
}

function Header({ subtitle }: { subtitle: string }) {
  return (
    <header>
      <h1 className="text-titre">Vue d’ensemble</h1>
      <p className="mt-1 text-texte-2 tabular-nums">{subtitle}</p>
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du tableau de bord" className="flex flex-col gap-6 md:gap-8">
      <header>
        <h1 className="text-titre">Vue d’ensemble</h1>
        <p className="mt-1 h-6 w-60 animate-pulse rounded-lg bg-separateur" />
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="liste-groupee h-96 animate-pulse" />
        <div className="liste-groupee h-64 animate-pulse" />
      </div>
    </div>
  );
}
