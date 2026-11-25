import Link from "next/link";
import type { ThreadMessage } from "@/lib/messages/thread";
import { messageDayLabel, messageTime } from "@/lib/messages/format";

/**
 * Fil du coaché en lecture, sur la fiche : derniers messages seulement.
 * (MessageThread de l'espace coaché défile jusqu'en bas à l'ouverture : inadapté en bas d'une fiche.)
 */
export function ClientThread({
  messages,
  firstName,
  now,
  limit = 8,
  clientId,
}: {
  messages: ThreadMessage[];
  firstName: string;
  now: Date;
  limit?: number;
  clientId?: string;
}) {
  const id = clientId ?? messages[0]?.clientId;
  const open = id ? (
    <Link href={`/coach/messages/${id}`} className="btn-secondaire self-start">
      {messages.length ? "Ouvrir la conversation" : `Écrire à ${firstName}`}
    </Link>
  ) : null;
  if (!messages.length)
    return (
      <div className="flex flex-col gap-3">
        <p className="liste-groupee p-5 text-texte-2">
          Aucun échange avec {firstName} pour l’instant.
        </p>
        {open}
      </div>
    );
  const shown = messages.slice(-limit);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="log"
        aria-label={`Derniers échanges avec ${firstName}`}
        className="liste-groupee flex flex-col gap-3 p-5"
      >
        {messages.length > shown.length && (
          <p className="text-center text-legende text-texte-2">
            {messages.length - shown.length} messages plus anciens
          </p>
        )}
        {shown.map((m) => {
          const when = `${messageDayLabel(m.createdAt, now)}, ${messageTime(m.createdAt)}`;
          if (m.kind === "event") {
            return (
              <p
                key={m.id}
                className="mx-auto max-w-[95%] rounded-full border border-bordure bg-fond px-3.5 py-1.5 text-center text-legende tabular-nums text-texte-2"
              >
                {m.body}
                <span aria-hidden="true"> · </span>
                <time dateTime={m.createdAt}>{when}</time>
              </p>
            );
          }
          const mine = m.sender === "coach";
          return (
            <div
              key={m.id}
              className={`flex max-w-[85%] flex-col ${mine ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <span className="px-1 text-legende text-texte-2">
                {mine ? "Toi" : firstName}
              </span>
              <div
                className={`whitespace-pre-wrap break-words rounded-[18px] px-4 py-2.5 text-[15px] ${mine ? "rounded-br-md bg-olive-fonce text-white" : "rounded-bl-md bg-olive-pale text-texte"}`}
              >
                {m.body}
              </div>
              <time
                dateTime={m.createdAt}
                className="mt-0.5 px-1 text-legende tabular-nums text-texte-2"
              >
                {when}
              </time>
            </div>
          );
        })}
      </div>
      {open}
    </div>
  );
}
