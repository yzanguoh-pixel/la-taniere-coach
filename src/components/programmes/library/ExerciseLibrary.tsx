"use client";

import { useId, useMemo, useState } from "react";

/** Exercice tel qu'affiché dans la bibliothèque (chargé côté serveur par getExerciseLibrary). */
export type ExerciseLite = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  muscles: string[];
  equipment: string | null;
};

type Props = {
  exercises: ExerciseLite[];
  /** Appelé au clic sur « Ajouter » ; l'éditeur insère l'exercice dans la séance ouverte. */
  onAdd: (exercise: ExerciseLite) => void;
  /** Exercices déjà présents dans la séance : le bouton affiche « Ajouté » mais reste utilisable. */
  addedIds?: ReadonlySet<string> | string[];
  /** Désactive les boutons (ex. aucune séance sélectionnée, enregistrement en cours). */
  disabled?: boolean;
  title?: string;
  className?: string;
};

/** Minuscules sans accents : « développé » trouve « developpe ». */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * US12 — Bibliothèque d'exercices : recherche instantanée (nom, alias, catégorie, muscles, matériel)
 * et filtre par catégorie. Conçue pour le panneau droit de l'éditeur de programme.
 */
export function ExerciseLibrary({ exercises, onAdd, addedIds, disabled = false, title = "Bibliothèque d’exercices", className = "" }: Props) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const added = useMemo(() => (addedIds instanceof Set ? addedIds : new Set(addedIds ?? [])), [addedIds]);

  const index = useMemo(
    () => exercises.map((e) => ({ e, hay: norm([e.name, ...e.aliases, e.category, ...e.muscles, e.equipment ?? ""].join(" ")) })),
    [exercises],
  );
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of exercises) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [exercises]);

  const results = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return index
      .filter(({ e, hay }) => (category == null || e.category === category) && terms.every((t) => hay.includes(t)))
      .map(({ e }) => e)
      .sort((a, b) => {
        // Les noms qui commencent par la recherche passent devant.
        if (terms.length) {
          const pa = norm(a.name).startsWith(terms[0]) ? 0 : 1;
          const pb = norm(b.name).startsWith(terms[0]) ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        return a.name.localeCompare(b.name, "fr");
      });
  }, [index, query, category]);

  const searchId = `${uid}-q`;
  const hasFilter = query.trim() !== "" || category != null;

  return (
    <section aria-labelledby={`${uid}-t`} className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <h2 id={`${uid}-t`} className="text-sous-titre">
        {title}
      </h2>

      <div role="search" className="relative">
        <label htmlFor={searchId} className="sr-only">
          Rechercher un exercice
        </label>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-icone">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              e.preventDefault();
              setQuery("");
            }
          }}
          placeholder="Nom, alias, catégorie ou muscle"
          className="min-h-11 w-full rounded-full border border-bordure bg-carte pl-10 pr-4 text-corps placeholder:text-texte-2"
        />
      </div>

      <div role="group" aria-label="Filtrer par catégorie" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CategoryChip label="Toutes" count={exercises.length} pressed={category == null} onClick={() => setCategory(null)} />
        {categories.map(([c, n]) => (
          <CategoryChip key={c} label={c} count={n} pressed={category === c} onClick={() => setCategory(category === c ? null : c)} />
        ))}
      </div>

      <p className="text-legende text-texte-2" role="status" aria-live="polite">
        {results.length} {results.length > 1 ? "exercices" : "exercice"}
        {query.trim() ? ` pour « ${query.trim()} »` : ""}
        {category ? ` en ${category}` : ""}
      </p>

      {results.length === 0 ? (
        <div className="liste-groupee">
          <div className="flex flex-col items-start gap-2 p-5">
            <strong>Aucun exercice trouvé</strong>
            <span className="text-texte-2">Vérifiez l’orthographe ou cherchez par alias (ex. « back squat ») ou par muscle.</span>
            {hasFilter && (
              <button
                type="button"
                className="btn-secondaire mt-1"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                }}
              >
                Effacer la recherche
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="liste-groupee min-h-0 overflow-y-auto" aria-label="Exercices">
          {results.map((e) => {
            const isAdded = added.has(e.id);
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{e.name}</p>
                  {e.aliases.length > 0 && <p className="truncate text-legende text-texte-2">aussi : {e.aliases.join(", ")}</p>}
                  <p className="mt-1 flex flex-wrap gap-1.5 text-legende">
                    <span className="rounded-full bg-olive-pale px-2 py-0.5 font-medium text-olive-fonce">{e.category}</span>
                    {e.muscles.length > 0 && <span className="text-texte-2">{e.muscles.join(", ")}</span>}
                    <span className="text-texte-2">· {e.equipment ?? "poids du corps"}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAdd(e)}
                  aria-label={`${isAdded ? "Ajouter encore" : "Ajouter"} ${e.name}`}
                  className={
                    isAdded
                      ? "inline-flex min-h-11 shrink-0 items-center rounded-full bg-olive-pale px-4 text-[15px] font-semibold text-olive-fonce disabled:opacity-50"
                      : "inline-flex min-h-11 shrink-0 items-center rounded-full bg-separateur px-4 text-[15px] font-semibold text-texte transition-transform active:scale-[0.98] disabled:opacity-50"
                  }
                >
                  {isAdded ? "Ajouté" : "Ajouter"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CategoryChip({ label, count, pressed, onClick }: { label: string; count: number; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors ${
        pressed ? "bg-olive-fonce text-white" : "bg-separateur text-texte hover:bg-olive-pale"
      }`}
    >
      {label}
      <span className={`tabular-nums ${pressed ? "text-white/80" : "text-texte-2"}`}>{count}</span>
    </button>
  );
}
