"use client";

import { useEffect, useRef } from "react";

/**
 * Fenêtre modale « feuille » : en-tête fixe, contenu qui défile seul, barre d'actions fixe en bas.
 * - Ordinateur : fenêtre centrée (520 px max, 85 % de la hauteur).
 * - Mobile (< 640 px) : feuille ancrée en bas, pleine largeur, presque plein écran, avec safe-area.
 * <dialog> natif ouvert avec showModal() : le reste de la page devient inerte (focus piégé),
 * Échap ferme, clic sur le fond ferme. Le focus initial va sur l'élément [data-autofocus] s'il existe.
 * Jamais de défilement horizontal : la fenêtre masque tout débordement en largeur.
 */
export function Sheet({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
    if (!open) return;
    // Bloque le défilement de la page derrière la feuille (iOS notamment).
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-modal="true"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className={[
        // Base : la fenêtre elle-même est la colonne flex ; aucun débordement possible.
        "overflow-hidden bg-carte p-0 text-texte shadow-flottante backdrop:bg-texte/40 open:flex open:flex-col",
        // Mobile : feuille en bas, pleine largeur, presque plein écran.
        "mx-0 mb-0 mt-auto w-full max-w-none rounded-t-[24px] max-h-[calc(100dvh-max(12px,env(safe-area-inset-top)))]",
        // Ordinateur : fenêtre centrée.
        "sm:m-auto sm:w-[min(92vw,520px)] sm:max-h-[min(85dvh,760px)] sm:rounded-[24px]",
      ].join(" ")}
    >
      {open && children}
    </dialog>
  );
}

/** En-tête fixe : titre qui passe à la ligne + bouton Fermer (44 px). */
export function SheetHeader({ id, title, onClose }: { id: string; title: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-separateur py-3 pl-5 pr-3 sm:pl-6">
      <h2 id={id} className="min-w-0 flex-1 pt-2 text-sous-titre [overflow-wrap:anywhere]">
        {title}
      </h2>
      <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-icone hover:bg-separateur">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Zone centrale : seule partie qui défile (verticalement uniquement). */
export function SheetBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Barre d'actions fixe en bas : fond plein, séparateur, safe-area ; boutons empilés sur mobile. */
export function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-separateur bg-carte px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:pb-4 [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}
