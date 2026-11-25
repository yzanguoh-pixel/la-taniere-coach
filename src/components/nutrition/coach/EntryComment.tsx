"use client";

import { useActionState, useState } from "react";
import { saveComment, type NutritionState } from "@/lib/nutrition/coach/actions";

const initial: NutritionState = { status: "idle" };

/** US26 — Commentaire du coach sur une entrée du journal (food_log_entries.coach_comment). */
export function EntryComment({ clientId, entryId, entryName, comment, firstName }: { clientId: string; entryId: string; entryName: string; comment: string | null; firstName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: NutritionState, fd: FormData) => {
    const res = await saveComment(prev, fd);
    if (res.status === "ok") setOpen(false);
    return res;
  }, initial);
  const id = `comment-${entryId}`;
  const err = state.fieldErrors?.comment;

  return (
    <div className="flex flex-col gap-2">
      {comment && !open && (
        <p className="rounded-[14px] bg-olive-pale px-3.5 py-2 text-[15px] text-olive-fonce">
          <span className="font-semibold">Ton commentaire : </span>
          {comment}
        </p>
      )}
      {state.status === "ok" && !open && (
        <p role="status" className="text-legende font-semibold text-olive-fonce">
          {state.message}
        </p>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={id}
          className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-olive-fonce hover:underline"
        >
          {comment ? "Modifier le commentaire" : "Commenter"}
          <span className="sr-only"> {entryName}</span>
        </button>
      ) : (
        <form key={state.stamp ?? 0} id={id} action={action} noValidate className="flex flex-col gap-2">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="entryId" value={entryId} />
          <label htmlFor={`${id}-t`} className="text-[15px] font-semibold">
            Commentaire visible par {firstName}
          </label>
          <textarea
            id={`${id}-t`}
            name="comment"
            rows={2}
            maxLength={600}
            autoFocus
            defaultValue={state.values?.comment ?? comment ?? ""}
            placeholder="Ex. Bien pour les protéines ! Ajoute une collation glucidique avant la séance."
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${id}-err` : undefined}
            className={`w-full rounded-[12px] border bg-carte px-3 py-2.5 text-[17px] ${err ? "border-peche-fonce" : "border-bordure"}`}
          />
          {err && (
            <p id={`${id}-err`} className="text-legende font-semibold text-peche-fonce">
              {err}
            </p>
          )}
          {state.status === "error" && state.message && (
            <p role="alert" className="text-legende font-semibold text-peche-fonce">
              {state.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-principal" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" className="btn-secondaire" onClick={() => setOpen(false)}>
              Annuler
            </button>
            {comment && (
              <button type="submit" name="intent" value="remove" className="btn-secondaire" disabled={pending}>
                Retirer
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
