import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientDirectory, type DirectoryRow } from "@/components/programmes/library/ClientDirectory";
import { getClientDirectory, librarySupabase } from "@/lib/programmes/templates";
import { fmtDay, relativeTime } from "@/lib/coach/format";

export const metadata: Metadata = { title: "Coachés" };

/** C2 — Liste des coachés. Coque statique, données lues à la demande (cacheComponents). */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<DirectorySkeleton />}>
        <Directory />
      </Suspense>
    </section>
  );
}

async function Directory() {
  const supabase = await librarySupabase();
  if (!supabase) return <Shell sub={null}><Notice title="Données indisponibles" text="La base de données n’est pas configurée sur cet environnement." /></Shell>;

  let rows: DirectoryRow[];
  try {
    const now = new Date();
    rows = (await getClientDirectory(supabase)).map((r) => ({
      id: r.id,
      fullName: r.fullName,
      initials: r.initials,
      goal: r.goal,
      archived: r.archived,
      program: r.program,
      toRenew: r.toRenew,
      renewLabel: r.renewsOn ? fmtDay(r.renewsOn) : null,
      lastFeedback: r.lastFeedback ? { rpe: r.lastFeedback.rpe, when: relativeTime(r.lastFeedback.createdAt, now), handled: r.lastFeedback.handled } : null,
    }));
  } catch (e) {
    return <Shell sub={null}><Notice title="Impossible de charger les coachés" text={e instanceof Error ? e.message : "Réessayez dans un instant."} /></Shell>;
  }

  const active = rows.filter((r) => !r.archived).length;
  const renew = rows.filter((r) => !r.archived && r.toRenew).length;
  const sub = `${active} ${active > 1 ? "coachés actifs" : "coaché actif"}${renew ? `, ${renew} à renouveler` : ""}`;
  return (
    <Shell sub={sub}>
      <ClientDirectory rows={rows} />
    </Shell>
  );
}

function Shell({ sub, children }: { sub: string | null; children: React.ReactNode }) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-titre">Coachés</h1>
        {sub && <p className="text-texte-2 tabular-nums">{sub}</p>}
      </header>
      {children}
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="liste-groupee" role="status">
      <div className="flex flex-col gap-1 p-5">
        <strong>{title}</strong>
        <span className="text-texte-2">{text}</span>
      </div>
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <>
      <header>
        <h1 className="text-titre">Coachés</h1>
      </header>
      <div aria-busy="true" aria-label="Chargement des coachés" className="liste-groupee">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="size-11 animate-pulse rounded-full bg-separateur" />
            <span className="h-4 w-48 animate-pulse rounded bg-separateur" />
          </div>
        ))}
      </div>
    </>
  );
}
