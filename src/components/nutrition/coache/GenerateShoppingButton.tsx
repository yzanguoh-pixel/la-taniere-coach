"use client";

import { useActionState } from "react";
import { generateShoppingFromPlan, type GenerateState } from "@/lib/nutrition/coache/actions";

/** « Générer depuis le plan » : ajoute à la liste les aliments du plan qui n'y sont pas encore. */
export function GenerateShoppingButton({ dayParam }: { dayParam: string }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateShoppingFromPlan.bind(null, dayParam), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <button type="submit" disabled={pending} className="btn-secondaire w-full">
        {pending ? "Génération…" : "Générer depuis le plan"}
      </button>
      {state.message && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message}
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {state.error}
        </p>
      )}
    </form>
  );
}
