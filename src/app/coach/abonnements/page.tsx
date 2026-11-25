import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceList, type InvoiceItem } from "@/components/abonnements/InvoiceList";
import { SubscriptionBoard, type BoardRow } from "@/components/abonnements/SubscriptionBoard";
import { asPeriod, daysBetween, dueLabel, effectiveStatus, periodLabel, priceLabel, REMINDER_DAYS, shortDay } from "@/lib/abonnements/format";
import { abonnementsSupabase, getPricePlaceholder, lastReminders, listInvoices, listSubscriptions } from "@/lib/abonnements/queries";
import { todayParis } from "@/lib/progression/compute";

export const metadata: Metadata = { title: "Abonnements" };

/** C8 — Abonnements : échéances, rappel J-7 avec bilan de progression (envoi simulé), renouvellement et factures. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton />}>
        <Content />
      </Suspense>
    </section>
  );
}

async function Content() {
  const supabase = await abonnementsSupabase();
  if (!supabase) return <Shell sub={null}><Notice title="Données indisponibles" text="La base de données n’est pas configurée sur cet environnement." /></Shell>;

  let rows: BoardRow[];
  let invoices: InvoiceItem[];
  let pending = 0;
  let priceNote: string | null = null;
  try {
    const [subs, invs, placeholder, reminders] = await Promise.all([listSubscriptions(supabase), listInvoices(supabase), getPricePlaceholder(supabase), lastReminders(supabase)]);
    const today = todayParis();
    if (subs.some((x) => x.priceEur === null)) priceNote = placeholder;
    rows = subs
      .filter((s) => s.status !== "resilie")
      .map((s) => {
        const left = daysBetween(today, s.renewsOn);
        const sent = reminders.get(s.id);
        return {
          id: s.id,
          fullName: s.fullName,
          initials: s.initials,
          planName: s.planName,
          periodLabel: periodLabel[asPeriod(s.period)],
          priceLabel: priceLabel(s.priceEur, placeholder),
          renewsOn: s.renewsOn,
          renewsLabel: shortDay(s.renewsOn),
          dueLabel: dueLabel(s.renewsOn, today),
          status: effectiveStatus(s.status, s.renewsOn, today),
          near: left <= REMINDER_DAYS,
          overdue: left < 0,
          reminderLabel: sent ? `rappel envoyé le ${shortDay(todayParis(new Date(sent)))}` : null,
        };
      });
    pending = invs.filter((f) => f.status === "en_attente").length;
    invoices = invs.map((f) => ({
      id: f.id,
      number: f.number,
      fullName: f.fullName,
      dateLabel: shortDay(f.issuedOn),
      amountLabel: priceLabel(f.amountEur, placeholder),
      status: f.status,
    }));
  } catch (e) {
    return <Shell sub={null}><Notice title="Impossible de charger les abonnements" text={e instanceof Error ? e.message : "Réessaie dans un instant."} /></Shell>;
  }

  const n = (k: BoardRow["status"]) => rows.filter((r) => r.status === k).length;
  const toRenew = n("a_renouveler");
  const late = n("en_retard");
  const sub = [`${rows.length} abonnement${rows.length > 1 ? "s" : ""}`, toRenew ? `${toRenew} à renouveler` : null, late ? `${late} en retard` : null].filter(Boolean).join(", ");

  return (
    <Shell sub={sub}>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Actifs" value={n("actif")} className="bg-olive-pale text-olive-fonce" />
        <Stat label="À renouveler" value={toRenew} className="bg-beurre text-beurre-fonce" />
        <Stat label="En retard" value={late} className="bg-peche text-peche-fonce" />
      </div>

      <SubscriptionBoard rows={rows} />

      <section aria-labelledby="factures" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="factures" className="text-sous-titre">Factures</h2>
          <span className="text-legende tabular-nums text-texte-2">
            {invoices.length} facture{invoices.length > 1 ? "s" : ""}
            {pending ? `, ${pending} en attente` : ""}
          </span>
        </div>
        <InvoiceList items={invoices} empty="Aucune facture pour le moment." />
        <p className="text-legende text-texte-2">
          Paiement simulé : aucun encaissement réel.{priceNote ? ` Les montants restent à « ${priceNote} » tant que les tarifs ne sont pas fixés.` : ""}
        </p>
      </section>
    </Shell>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-[20px] px-4 py-3 ${className}`}>
      <span className="text-[28px] font-bold leading-none tabular-nums">{value}</span>
      <span className="text-legende font-semibold">{label}</span>
    </div>
  );
}

function Shell({ sub, children }: { sub: string | null; children: React.ReactNode }) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-titre">Abonnements</h1>
        {sub && <p className="text-texte-2 tabular-nums">{sub}</p>}
      </header>
      {children}
    </>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="liste-groupee flex flex-col gap-1 p-5">
      <strong>{title}</strong>
      <span className="text-texte-2">{text}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des abonnements" className="flex flex-col gap-6">
      <div className="h-10 w-56 animate-pulse rounded-xl bg-separateur" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-[20px] bg-separateur" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[20px] bg-separateur" />
    </div>
  );
}
