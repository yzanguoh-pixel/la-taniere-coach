import { IconConnexions } from "@/components/icons";
import { listActivities, type Activity } from "@/lib/connexions/data";
import { SOURCE_LABELS, kmFr, shortDateFr } from "@/lib/connexions/providers";

/**
 * Carte « Activités » pour la fiche coaché côté coach (Garmin, simulé).
 * Utilise listActivities(clientId, { forCoach: true }) : Strava n'est JAMAIS lu ici.
 * Intégration prévue par le coordinateur dans src/app/coach/coaches/[id]/page.tsx :
 *   <ActivitiesCard clientId={client.id} firstName="Léa" />
 */
export async function ActivitiesCard({ clientId, firstName, limit = 5 }: { clientId: string; firstName?: string; limit?: number }) {
  const activities: Activity[] = await listActivities(clientId, { forCoach: true, limit });
  const who = firstName ?? "Ce coaché";

  return (
    <section aria-labelledby={`activites-${clientId}`} className="liste-groupee">
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-olive-pale text-olive-fonce">
          <IconConnexions width={20} height={20} />
        </span>
        <div>
          <h2 id={`activites-${clientId}`} className="font-semibold">
            Activités
          </h2>
          <p className="text-legende text-texte-2">Montre Garmin (simulée) · Strava jamais partagé</p>
        </div>
      </header>
      {activities.length === 0 ? (
        <p className="px-4 py-4 text-[15px] text-texte-2">{who} n’a pas encore connecté de montre : aucune activité partagée.</p>
      ) : (
        <ul className="[&>li+li]:border-t [&>li+li]:border-separateur">
          {activities.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{a.type}</p>
                <p className="text-legende text-texte-2">
                  {shortDateFr(a.date)} · {SOURCE_LABELS[a.source] ?? a.source}
                </p>
              </div>
              <p className="shrink-0 text-right text-[15px] tabular-nums">
                {a.distanceKm !== null ? kmFr(a.distanceKm) : "—"}
                <span className="block text-legende text-texte-2">
                  {a.durationMin !== null ? `${a.durationMin} min` : ""}
                  {a.kcal !== null ? ` · ${a.kcal} kcal` : ""}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
