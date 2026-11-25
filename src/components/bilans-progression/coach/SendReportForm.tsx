"use client";

import { useActionState } from "react";
import { sendReportForm, type ReportFormState } from "@/lib/bilans-progression/actions";

const ErrorText = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-2 text-[15px] font-medium text-peche-fonce">
      {children}
    </p>
  ) : null;

/** « Mot du coach » et « Prochain objectif », puis envoi du bilan au coaché. */
export function SendReportForm({ clientId, firstName, nextFocus }: { clientId: string; firstName: string; nextFocus: string | null }) {
  const [state, action, pending] = useActionState<ReportFormState, FormData>(sendReportForm.bind(null, clientId), { status: "idle" });
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-5 rounded-[20px] bg-carte p-4 shadow-legere sm:p-5" aria-labelledby="envoi-titre">
      <h2 id="envoi-titre" className="text-sous-titre">
        Avant l’envoi
      </h2>

      {e.form && (
        <p role="alert" className="rounded-[16px] bg-peche px-4 py-3 text-[15px] font-semibold text-peche-fonce">
          {e.form}
        </p>
      )}
      {state.status === "ok" && state.message && (
        <p role="status" className="rounded-[16px] bg-olive-pale px-4 py-3 text-[15px] font-semibold text-olive-fonce">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="bp-focus" className="mb-2 block text-[17px] font-semibold">
          Prochain objectif
        </label>
        <input
          id="bp-focus"
          name="nextFocus"
          defaultValue={nextFocus ?? ""}
          maxLength={200}
          aria-invalid={e.nextFocus ? true : undefined}
          aria-describedby={e.nextFocus ? "bp-err-focus" : "bp-focus-aide"}
          className={`min-h-12 w-full rounded-xl border bg-carte px-3 text-[17px] ${e.nextFocus ? "border-peche-fonce" : "border-bordure"}`}
        />
        <p id="bp-focus-aide" className="mt-1.5 text-legende text-texte-2">
          Proposé à partir des chiffres ; modifiable.
        </p>
        <ErrorText id="bp-err-focus">{e.nextFocus}</ErrorText>
      </div>

      <div>
        <label htmlFor="bp-note" className="mb-2 block text-[17px] font-semibold">
          Mot du coach <span className="font-normal text-texte-2">(facultatif)</span>
        </label>
        <textarea
          id="bp-note"
          name="coachNote"
          rows={4}
          maxLength={2000}
          placeholder={`Ex. Belle régularité ce mois-ci, ${firstName}. On garde le cap.`}
          aria-invalid={e.coachNote ? true : undefined}
          aria-describedby={e.coachNote ? "bp-err-note" : undefined}
          className={`w-full rounded-xl border bg-carte px-3 py-2.5 text-[17px] ${e.coachNote ? "border-peche-fonce" : "border-bordure"}`}
        />
        <ErrorText id="bp-err-note">{e.coachNote}</ErrorText>
      </div>

      <button type="submit" disabled={pending} className="btn-principal min-h-12 w-full">
        {pending ? "Envoi…" : `Envoyer à ${firstName}`}
      </button>
    </form>
  );
}
