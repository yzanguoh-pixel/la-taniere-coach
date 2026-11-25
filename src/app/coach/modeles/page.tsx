import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplateCatalog } from "@/components/programmes/library/TemplateCatalog";
import { getClientChoices, getTemplates, librarySupabase, type ClientChoice, type TemplateCard } from "@/lib/programmes/templates";

export const metadata: Metadata = { title: "Modèles de programme" };

/** US13 — Modèles de programme. Coque statique, données lues à la demande (cacheComponents). */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-titre">Modèles de programme</h1>
        <p className="max-w-[60ch] text-texte-2">
          Un modèle ne change jamais pour un coaché : « Personnaliser pour… » crée sa copie, que vous ajustez ensuite (charges, exercices remplacés).
        </p>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog />
      </Suspense>
    </section>
  );
}

async function Catalog() {
  const supabase = await librarySupabase();
  if (!supabase) {
    return <Notice title="Données indisponibles" text="La base de données n’est pas configurée sur cet environnement." />;
  }
  let data: [TemplateCard[], ClientChoice[]];
  try {
    data = await Promise.all([getTemplates(supabase), getClientChoices(supabase)]);
  } catch (e) {
    return <Notice title="Impossible de charger les modèles" text={e instanceof Error ? e.message : "Réessayez dans un instant."} />;
  }
  const [templates, clients] = data;
  if (templates.length === 0) {
    return <Notice title="Aucun modèle pour l’instant" text="Les modèles créés apparaîtront ici, prêts à être personnalisés pour un coaché." />;
  }
  return <TemplateCatalog templates={templates} clients={clients} />;
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

function CatalogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des modèles" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-[20px] bg-carte shadow-legere" />
      ))}
    </div>
  );
}
