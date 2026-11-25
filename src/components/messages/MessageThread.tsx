import type { ThreadMessage } from "@/lib/messages/thread";
import { messageDayKey, messageDayLabel, messageTime } from "@/lib/messages/format";
import { IconMessages } from "@/components/icons";
import { ThreadAutoScroll } from "@/components/messages/ThreadAutoScroll";

type Props = {
  messages: ThreadMessage[];
  /** Qui regarde le fil : ses propres messages sont à droite, en olive foncé. */
  viewer: "coach" | "coache";
  /** Prénom de l'interlocuteur (« Karim »). */
  otherName: string;
  /** Libellé sous les bulles de l'interlocuteur (« Karim, ton coach »). */
  otherLabel?: string;
};

/** Fil de messages : bulles texte et pastilles « événement » centrées, groupées par jour. */
export function MessageThread({ messages, viewer, otherName, otherLabel }: Props) {
  if (messages.length === 0) {
    return (
      <div className="liste-groupee flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-olive-pale text-olive-fonce">
          <IconMessages width={24} height={24} />
        </span>
        <p className="mt-1 font-semibold">Pas encore d’échange</p>
        <p className="text-[15px] text-texte-2">
          Écris ton premier message ou termine une séance pour envoyer un retour à {otherName}.
        </p>
      </div>
    );
  }

  const groups: { key: string; label: string; items: ThreadMessage[] }[] = [];
  for (const m of messages) {
    const key = messageDayKey(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: messageDayLabel(m.createdAt), items: [m] });
  }

  return (
    <div role="log" aria-label={`Fil d’échanges avec ${otherName}`} className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label} className="flex flex-col gap-2.5">
          <h2 className="text-center text-legende font-medium text-texte-2">{g.label}</h2>
          {g.items.map((m) => (
            <MessageItem key={m.id} message={m} viewer={viewer} otherName={otherName} otherLabel={otherLabel} />
          ))}
        </section>
      ))}
      <ThreadAutoScroll count={messages.length} />
    </div>
  );
}

function MessageItem({ message: m, viewer, otherName, otherLabel }: { message: ThreadMessage; viewer: "coach" | "coache"; otherName: string; otherLabel?: string }) {
  const time = messageTime(m.createdAt);

  if (m.kind === "event") {
    return (
      <p className="mx-auto max-w-[90%] rounded-full border border-bordure bg-carte px-3.5 py-1.5 text-center text-legende text-texte-2 tabular-nums">
        {m.body}
        <span className="sr-only">, à </span>
        <span aria-hidden="true"> · </span>
        <time dateTime={m.createdAt}>{time}</time>
      </p>
    );
  }

  const mine = m.sender === viewer;
  const isNew = !mine && m.readAt === null;

  if (mine) {
    return (
      <div className="ml-auto flex max-w-[82%] flex-col items-end">
        <p className="sr-only">Toi :</p>
        <div className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-olive-fonce px-4 py-2.5 text-white">{m.body}</div>
        <time dateTime={m.createdAt} className="mt-1 px-1 text-legende text-texte-2 tabular-nums">
          {time}
        </time>
      </div>
    );
  }

  return (
    <div className="mr-auto flex max-w-[82%] flex-col items-start">
      <p className="mb-1 flex items-center gap-2 px-1 text-legende font-medium text-texte-2">
        <span>{otherLabel ?? otherName}</span>
        {isNew ? <span className="rounded-full bg-olive-fonce px-2 py-0.5 text-[11px] font-semibold text-white">Nouveau</span> : null}
      </p>
      <div className="whitespace-pre-wrap break-words rounded-[20px] rounded-bl-md bg-olive-pale px-4 py-2.5 text-texte">{m.body}</div>
      <time dateTime={m.createdAt} className="mt-1 px-1 text-legende text-texte-2 tabular-nums">
        {time}
      </time>
    </div>
  );
}
