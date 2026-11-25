"use client";

import Link from "next/link";
import { useId, useState } from "react";

export type ConversationItem = {
  clientId: string;
  fullName: string;
  initials: string;
  /** Aperçu du dernier message (déjà préfixé « Toi : » si envoyé par le coach), null si aucun message. */
  preview: string | null;
  /** Heure relative du dernier message (« il y a 3 h »). */
  when: string | null;
  /** Date ISO du dernier message (attribut dateTime). */
  at: string | null;
  unread: number;
};

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Liste des conversations du coach : recherche par nom, non-lus, coachés sans message en bas. */
export function ConversationList({ items, activeId }: { items: ConversationItem[]; activeId?: string }) {
  const [query, setQuery] = useState("");
  const id = useId();
  const q = normalize(query.trim());
  const shown = q ? items.filter((c) => normalize(c.fullName).includes(q)) : items;
  const withMessages = shown.filter((c) => c.preview !== null);
  const without = shown.filter((c) => c.preview === null);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <label htmlFor={`${id}-recherche`} className="sr-only">
          Rechercher un coaché
        </label>
        <input
          id={`${id}-recherche`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un coaché"
          autoComplete="off"
          className="block min-h-11 w-full rounded-full border border-bordure bg-carte px-4 text-[16px] text-texte placeholder:text-texte-2 focus-visible:outline-2 focus-visible:outline-olive-fonce"
        />
      </div>

      {shown.length === 0 ? (
        <p role="status" className="liste-groupee p-5 text-[15px] text-texte-2">
          Aucun coaché ne correspond à « {query.trim()} ».
        </p>
      ) : null}

      {withMessages.length > 0 ? (
        <ul aria-label="Conversations" className="liste-groupee">
          {withMessages.map((c) => (
            <Row key={c.clientId} item={c} active={c.clientId === activeId} />
          ))}
        </ul>
      ) : null}

      {without.length > 0 ? (
        <section aria-labelledby={`${id}-sans`} className="flex flex-col gap-2">
          <h2 id={`${id}-sans`} className="px-1 text-legende font-medium text-texte-2">
            Pas encore d’échange
          </h2>
          <ul className="liste-groupee">
            {without.map((c) => (
              <Row key={c.clientId} item={c} active={c.clientId === activeId} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Row({ item: c, active }: { item: ConversationItem; active: boolean }) {
  // La conversation ouverte est marquée lue à l'ouverture : pas de pastille pour elle.
  const unread = active ? 0 : c.unread;
  return (
    <li>
      <Link
        href={`/coach/messages/${c.clientId}`}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors ${active ? "bg-olive-pale" : "hover:bg-fond"}`}
      >
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-olive-pale text-[14px] font-semibold text-olive-fonce">
          {c.initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <span className={`min-w-0 flex-1 truncate ${unread ? "font-semibold" : "font-medium"}`}>{c.fullName}</span>
            {c.when && c.at ? (
              <time dateTime={c.at} className="shrink-0 text-legende tabular-nums text-texte-2">
                {c.when}
              </time>
            ) : null}
          </span>
          <span className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-[15px] ${unread ? "text-texte" : "text-texte-2"}`}>{c.preview ?? "Démarrer la conversation"}</span>
            {unread > 0 ? (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-olive-fonce px-1.5 text-[12px] font-semibold tabular-nums text-white">
                {unread}
                <span className="sr-only"> {unread > 1 ? "messages non lus" : "message non lu"}</span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
