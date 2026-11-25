import Link from "next/link";
import type { QueueItem } from "@/lib/coach/queries";
import { relativeTime } from "@/lib/coach/format";
import { IconChevron } from "@/components/icons";
import { Avatar, RpeChip, UrgencyBadge } from "./UrgencyBadge";

/** Bloc « Retours à traiter » : retours non traités, triés par urgence, chaque ligne mène à la fiche du coaché. */
export function FeedbackQueue({ items, now }: { items: QueueItem[]; now: Date }) {
  return (
    <section aria-labelledby="retours-titre" className="liste-groupee">
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <h2 id="retours-titre" className="flex items-center gap-2.5 text-sous-titre">
          Retours à traiter
          {items.length > 0 && (
            <span
              className="inline-flex min-w-7 items-center justify-center rounded-full bg-olive px-2 py-0.5 text-[15px] font-semibold tabular-nums text-texte"
              aria-label={`${items.length} retour${items.length > 1 ? "s" : ""} à traiter`}
            >
              {items.length}
            </span>
          )}
        </h2>
        <p className="hidden text-legende text-texte-2 sm:block">Douleur d’abord, puis charge trop haute, à monter, conforme</p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
          <strong className="text-corps">Tous les retours ont été traités</strong>
          <span className="text-texte-2">Les prochains retours de séance arriveront ici.</span>
        </div>
      ) : (
        items.map((f) => {
          const pain = f.urgency === 1 ? (f.pain_zone ?? null) : null;
          const when = relativeTime(f.created_at, now);
          return (
            <Link
              key={f.id}
              href={`/coach/coaches/${f.clientId}`}
              aria-label={`Retour de ${f.name}, ${when}${pain ? `, douleur ${pain}` : ""}, ouvrir la fiche`}
              className="flex min-h-11 items-start gap-3.5 px-5 py-4 transition-colors hover:bg-fond md:px-6"
            >
              <Avatar initials={f.initials} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-3">
                  <strong className="truncate text-[17px] font-semibold">{f.name}</strong>
                  <span className="shrink-0 text-legende tabular-nums text-texte-2">{when}</span>
                </span>
                <span className="line-clamp-2 text-[15px] text-texte-2">{f.note?.trim() || (f.sessionName ? `Séance « ${f.sessionName} » terminée, sans commentaire.` : "Retour sans commentaire.")}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <UrgencyBadge urgency={f.urgency} detail={pain} />
                  <RpeChip rpe={f.rpe} />
                </span>
              </span>
              <IconChevron width={18} height={18} className="mt-3 shrink-0 text-icone" />
            </Link>
          );
        })
      )}
    </section>
  );
}
