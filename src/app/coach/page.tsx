import type { Metadata } from "next";
import { Suspense } from "react";
import { coachSupabase } from "@/lib/coach/supabase";
import { countActiveClients, getOpenFeedbacks, getUpcomingSessions } from "@/lib/coach/queries";
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
  const [queue, upcoming, actifs] = await Promise.all([getOpenFeedbacks(supabase), getUpcomingSessions(supabase), countActiveClients(supabase)]);
  return (
    <>
      <Header subtitle={`${fmtLongToday(now)} · ${plural(actifs, "coaché actif", "coachés actifs")}`} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <FeedbackQueue items={queue} now={now} />
        <aside aria-label="À venir" className="flex flex-col gap-6">
          <UpcomingSessions items={upcoming} now={now} />
        </aside>
      </div>
    </>
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
