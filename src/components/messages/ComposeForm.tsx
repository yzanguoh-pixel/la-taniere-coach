"use client";

import { useActionState, useEffect, useId } from "react";
import { markThreadReadAction, sendMessageAction, type SendMessageState } from "@/lib/messages/actions";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages/format";

const initial: SendMessageState = { status: "idle" };

type Props = {
  /** Prénom du destinataire (« Karim » côté coaché, « Léa » côté coach). */
  coachName: string;
  hasUnread: boolean;
  /** Action d'envoi ; par défaut celle du coaché connecté. Côté coach : sendCoachMessageAction liée au coaché. */
  sendAction?: (prev: SendMessageState, formData: FormData) => Promise<SendMessageState>;
  /** Action de marquage lu à l'ouverture ; par défaut celle du coaché connecté. */
  markReadAction?: () => Promise<void>;
  /** Nombre de lignes du champ (3 par défaut ; 2 pour une zone de saisie fixe plus compacte). */
  rows?: number;
};

/** Zone de saisie : envoi via Server Action, erreur sous le champ, confirmation après envoi. */
export function ComposeForm({ coachName, hasUnread, sendAction = sendMessageAction, markReadAction = markThreadReadAction, rows = 3 }: Props) {
  const [state, action, pending] = useActionState(sendAction, initial);
  const id = useId();
  const fieldId = `${id}-message`;
  const errorId = `${id}-erreur`;
  const statusId = `${id}-statut`;
  const hasError = state.status === "error";

  // Les messages du coach affichés à l'ouverture sont marqués comme lus (le repère « Nouveau » reste visible pendant la lecture).
  useEffect(() => {
    if (hasUnread) void markReadAction();
  }, [hasUnread, markReadAction]);

  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="sr-only">
        Message pour {coachName}
      </label>
      <textarea
        key={state.sentAt ?? "brouillon"}
        id={fieldId}
        name="message"
        rows={rows}
        maxLength={MESSAGE_MAX_LENGTH}
        defaultValue={state.status === "error" ? state.value : ""}
        placeholder={`Écrire à ${coachName}…`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`block ${rows >= 3 ? "min-h-24" : "min-h-16"} w-full resize-y rounded-[16px] border bg-carte px-4 py-3 text-corps text-texte placeholder:text-texte-2 focus-visible:outline-2 focus-visible:outline-olive-fonce ${
          hasError ? "border-peche-fonce" : "border-bordure"
        }`}
      />
      {hasError ? (
        <p id={errorId} className="px-1 text-legende font-medium text-peche-fonce">
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p id={statusId} role="status" className="px-1 text-legende text-texte-2">
          {state.status === "success" && !pending ? `Message envoyé à ${coachName}.` : ""}
        </p>
        <button type="submit" className="btn-principal shrink-0" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
