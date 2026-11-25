import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { bilansSupabase, getBilan } from "@/lib/bilans/data";
import { buildSummary, fmtBookingDate, fmtSavedAt } from "@/lib/bilans/synthese";
import { Avatar } from "@/components/coach/UrgencyBadge";
import { SaveSummary } from "@/components/bilans/SaveSummary";
import { TestsForm } from "@/components/bilans/TestsForm";
import { ConvertForm } from "@/components/bilans/ConvertForm";

export const metadata: Metadata = { title: "Bilan" };

type Props = { params: Promise<{ id: string }> };

/** C5 — Bilan offert : synthèse du questionnaire (US09), tests physiques (US10), « Convertir en coachée » (US11). */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<BilanSkeleton />}>
      <Bilan params={params} />
    </Suspense>
  );
}

const STATUS_LABEL: Record<string, string> = {
  demande: "Demande reçue",
  confirme: "Bilan confirmé",
  realise: "Bilan réalisé",
  annule: "Annulé",
  converti: "Convertie en coachée",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function savedAtOf(summary: unknown): string | null {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const at = (summary as Record<string, unknown>).generated_at;
  return typeof at === "string" ? fmtSavedAt(at) : null;
}

async function Bilan({ params }: Props) {
  const { id } = await params;
  const supabase = await bilansSupabase();
  if (!supabase) return <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : le bilan ne peut pas être chargé.</p>;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const bilan = await getBilan(supabase, id, user.id);
  if (!bilan) notFound();

  const first = bilan.fullName.split(" ")[0] ?? bilan.fullName;
  const summary = buildSummary(bilan.answers, bilan.templates, bilan.tests);
  const filled = bilan.answers != null && bilan.intakeStatus === "recu";
  const converted = bilan.convertedClientId != null || bilan.status === "converti";
  const savedLabel = savedAtOf(bilan.savedSummary);

  return (
    <article className="flex flex-col gap-8">
      <div>
        <Link href="/coach/agenda" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce hover:underline">
          ← Agenda
        </Link>
        <header className="mt-2 flex items-center gap-4">
          <Avatar initials={initialsOf(bilan.fullName)} size={56} />
          <div className="min-w-0">
            <h1 className="text-titre break-words">Bilan de {bilan.fullName}</h1>
            <p className="mt-1 text-texte-2">
              {fmtBookingDate(bilan.startsAt)} · {bilan.format === "salle" ? "En salle" : "En visio"} ·{" "}
              <span className="tabular-nums">{bilan.phone}</span>
            </p>
          </div>
        </header>
        <p className="mt-3">
          <span className={`rounded-full px-3 py-1 text-legende font-semibold ${converted ? "bg-olive-pale text-olive-fonce" : "bg-separateur text-texte-2"}`}>
            {STATUS_LABEL[bilan.status] ?? bilan.status}
          </span>
        </p>
      </div>

      {converted && (
        <section aria-labelledby="converti-titre" className="flex flex-col gap-3 rounded-[20px] bg-olive-pale p-5">
          <h2 id="converti-titre" className="text-sous-titre text-olive-fonce">
            {first} est maintenant coachée
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            {bilan.convertedProgramId && (
              <Link href={`/coach/programmes/${bilan.convertedProgramId}`} className="btn-principal">
                Ouvrir son programme
              </Link>
            )}
            {bilan.convertedClientId && (
              <Link href={`/coach/coaches/${bilan.convertedClientId}`} className="btn-secondaire">
                Voir sa fiche
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="synthese-titre" className="flex flex-col gap-3">
          <h2 id="synthese-titre" className="text-sous-titre">
            Synthèse du questionnaire
          </h2>
          {filled ? (
            <>
              {summary.vigilance.length > 0 && (
                <div className="rounded-[20px] bg-peche px-5 py-4">
                  <p className="text-legende font-semibold text-peche-fonce">Point de vigilance</p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {summary.vigilance.map((v) => (
                      <li key={v} className="text-[17px] font-semibold text-peche-fonce">
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <dl className="liste-groupee">
                <Fact label="Objectif" value={summary.objectif ?? "Non renseigné"} strong />
                <Fact label="Disponibilités" value={summary.disponibilites ?? "Non renseignées"} />
                <Fact label="Niveau" value={summary.niveau_label ?? "Non renseigné"} />
                {summary.experience && <Fact label="Expérience" value={summary.experience} />}
                {summary.alimentation && <Fact label="Alimentation" value={summary.alimentation} />}
                {summary.sommeil && <Fact label="Sommeil" value={summary.sommeil} />}
              </dl>
              {!converted && <SaveSummary bookingId={bilan.bookingId} savedLabel={savedLabel} />}
            </>
          ) : (
            <p className="liste-groupee p-5 text-texte-2">{first} n’a pas encore rempli le questionnaire : la synthèse apparaîtra dès sa réception.</p>
          )}
        </section>

        <aside aria-labelledby="modele-titre" className="flex flex-col gap-3">
          <h2 id="modele-titre" className="text-sous-titre">
            Modèle conseillé
          </h2>
          {filled && summary.modele_conseille ? (
            <div className="liste-groupee flex flex-col gap-3 p-5">
              <p className="text-[20px] font-semibold">{summary.modele_conseille.name}</p>
              <p className="text-[15px] text-texte-2">{summary.modele_conseille.reason}</p>
              {summary.adaptations.length > 0 && (
                <ul aria-label="Adaptations prévues" className="flex flex-wrap gap-1.5">
                  {summary.adaptations.map((a) => (
                    <li key={a} className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="liste-groupee p-5 text-texte-2">{filled ? "Aucun modèle dans ta bibliothèque." : "Disponible après le questionnaire."}</p>
          )}
        </aside>
      </div>

      <section aria-labelledby="tests-titre" className="flex flex-col gap-3">
        <div>
          <h2 id="tests-titre" className="text-sous-titre">
            Tests physiques
          </h2>
          <p className="mt-1 text-[15px] text-texte-2">
            À saisir pendant le bilan. Tous les champs sont facultatifs.
            {bilan.tests?.saved_at ? ` Derniers tests enregistrés le ${fmtSavedAt(bilan.tests.saved_at)}.` : ""}
          </p>
        </div>
        <TestsForm bookingId={bilan.bookingId} tests={bilan.tests} disabled={converted} />
      </section>

      {!converted && filled && bilan.status !== "annule" && (
        <section aria-labelledby="convertir-titre" className="flex flex-col gap-3">
          <h2 id="convertir-titre" className="text-sous-titre">
            Convertir en coachée
          </h2>
          <ConvertForm
            bookingId={bilan.bookingId}
            firstName={first}
            templates={bilan.templates}
            recommendedId={summary.modele_conseille?.id ?? null}
            adaptations={summary.adaptations}
          />
        </section>
      )}
    </article>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <dt className="text-legende text-texte-2">{label}</dt>
      <dd className={`text-[17px] ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}

function BilanSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du bilan" className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <span className="size-14 animate-pulse rounded-full bg-separateur" />
        <span className="h-9 w-64 animate-pulse rounded-lg bg-separateur" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="liste-groupee h-80 animate-pulse" />
        <div className="liste-groupee h-60 animate-pulse" />
      </div>
    </div>
  );
}
