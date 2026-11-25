"use client";

import { useActionState } from "react";
import { saveSummary, type BilanState } from "@/lib/bilans/actions";

const initial: BilanState = { status: "idle" };

/** US09 — Enregistre la synthèse calculée dans intake_forms.summary. */
export function SaveSummary({ bookingId, savedLabel }: { bookingId: string; savedLabel: string | null }) {
  const [state, action, pending] = useActionState(saveSummary, initial);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button type="submit" className="btn-secondaire" disabled={pending}>
        {pending ? "Enregistrement…" : savedLabel ? "Mettre à jour la synthèse" : "Enregistrer la synthèse"}
      </button>
      <span aria-live="polite" className="text-legende text-texte-2">
        {state.status === "ok" ? (
          <span role="status" className="font-semibold text-olive-fonce">
            {state.message}
          </span>
        ) : state.status === "error" ? (
          <span role="alert" className="font-semibold text-peche-fonce">
            {state.message}
          </span>
        ) : savedLabel ? (
          `Enregistrée le ${savedLabel}`
        ) : (
          "Pas encore enregistrée"
        )}
      </span>
    </form>
  );
}
