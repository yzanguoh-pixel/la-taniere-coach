"use client";

import { useActionState } from "react";
import { deleteSlot, type DeleteState } from "@/lib/agenda/actions";

const initial: DeleteState = { status: "idle" };

/** Supprime un créneau libre ; l'erreur éventuelle s'affiche juste en dessous. */
export function DeleteSlotButton({ slotId, label }: { slotId: string; label: string }) {
  const [state, action, pending] = useActionState(deleteSlot, initial);
  return (
    <form action={action} className="flex flex-col items-end">
      <input type="hidden" name="slotId" value={slotId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Supprimer le créneau libre ${label}`}
        className="inline-flex min-h-11 items-center justify-center rounded-full px-2 text-legende font-semibold text-texte-2 underline-offset-2 transition-colors hover:bg-separateur hover:text-texte hover:underline disabled:opacity-50"
      >
        {pending ? "…" : "Retirer"}
      </button>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-legende font-semibold text-peche-fonce">
          {state.message}
        </p>
      )}
    </form>
  );
}
