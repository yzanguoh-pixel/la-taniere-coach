"use client";

import { useActionState, useState } from "react";
import { renewSubscription, sendReminder, type SubActionState } from "@/lib/abonnements/actions";
import type { SubStatus } from "@/lib/abonnements/format";
import { Initials, StatusBadge } from "./Badges";

/** Ligne d'abonnement, textes déjà formatés côté serveur (pas d'écart d'hydratation). */
export type BoardRow = {
  id: string;
  fullName: string;
  initials: string;
  planName: string;
  periodLabel: string;
  priceLabel: string;
  renewsOn: string;
  renewsLabel: string;
  dueLabel: string;
  status: SubStatus;
  /** Échéance dans 7 jours ou moins, ou dépassée : le rappel est proposé. */
  near: boolean;
  overdue: boolean;
  reminderLabel: string | null;
};

type Filter = "tous" | SubStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "actif", label: "Actifs" },
  { key: "a_renouveler", label: "À renouveler" },
  { key: "en_retard", label: "En retard" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const idle: SubActionState = { status: "idle" };

/** C8 — Abonnements triés par échéance, filtres par statut et recherche par nom. */
export function SubscriptionBoard({ rows }: { rows: BoardRow[] }) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");

  const count = (k: Filter) => (k === "tous" ? rows.length : rows.filter((r) => r.status === k).length);
  const q = norm(query);
  const list = rows.filter((r) => (filter === "tous" || r.status === filter) && (!q || norm(`${r.fullName} ${r.planName}`).includes(q)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="search" className="relative flex-1">
          <label htmlFor="ab-q" className="sr-only">
            Rechercher un coaché
          </label>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-icone">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="ab-q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou formule"
            className="min-h-11 w-full rounded-full border border-bordure bg-carte pl-10 pr-4 text-corps placeholder:text-texte-2"
          />
        </div>
        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-1 self-start rounded-full bg-separateur p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors ${
                filter === f.key ? "bg-carte text-texte shadow-legere" : "text-texte-2 hover:text-texte"
              }`}
            >
              {f.label}
              <span className="tabular-nums text-texte-2">{count(f.key)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-legende text-texte-2" role="status" aria-live="polite">
        {list.length} {list.length > 1 ? "abonnements" : "abonnement"}
        {query.trim() ? ` pour « ${query.trim()} »` : ""}
      </p>

      {list.length === 0 ? (
        <div className="liste-groupee flex flex-col items-start gap-2 p-5">
          <strong>Aucun abonnement</strong>
          <span className="text-texte-2">
            {query.trim() ? `Aucun abonnement ne correspond à « ${query.trim()} ».` : "Aucun abonnement dans cette catégorie pour le moment."}
          </span>
          {(query.trim() || filter !== "tous") && (
            <button
              type="button"
              className="btn-secondaire mt-1"
              onClick={() => {
                setQuery("");
                setFilter("tous");
              }}
            >
              Tout afficher
            </button>
          )}
        </div>
      ) : (
        <ul className="liste-groupee" aria-label="Abonnements par échéance">
          {list.map((r) => (
            <SubscriptionItem key={r.id} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubscriptionItem({ row }: { row: BoardRow }) {
  const [remindState, remind, reminding] = useActionState(sendReminder, idle);
  const [renewState, renew, renewing] = useActionState(renewSubscription, idle);
  const feedback = [remindState, renewState].filter((s) => s.status !== "idle");

  return (
    <li className="flex flex-col gap-3 px-4 py-4 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Initials initials={row.initials} />
          <span className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2">
              <strong className="text-[17px] font-semibold">{row.fullName}</strong>
              <StatusBadge status={row.status} />
            </span>
            <span className="text-legende tabular-nums text-texte-2">
              {row.planName} · {row.periodLabel} · {row.priceLabel}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 md:items-end">
          <span className={`tabular-nums font-semibold ${row.overdue ? "text-peche-fonce" : ""}`}>Échéance {row.renewsLabel}</span>
          <span className="text-legende tabular-nums text-texte-2">
            {row.dueLabel}
            {row.reminderLabel ? ` · ${row.reminderLabel}` : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {row.near && (
          <form action={remind}>
            <input type="hidden" name="subscriptionId" value={row.id} />
            <button type="submit" className="btn-principal" disabled={reminding}>
              {reminding ? "Envoi…" : row.reminderLabel ? "Renvoyer le rappel J-7" : "Envoyer le rappel J-7"}
            </button>
          </form>
        )}
        <form action={renew}>
          <input type="hidden" name="subscriptionId" value={row.id} />
          <input type="hidden" name="renewsOn" value={row.renewsOn} />
          <button type="submit" className="btn-secondaire" disabled={renewing}>
            {renewing ? "Renouvellement…" : "Renouveler"}
          </button>
        </form>
      </div>

      <div aria-live="polite" className="flex flex-col gap-1">
        {feedback.map((s, i) => (
          <p key={i} role={s.status === "error" ? "alert" : undefined} className={`text-[15px] font-medium ${s.status === "error" ? "text-peche-fonce" : "text-olive-fonce"}`}>
            {s.message}
          </p>
        ))}
      </div>
    </li>
  );
}
