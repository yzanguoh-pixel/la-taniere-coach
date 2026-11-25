"use client";

import { useOptimistic, useState, useTransition } from "react";
import { GlyphCheck } from "./glyphs";

/**
 * Case à cocher reliée à une Server Action (complément pris, article acheté).
 * Mise à jour optimiste ; en cas d'échec la case revient à son état et un message s'affiche.
 */
export function CheckToggle({
  checked,
  action,
  title,
  detail,
  strike = false,
}: {
  checked: boolean;
  action: (next: boolean) => Promise<{ ok: boolean }>;
  title: string;
  detail?: string | null;
  /** Barre le libellé une fois coché (liste de courses). */
  strike?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const next = !optimistic;
    setFailed(false);
    startTransition(async () => {
      setOptimistic(next);
      const res = await action(next);
      if (!res.ok) setFailed(true);
    });
  };

  return (
    <div className="px-4 py-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={optimistic}
        aria-busy={pending || undefined}
        onClick={toggle}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl text-left"
      >
        <span
          aria-hidden="true"
          className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
            optimistic ? "border-olive-fonce bg-olive-fonce text-white" : "border-bordure bg-carte text-transparent"
          }`}
        >
          <GlyphCheck width={14} height={14} strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[17px] ${optimistic && strike ? "text-texte-2 line-through decoration-texte-2/50" : "text-texte"}`}>{title}</span>
          {detail && <span className="block text-[13px] text-texte-2">{detail}</span>}
        </span>
      </button>
      {failed && (
        <p role="alert" className="pb-2 pl-9 text-[13px] font-medium text-peche-fonce">
          Pas enregistré. Réessaie.
        </p>
      )}
    </div>
  );
}
