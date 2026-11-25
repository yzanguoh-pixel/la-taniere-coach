import { InvoiceBadge } from "./Badges";

/** Ligne de facture, textes déjà formatés côté serveur. */
export type InvoiceItem = {
  id: string;
  number: string;
  fullName?: string;
  dateLabel: string;
  amountLabel: string;
  status: string;
};

/** Liste groupée des factures (numéro, coaché éventuel, date, montant, statut payée / en attente). */
export function InvoiceList({ items, empty, label = "Factures" }: { items: InvoiceItem[]; empty: string; label?: string }) {
  if (!items.length) {
    return (
      <div className="liste-groupee px-5 py-4">
        <p className="text-texte-2">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="liste-groupee" aria-label={label}>
      {items.map((f) => (
        <li key={f.id} className="flex min-h-11 items-center justify-between gap-3 px-5 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{f.fullName ?? f.number}</span>
            <span className="text-legende tabular-nums text-texte-2">
              {f.fullName ? `${f.number} · ` : ""}
              {f.dateLabel}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="tabular-nums font-semibold">{f.amountLabel}</span>
            <InvoiceBadge status={f.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}
