/** Page provisoire : la structure est en place, le contenu arrive au sprint indiqué. */
export function Placeholder({ title, sprint, maquette, description }: { title: string; sprint: number; maquette: string; description: string }) {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-legende font-medium text-texte-2">Maquette {maquette}</p>
        <h1 className="text-titre">{title}</h1>
      </header>
      <div className="liste-groupee">
        <div className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:gap-4">
          <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-sauge px-3 py-1 text-legende font-semibold text-sauge-fonce">Arrive au sprint {sprint}</span>
          <p className="text-texte-2">{description}</p>
        </div>
      </div>
    </section>
  );
}
