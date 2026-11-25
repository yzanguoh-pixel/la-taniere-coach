import Link from "next/link";
import type { UpcomingItem } from "@/lib/coach/queries";
import { fmtDay, todayIso } from "@/lib/coach/format";

/** Colonne secondaire : prochaine séance planifiée de chaque coaché. */
export function UpcomingSessions({ items, now }: { items: UpcomingItem[]; now: Date }) {
  const today = todayIso(now);
  return (
    <section aria-labelledby="seances-titre" className="liste-groupee">
      <div className="flex items-baseline gap-2 px-5 py-4">
        <h2 id="seances-titre" className="text-sous-titre">Séances à venir</h2>
        <span className="text-[17px] tabular-nums text-texte-2">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-texte-2">Aucune séance prévue. Assigne un programme pour planifier la suite.</p>
      ) : (
        items.map((u) => (
          <Link key={u.sessionId} href={`/coach/coaches/${u.clientId}`} className="flex min-h-11 items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-fond">
            <span className="flex min-w-0 flex-col">
              <strong className="truncate text-[16px] font-semibold">{u.name}</strong>
              <span className="truncate text-[15px] text-texte-2">
                Séance {u.label} · {u.sessionName}
              </span>
            </span>
            <span className={`shrink-0 text-legende tabular-nums ${u.date === today ? "font-semibold text-olive-fonce" : "text-texte-2"}`}>
              {u.date === today ? "Aujourd’hui" : fmtDay(u.date)}
            </span>
          </Link>
        ))
      )}
    </section>
  );
}
