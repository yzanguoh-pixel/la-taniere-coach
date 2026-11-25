import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/abonnements/Badges";
import { InvoiceList } from "@/components/abonnements/InvoiceList";
import { IconChevron, IconConnexions, IconProfil } from "@/components/icons";
import { LogoutButton } from "@/components/LogoutButton";
import { asPeriod, dueLabel, effectiveStatus, longDay, periodLabel, priceLabel, shortDay } from "@/lib/abonnements/format";
import { getMyProfile } from "@/lib/abonnements/queries";
import { todayParis } from "@/lib/progression/compute";

export const metadata: Metadata = { title: "Profil" };

const levelLabel: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mx-1 mb-2 mt-7 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">
      {children}
    </h2>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-texte-2">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/** M6 — Profil de la coachée : identité, abonnement (formule, échéance, factures), infos et lien vers Connexions. */
export default function Page() {
  return (
    <section className="flex flex-col">
      <Suspense fallback={<Skeleton />}>
        <Content />
      </Suspense>
    </section>
  );
}

async function Content() {
  const me = await getMyProfile().catch(() => null);
  if (!me) {
    return (
      <>
        <h1 className="text-titre">Profil</h1>
        <div className="liste-groupee mt-6 flex flex-col gap-1 p-5">
          <strong>Profil indisponible</strong>
          <span className="text-[15px] text-texte-2">Impossible de charger ton profil pour le moment. Réessaie dans quelques instants.</span>
        </div>
      </>
    );
  }

  const today = todayParis();
  const sub = me.subscription;
  const c = me.client;

  return (
    <>
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-olive-pale text-[22px] font-semibold text-olive-fonce">
          {me.initials || <IconProfil width={28} height={28} />}
        </span>
        <span className="flex min-w-0 flex-col">
          <h1 className="text-titre">{me.fullName}</h1>
          {me.coachName && <span className="text-[15px] text-texte-2">Coachée par {me.coachName}</span>}
        </span>
      </header>

      <SectionTitle id="abonnement">Mon abonnement</SectionTitle>
      {sub ? (
        <div aria-labelledby="abonnement" className="liste-groupee">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="flex min-w-0 flex-col">
              <strong className="text-sous-titre">{sub.planName}</strong>
              <span className="text-[15px] tabular-nums text-texte-2">
                {periodLabel[asPeriod(sub.period)]} · {priceLabel(sub.priceEur, me.pricePlaceholder)}
              </span>
            </span>
            <StatusBadge status={effectiveStatus(sub.status, sub.renewsOn, today)} />
          </div>
          <dl className="divide-y divide-separateur border-t border-separateur">
            <Row label="Prochaine échéance">
              {longDay(sub.renewsOn)}
              <span className="block text-legende font-normal text-texte-2">{dueLabel(sub.renewsOn, today)}</span>
            </Row>
            <Row label="Depuis le">{longDay(sub.startsOn)}</Row>
          </dl>
        </div>
      ) : (
        <div className="liste-groupee px-5 py-4">
          <p className="text-[15px] text-texte-2">Aucun abonnement en cours. Parles-en à ton coach dans Messages.</p>
        </div>
      )}

      <SectionTitle id="factures">Mes factures</SectionTitle>
      <InvoiceList
        label="Mes factures"
        empty="Aucune facture pour le moment."
        items={me.invoices.map((f) => ({
          id: f.id,
          number: f.number,
          dateLabel: shortDay(f.issuedOn),
          amountLabel: priceLabel(f.amountEur, me.pricePlaceholder),
          status: f.status,
        }))}
      />
      <p className="mx-1 mt-2 text-legende text-texte-2">Paiement simulé dans cette démo : aucun prélèvement réel.</p>

      <SectionTitle id="infos">Mes infos</SectionTitle>
      <dl aria-labelledby="infos" className="liste-groupee">
        {me.email && <Row label="E-mail"><span className="break-all">{me.email}</span></Row>}
        {c?.goal && <Row label="Objectif">{c.goal}</Row>}
        {c?.level && <Row label="Niveau">{levelLabel[c.level] ?? c.level}</Row>}
        {c?.sessionsPerWeek != null && <Row label="Séances par semaine">{c.sessionsPerWeek}</Row>}
        {c?.weightKg != null && <Row label="Poids">{c.weightKg.toLocaleString("fr-FR")} kg</Row>}
        {c?.heightCm != null && <Row label="Taille">{c.heightCm} cm</Row>}
        {c?.injuries && <Row label="À ménager">{c.injuries}</Row>}
        {c && c.foodExclusions.length > 0 && <Row label="Aliments exclus">{c.foodExclusions.join(", ")}</Row>}
        {c?.since && <Row label="Suivie depuis le">{longDay(c.since)}</Row>}
      </dl>

      <SectionTitle id="reglages">Réglages</SectionTitle>
      <div className="liste-groupee">
        <Link href="/app/connexions" className="flex min-h-11 items-center gap-3 px-5 py-3 transition-colors hover:bg-fond">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-ciel text-ciel-fonce">
            <IconConnexions width={20} height={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">Connexions</span>
            <span className="text-legende text-texte-2">Montre, balance, agendas</span>
          </span>
          <IconChevron width={18} height={18} className="text-icone" />
        </Link>
        <div className="px-2 py-1">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du profil" className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-separateur" />
        <div className="h-9 w-40 animate-pulse rounded-xl bg-separateur" />
      </div>
      <div className="h-32 animate-pulse rounded-[20px] bg-separateur" />
      <div className="h-40 animate-pulse rounded-[20px] bg-separateur" />
    </div>
  );
}
