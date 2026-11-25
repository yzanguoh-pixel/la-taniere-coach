"use client";

import { useEffect, useRef, useState } from "react";

/** Lien public de réservation du bilan offert, avec bouton « Copier » et confirmation. */
export function BookingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState<"idle" | "ok" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : on sélectionne le lien pour une copie manuelle.
      inputRef.current?.select();
    }
    setCopied(ok ? "ok" : "error");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 3000);
  }

  return (
    <section aria-labelledby="lien-titre" className="liste-groupee flex flex-col gap-3 p-5">
      <div>
        <h2 id="lien-titre" className="text-sous-titre">
          Lien de réservation
        </h2>
        <p className="mt-1 text-[15px] text-texte-2">À partager en story, en bio ou par message : le prospect choisit un créneau et remplit son questionnaire, sans compte.</p>
      </div>
      <label htmlFor="lien-reservation" className="sr-only">
        Lien de réservation
      </label>
      <input
        ref={inputRef}
        id="lien-reservation"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="min-h-11 w-full rounded-[12px] border border-bordure bg-fond px-3 text-[15px] tabular-nums text-texte"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn-principal">
          Copier
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondaire">
          Ouvrir
        </a>
        <p role="status" aria-live="polite" className="text-[15px] font-semibold text-olive-fonce">
          {copied === "ok" ? "Lien copié" : copied === "error" ? "Copie impossible : le lien est sélectionné, copie-le à la main." : ""}
        </p>
      </div>
    </section>
  );
}
