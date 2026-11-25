import { invoiceMeta, statusMeta, type SubStatus } from "@/lib/abonnements/format";

/** Pastille de statut d'abonnement (Actif, À renouveler, En retard, Résilié). */
export function StatusBadge({ status }: { status: SubStatus }) {
  const m = statusMeta[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-legende font-semibold ${m.className}`}>{m.label}</span>;
}

/** Pastille de statut de facture (Payée, En attente). */
export function InvoiceBadge({ status }: { status: string }) {
  const m = invoiceMeta[status] ?? { label: status, className: "bg-separateur text-texte-2" };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-legende font-semibold ${m.className}`}>{m.label}</span>;
}

export function Initials({ initials }: { initials: string }) {
  return (
    <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-olive-pale text-[14px] font-semibold text-olive-fonce">
      {initials}
    </span>
  );
}
