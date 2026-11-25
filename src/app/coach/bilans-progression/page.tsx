import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/coach/UrgencyBadge";
import { SendAllButton } from "@/components/bilans-progression/coach/SendAllButton";
import { dueClients, listClientsWithLastReport, requireCoach } from "@/lib/bilans-progression/data";
import { fmtDateTime } from "@/lib/coach/format";

export const metadata: Metadata = { title: "Bilans de progression" };

/** Bilans de progression : envoi groupé du mois et liste des coachés avec leur dernier bilan. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-titre">Bilans de progression</h1>
        <p className="mt-2 text-texte-2">Calculés automatiquement à partir des séances, des pesées et du journal.</p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <ClientsList />
      </Suspense>
    </section>
  );
}

async function ClientsList() {
  const auth = await requireCoach();
  if ("error" in auth) return <p className="liste-groupee p-5 text-texte-2">{auth.error}</p>;
  const rows = await listClientsWithLastReport(auth.supabase, auth.coachId);
  const due = dueClients(rows, new Date());

  return (
    <>
      <SendAllButton due={due.length} />
      {rows.length === 0 ? (
        <p className="liste-groupee p-5 text-texte-2">Aucun coaché actif pour le moment.</p>
      ) : (
        <ul className="liste-groupee" aria-label="Coachés">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar initials={r.initials} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{r.fullName}</p>
                {r.last ? (
                  <p className="text-[15px] tabular-nums text-texte-2">
                    Dernier bilan le {fmtDateTime(r.last.sentAt)} ·{" "}
                    <span className={r.last.readAt ? "text-olive-fonce" : ""}>{r.last.readAt ? "lu" : "non lu"}</span>
                  </p>
                ) : (
                  <p className="text-[15px] text-texte-2">Aucun bilan envoyé</p>
                )}
              </div>
              <Link href={`/coach/bilans-progression/${r.id}`} className="btn-secondaire shrink-0 px-4" aria-label={`Préparer le bilan de ${r.fullName}`}>
                Préparer
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des coachés" className="flex flex-col gap-6">
      <span className="h-12 w-64 animate-pulse rounded-full bg-separateur" />
      <div className="liste-groupee h-72 animate-pulse" />
    </div>
  );
}
