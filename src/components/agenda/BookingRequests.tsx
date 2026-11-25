import Link from "next/link";
import type { AgendaBooking } from "@/lib/agenda/queries";
import { fmtDayShort, fmtTime, formatLabel } from "@/lib/agenda/week";
import { IconChevron } from "@/components/icons";

export function IntakeBadge({ intake }: { intake: AgendaBooking["intake"] }) {
  return intake === "recu" ? (
    <span className="inline-flex shrink-0 rounded-full bg-olive-pale px-2.5 py-0.5 text-legende font-semibold text-olive-fonce">Questionnaire reçu</span>
  ) : (
    <span className="inline-flex shrink-0 rounded-full bg-beurre px-2.5 py-0.5 text-legende font-semibold text-beurre-fonce">Questionnaire en attente</span>
  );
}

/** Bloc « Demandes de bilan » : bilans offerts à venir, avec l'état du questionnaire. */
export function BookingRequests({ items }: { items: AgendaBooking[] }) {
  const pending = items.filter((b) => b.intake !== "recu").length;
  return (
    <section aria-labelledby="demandes-titre" className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 id="demandes-titre" className="text-sous-titre">
          Demandes de bilan
        </h2>
        <span className="text-[17px] tabular-nums text-texte-2">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="liste-groupee p-5 text-texte-2">Aucune demande de bilan à venir. Partage ton lien de réservation pour en recevoir.</p>
      ) : (
        <ul className="liste-groupee" aria-describedby={pending ? "demandes-attente" : undefined}>
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={`/coach/bilans/${b.id}`}
                className="flex min-h-11 items-center gap-4 px-5 py-4 transition-colors hover:bg-fond"
                aria-label={`Ouvrir le bilan de ${b.name}`}
              >
                <span className="flex w-24 shrink-0 flex-col tabular-nums sm:w-32">
                  <strong className="text-[15px] font-semibold">{b.startsAt ? fmtDayShort(b.startsAt) : "À fixer"}</strong>
                  {b.startsAt && <span className="text-legende text-texte-2">{fmtTime(b.startsAt)}</span>}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong className="truncate text-[17px] font-semibold">{b.name}</strong>
                  <span className="flex flex-wrap items-center gap-2 text-[15px] text-texte-2">
                    <span>Bilan offert · {formatLabel[b.format] ?? b.format}</span>
                    <IntakeBadge intake={b.intake} />
                  </span>
                </span>
                <IconChevron className="shrink-0 text-icone" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pending > 0 && (
        <p id="demandes-attente" className="text-legende text-texte-2">
          {pending === 1 ? "1 questionnaire n’est pas encore rempli : la synthèse sera prête dès sa réception." : `${pending} questionnaires ne sont pas encore remplis : les synthèses seront prêtes dès leur réception.`}
        </p>
      )}
    </section>
  );
}
