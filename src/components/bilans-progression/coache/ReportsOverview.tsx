import Link from "next/link";
import type { ReportSummary } from "@/lib/bilans-progression/coache/data";
import { periodLabel, sentDate } from "@/lib/bilans-progression/coache/format";
import { IconBilan, IconChevron } from "@/components/icons";

/** Encarts de la page « Ma progression » : nouveau bilan mis en avant + liste « Mes bilans ». */

const href = (id: string) => `/app/progression/bilans/${id}`;

/** Carte mise en avant pour le bilan non lu le plus récent (rien si tout est lu). */
export function NewReportCard({ reports, coachFirstName }: { reports: ReportSummary[]; coachFirstName: string }) {
  const unread = reports.find((r) => r.readAt === null);
  if (!unread) return null;
  return (
    <Link
      href={href(unread.id)}
      className="mt-5 flex min-h-11 items-center gap-4 rounded-[20px] bg-olive-pale p-4 text-olive-fonce shadow-legere outline-offset-2 transition-transform active:scale-[0.99]"
    >
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-carte">
        <IconBilan width={22} height={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{`Nouveau bilan de ${coachFirstName}`}</span>
        <span className="block text-[15px] text-texte [overflow-wrap:anywhere]">{`Bilan ${periodLabel(unread.periodStart, unread.periodEnd)}`}</span>
        <span className="mt-0.5 block text-[15px] font-semibold underline underline-offset-2">Ouvrir le bilan</span>
      </span>
      <IconChevron width={20} height={20} aria-hidden="true" className="shrink-0" />
    </Link>
  );
}

/** Section « Mes bilans ». */
export function MyReports({ reports, unavailable = false }: { reports: ReportSummary[]; unavailable?: boolean }) {
  return (
    <>
      <h2 id="mes-bilans" className="mx-1 mb-2 mt-7 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">
        Mes bilans
      </h2>
      {unavailable ? (
        <p className="liste-groupee p-5 text-[15px] text-texte-2">Tes bilans n’ont pas pu être chargés. Réessaie dans quelques instants.</p>
      ) : reports.length === 0 ? (
        <p className="liste-groupee p-5 text-[15px] text-texte-2">Ton coach t’enverra ici ton bilan de progression.</p>
      ) : (
        <ul aria-labelledby="mes-bilans" className="liste-groupee m-0 list-none p-0">
          {reports.map((r) => {
            const sent = sentDate(r.sentAt, "short");
            const isNew = r.readAt === null;
            return (
              <li key={r.id}>
                <Link href={href(r.id)} className="flex min-h-14 items-center gap-3 px-5 py-3 outline-offset-[-2px] hover:bg-fond">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold [overflow-wrap:anywhere]">{r.title}</span>
                    <span className="block text-legende text-texte-2 tabular-nums">
                      {`${periodLabel(r.periodStart, r.periodEnd)}${sent ? ` · envoyé le ${sent}` : ""}`}
                    </span>
                  </span>
                  {isNew && <span className="shrink-0 rounded-full bg-olive-fonce px-2 py-0.5 text-[11px] font-semibold text-white">Nouveau</span>}
                  <IconChevron width={18} height={18} aria-hidden="true" className="shrink-0 text-icone" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
