"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { LIFT_VIEWS, VIEW_LABELS, type LiftView } from "./views";

/**
 * Navigation par exercice du bilan (pastilles défilantes) et bascule de vue du graphique.
 * Ce sont de vrais liens (?exercice=…&vue=…) : sans JavaScript, la page serveur relit le paramètre.
 * Avec JavaScript, le changement est instantané et l'URL est mise à jour (history.replaceState) sans rechargement.
 * Les panneaux sont rendus côté serveur et passés tels quels.
 */


export type LiftPanel = {
  id: string;
  label: string;
  header: ReactNode;
  charts: Partial<Record<LiftView, ReactNode>>;
  table: ReactNode;
};

const hrefFor = (id: string, view: LiftView, anchor: string) => `?exercice=${encodeURIComponent(id)}&vue=${view}#${anchor}`;
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function LiftExplorer({ panels, initialId, initialView, anchor }: { panels: LiftPanel[]; initialId: string; initialView: LiftView; anchor: string }) {
  const [activeId, setActiveId] = useState(initialId);
  const [view, setView] = useState<LiftView>(initialView);
  const scroller = useRef<HTMLUListElement>(null);

  const panel = panels.find((p) => p.id === activeId) ?? panels[0];
  const available = LIFT_VIEWS.filter((v) => panel.charts[v] != null);
  const shownView: LiftView | null = available.includes(view) ? view : (available[0] ?? null);

  // Ramène la pastille active dans la zone visible de la barre (sans faire défiler la page).
  useEffect(() => {
    const list = scroller.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !el) return;
    const left = el.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + el.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = Math.max(0, left - 16);
    }
  }, [panel.id]);

  function go(e: MouseEvent, id: string, v: LiftView) {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    setActiveId(id);
    setView(v);
    const params = new URLSearchParams(window.location.search);
    params.set("exercice", id);
    params.set("vue", v);
    window.history.replaceState(null, "", `?${params.toString()}${window.location.hash}`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <nav aria-label="Choisir un exercice" className="min-w-0">
        <ul ref={scroller} className="relative m-0 flex list-none gap-2 overflow-x-auto overscroll-x-contain p-0.5 pb-2 [scrollbar-width:thin]">
          {panels.map((p) => {
            const active = p.id === panel.id;
            return (
              <li key={p.id} className="shrink-0">
                <a
                  href={hrefFor(p.id, view, anchor)}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => go(e, p.id, view)}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors ${
                    active ? "bg-olive-fonce text-white" : "border border-bordure bg-carte text-texte hover:bg-olive-pale"
                  }`}
                >
                  {p.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="liste-groupee">
        <div className="p-5">{panel.header}</div>
        {shownView && (
          <div className="flex flex-col gap-3 p-5">
            {available.length > 1 && (
              <div role="group" aria-label="Courbe affichée" className="flex max-w-full flex-wrap self-start rounded-[22px] bg-separateur p-1">
                {available.map((v) => (
                  <a
                    key={v}
                    href={hrefFor(panel.id, v, anchor)}
                    aria-current={v === shownView ? "true" : undefined}
                    onClick={(e) => go(e, panel.id, v)}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 text-[14px] font-semibold sm:px-4 sm:text-[15px] ${
                      v === shownView ? "bg-carte text-texte shadow-legere" : "text-texte-2 hover:text-texte"
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </a>
                ))}
              </div>
            )}
            {panel.charts[shownView]}
          </div>
        )}
        {panel.table}
      </div>
    </div>
  );
}
