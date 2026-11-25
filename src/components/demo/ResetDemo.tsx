"use client";

import { startTransition, useActionState, useState } from "react";
import { resetDemo, type ResetState } from "@/lib/demo/actions";

const initial: ResetState = { status: "idle" };

export function ResetDemo() {
  const [confirming, setConfirming] = useState(false);
  const [state, dispatch, pending] = useActionState(resetDemo, initial);

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div>
        <h3 className="font-semibold">Réinitialiser la démo</h3>
        <p className="text-[15px] text-texte-2">
          Remet les coachés, séances, messages, bilans, nutrition et abonnements dans leur état de départ. Les comptes de démo sont conservés.
        </p>
      </div>
      {confirming ? (
        <div role="group" aria-label="Confirmer la réinitialisation" className="rounded-[16px] bg-fond p-3">
          <p className="text-[15px]">Tout ce qui a été fait pendant la démo sera effacé. Continuer ?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-principal"
              onClick={() => {
                setConfirming(false);
                startTransition(() => dispatch());
              }}
            >
              Réinitialiser
            </button>
            <button type="button" className="btn-secondaire" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" className="btn-secondaire" disabled={pending} onClick={() => setConfirming(true)}>
            {pending ? "Réinitialisation…" : "Réinitialiser la démo"}
          </button>
        </div>
      )}
      {!pending && state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-legende font-semibold text-peche-fonce" : "text-legende font-semibold text-olive-fonce"}>
          {state.message}
        </p>
      )}
    </div>
  );
}
