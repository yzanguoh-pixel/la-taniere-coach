import Link from "next/link";
import type { EditorData } from "./types";

/** Bandeau « Modèle de base → version personnalisée » avec les pastilles d'adaptation (champ adaptations). */
export function AdaptationBanner({ data }: { data: EditorData }) {
  if (data.mode === "modele") {
    return (
      <section aria-label="À propos du modèle" className="rounded-[20px] bg-olive-pale px-5 py-4 md:px-6">
        <p className="font-semibold">Modèle de base</p>
        <p className="mt-1 text-legende text-texte-2">
          Les modifications s’appliquent au modèle et aux prochaines copies. Les copies déjà envoyées à vos coachés ne changent pas.
        </p>
      </section>
    );
  }
  const first = data.clientFirstName ?? "le coaché";
  return (
    <section aria-label={`Adaptations pour ${first}`} className="rounded-[20px] bg-olive-pale px-5 py-4 md:px-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
        <span className="text-texte-2">Modèle de base</span>
        {data.templateId && data.canUpdateTemplate ? (
          <Link href={`/coach/programmes/modele/${data.templateId}`} className="underline decoration-olive underline-offset-4 hover:decoration-olive-fonce">
            « {data.templateName} »
          </Link>
        ) : (
          <span>« {data.templateName ?? data.name} »</span>
        )}
        <span aria-hidden className="text-olive-fonce">→</span>
        <span>Version personnalisée pour {first}</span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Adaptations">
        {data.adaptations.length ? (
          data.adaptations.map((a) => (
            <li key={a} className="rounded-full bg-carte px-3 py-1 text-legende font-semibold text-texte">
              {a}
            </li>
          ))
        ) : (
          <li className="text-legende text-texte-2">Aucune adaptation : identique au modèle.</li>
        )}
      </ul>
      <p className="mt-3 text-legende text-texte-2">Chaque modification s’applique seulement à {first}, sauf si vous choisissez de mettre aussi à jour le modèle.</p>
    </section>
  );
}
