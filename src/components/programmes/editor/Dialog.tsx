"use client";

import { useEffect, useRef } from "react";

/** Fenêtre modale native (<dialog>) : focus piégé, Échap pour fermer, clic sur le fond pour fermer. */
export function Dialog({ open, onClose, labelledBy, children, wide = false }: { open: boolean; onClose: () => void; labelledBy: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className={`m-auto ${wide ? "w-[min(94vw,640px)]" : "w-[min(92vw,520px)]"} max-h-[90dvh] rounded-[24px] bg-carte p-0 text-texte shadow-flottante backdrop:bg-texte/40`}
    >
      {open && children}
    </dialog>
  );
}

export function DialogHeader({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 id={id} className="text-sous-titre">
        {title}
      </h2>
      <button type="button" onClick={onClose} aria-label="Fermer" className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-icone hover:bg-separateur">
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Message d'erreur sous un champ (relié par aria-describedby). */
export function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-1.5 text-legende font-medium text-peche-fonce">
      {text}
    </p>
  );
}

export const inputClass =
  "min-h-11 w-full rounded-xl border border-bordure bg-carte px-3.5 text-corps tabular-nums placeholder:text-texte-2 aria-[invalid=true]:border-peche-fonce";
