"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconChevron } from "@/components/icons";

/** Ligne de l'annuaire, textes de date déjà formatés côté serveur (pas d'écart d'hydratation). */
export type DirectoryRow = {
  id: string;
  fullName: string;
  initials: string;
  goal: string | null;
  archived: boolean;
  program: string | null;
  toRenew: boolean;
  renewLabel: string | null;
  lastFeedback: { rpe: number; when: string; handled: boolean } | null;
};

type Filter = "actifs" | "renouveler" | "archives";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** C2 — Liste des coachés : recherche instantanée (nom, objectif, programme) et filtres Actifs / À renouveler / Archivés. */
export function ClientDirectory({ rows }: { rows: DirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("actifs");

  const counts = useMemo(
    () => ({
      actifs: rows.filter((r) => !r.archived).length,
      renouveler: rows.filter((r) => !r.archived && r.toRenew).length,
      archives: rows.filter((r) => r.archived).length,
    }),
    [rows],
  );

  const q = norm(query);
  const list = rows.filter((r) => {
    if (filter === "archives" ? !r.archived : r.archived) return false;
    if (filter === "renouveler" && !r.toRenew) return false;
    return !q || norm(`${r.fullName} ${r.goal ?? ""} ${r.program ?? ""}`).includes(q);
  });

  const seg = (key: Filter, label: string) => (
    <button
      type="button"
      aria-pressed={filter === key}
      onClick={() => setFilter(key)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors ${
        filter === key ? "bg-carte text-texte shadow-legere" : "text-texte-2 hover:text-texte"
      }`}
    >
      {label}
      <span className="tabular-nums text-texte-2">{counts[key]}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="search" className="relative flex-1">
          <label htmlFor="cc-q" className="sr-only">
            Rechercher un coaché
          </label>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-icone">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="cc-q"
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
            placeholder="Rechercher par nom ou objectif"
            className="min-h-11 w-full rounded-full border border-bordure bg-carte pl-10 pr-4 text-corps placeholder:text-texte-2"
          />
        </div>
        <div role="group" aria-label="Filtrer les fiches" className="flex gap-1 self-start rounded-full bg-separateur p-1">
          {seg("actifs", "Actifs")}
          {seg("renouveler", "À renouveler")}
          {seg("archives", "Archivés")}
        </div>
      </div>

      <p className="text-legende text-texte-2" role="status" aria-live="polite">
        {list.length} {list.length > 1 ? "fiches" : "fiche"}
        {query.trim() ? ` pour « ${query.trim()} »` : ""}
      </p>

      {list.length === 0 ? (
        <div className="liste-groupee">
          <div className="flex flex-col items-start gap-2 p-5">
            {query.trim() ? (
              <>
                <strong>Aucun coaché trouvé</strong>
                <span className="text-texte-2">Aucune fiche ne correspond à « {query.trim()} ». Vérifiez l’orthographe ou cherchez par objectif.</span>
                <button type="button" className="btn-secondaire mt-1" onClick={() => setQuery("")}>
                  Effacer la recherche
                </button>
              </>
            ) : filter === "renouveler" ? (
              <>
                <strong>Aucun abonnement à renouveler</strong>
                <span className="text-texte-2">Les coachés dont l’abonnement arrive à échéance apparaissent ici.</span>
              </>
            ) : filter === "archives" ? (
              <>
                <strong>Aucune fiche archivée</strong>
                <span className="text-texte-2">Les fiches archivées apparaissent ici.</span>
              </>
            ) : (
              <>
                <strong>Aucun coaché actif</strong>
                <span className="text-texte-2">Vos coachés apparaîtront ici dès leur premier bilan.</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div aria-hidden className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_24px] gap-4 px-6 text-legende font-semibold text-texte-2 md:grid">
            <span>Coaché</span>
            <span>Programme en cours</span>
            <span>Dernier retour</span>
            <span />
          </div>
          <ul className="liste-groupee" aria-label="Coachés">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/coach/coaches/${r.id}`}
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_24px] items-center gap-4 px-4 py-3 transition-colors hover:bg-fond md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_24px] md:px-6"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-olive-pale text-legende font-semibold text-olive-fonce">
                      {r.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 font-semibold">
                        {r.fullName}
                        {r.toRenew && !r.archived && (
                          <span className="rounded-full bg-beurre px-2 py-0.5 text-legende font-semibold text-beurre-fonce">À renouveler{r.renewLabel ? ` le ${r.renewLabel}` : ""}</span>
                        )}
                      </span>
                      <span className="block text-texte-2">{r.goal ?? "Objectif à préciser"}</span>
                      {/* Mobile : programme et retour sous le nom */}
                      <span className="mt-1 block text-legende text-texte-2 md:hidden">
                        {r.program ?? "Aucun programme"}
                        {r.lastFeedback ? ` · RPE ${r.lastFeedback.rpe}, ${r.lastFeedback.when}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="hidden md:block">{r.program ?? <span className="text-texte-2">Aucun</span>}</span>
                  <span className="hidden flex-wrap items-center gap-2 md:flex">
                    {r.lastFeedback ? (
                      <>
                        <span className="tabular-nums">RPE {r.lastFeedback.rpe}</span>
                        <span className="text-texte-2">{r.lastFeedback.when}</span>
                        {r.lastFeedback.handled ? (
                          <span className="rounded-full bg-olive-pale px-2 py-0.5 text-legende font-semibold text-olive-fonce">Traité</span>
                        ) : (
                          <span className="rounded-full bg-beurre px-2 py-0.5 text-legende font-semibold text-beurre-fonce">Nouveau</span>
                        )}
                      </>
                    ) : (
                      <span className="text-texte-2">Aucun</span>
                    )}
                  </span>
                  <IconChevron width={18} height={18} className="text-icone" />                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
