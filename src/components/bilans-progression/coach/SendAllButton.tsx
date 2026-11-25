"use client";

import { useActionState, useState } from "react";
import { sendAllForm, type ReportFormState } from "@/lib/bilans-progression/actions";

/** « Envoyer les bilans du mois » avec confirmation sur place. */
export function SendAllButton({ due }: { due: number }) {
  const [state, action, pending] = useActionState<ReportFormState, FormData>(sendAllForm, { status: "idle" });
  const [confirming, setConfirming] = useState(false);
  const label = `Envoyer un bilan à ${due} coaché${due > 1 ? "s" : ""} ?`;

  return (
    <div className="flex flex-col gap-3">
      {!confirming ? (
        <button type="button" className="btn-principal min-h-12 w-full sm:w-auto" disabled={due === 0 || pending} onClick={() => setConfirming(true)}>
          Envoyer les bilans du mois
        </button>
      ) : (
        <form
          action={(fd) => {
            setConfirming(false);
            action(fd);
          }}
          className="flex flex-col gap-3 rounded-[16px] bg-carte p-4 shadow-legere"
        >
          <p className="font-semibold">{label}</p>
          <p className="text-[15px] text-texte-2">Chacun reçoit le bilan de ses 4 dernières semaines et un message dans son fil.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="btn-principal min-h-12" autoFocus>
              Envoyer
            </button>
            <button type="button" className="btn-secondaire min-h-12" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
      {pending && (
        <p role="status" className="text-[15px] text-texte-2">
          Envoi en cours…
        </p>
      )}
      {!pending && state.status !== "idle" && state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-[16px] px-4 py-3 text-[15px] font-semibold ${state.status === "error" ? "bg-peche text-peche-fonce" : "bg-olive-pale text-olive-fonce"}`}
        >
          {state.message}
        </p>
      )}
      {!pending && state.status === "error" && !state.message && state.errors?.form && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {state.errors.form}
        </p>
      )}
      {due === 0 && state.status === "idle" && <p className="text-[15px] text-texte-2">Tous les coachés ont reçu un bilan depuis moins de 28 jours.</p>}
    </div>
  );
}
