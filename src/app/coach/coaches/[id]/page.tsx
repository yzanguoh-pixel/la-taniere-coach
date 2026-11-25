import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { coachSupabase } from "@/lib/coach/supabase";
import { getClientFile, type ClientFile } from "@/lib/coach/queries";
import { feelingLabel, firstName, fmtDateTime, fmtKg, relativeTime, urgencyOf } from "@/lib/coach/format";
import { listThread } from "@/lib/messages/thread";
import { ActivitiesCard } from "@/components/connexions/ActivitiesCard";
import { AdjustLoad } from "@/components/coach/AdjustLoad";
import { ClientThread } from "@/components/coach/ClientThread";
import { PlanVsDone } from "@/components/coach/PlanVsDone";
import { Avatar, RpeChip, UrgencyBadge } from "@/components/coach/UrgencyBadge";

export const metadata: Metadata = { title: "Fiche coaché" };

type Props = { params: Promise<{ id: string }> };

/** US20 — Fiche coaché : identité, dernier retour, prévu / réalisé, ajustement de charge, fil de messages. */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<FicheSkeleton />}>
      <Fiche params={params} />
    </Suspense>
  );
}

const levelLabel: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", confirme: "Confirmé" };

function suggestionFor(f: ClientFile): string | null {
  const fb = f.lastFeedback;
  if (!fb || fb.handled_at) return null;
  const name = firstName(f.fullName);
  switch (urgencyOf(fb)) {
    case 1:
      return `Douleur signalée${fb.pain_zone ? ` (${fb.pain_zone})` : ""} : pense à alléger ou à garder la charge.`;
    case 2:
      return `Charge ressentie trop haute (RPE ${fb.rpe}) : une baisse de 2,5 kg est conseillée.`;
    case 3:
      return `Séance ressentie facile (RPE ${fb.rpe}) : ${name} peut monter de 2,5 kg.`;
    default:
      return `Retour conforme (RPE ${fb.rpe}) : les charges peuvent rester telles quelles.`;
  }
}

function targetsText(targets: Record<string, unknown>): string[] {
  return Object.entries(targets)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => {
      const label = k.replace(/_kg$/, "").replace(/_/g, " ");
      return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${fmtKg(v as number)}${k.endsWith("_kg") ? " kg" : ""}`;
    });
}

async function Fiche({ params }: Props) {
  const { id } = await params;
  const supabase = await coachSupabase();
  if (!supabase) return <p className="liste-groupee p-5 text-texte-2">Supabase n’est pas configuré : la fiche ne peut pas être chargée.</p>;
  const file = await getClientFile(supabase, id);
  if (!file) notFound();
  const now = new Date();
  const messages = await listThread(file.id).catch(() => []);
  const name = firstName(file.fullName);
  const fb = file.lastFeedback;
  const goals = targetsText(file.targets);

  return (
    <article className="flex flex-col gap-8">
      <div>
        <Link href="/coach" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-olive-fonce hover:underline">
          ← Vue d’ensemble
        </Link>
        <header className="mt-2 flex items-center gap-4">
          <Avatar initials={file.initials} size={56} />
          <div className="min-w-0">
            <h1 className="text-titre break-words">{file.fullName}</h1>
            <p className="mt-1 text-texte-2">{file.program ? `Programme « ${file.program.name} »` : "Aucun programme actif"}</p>
          </div>
        </header>
        {file.program && file.program.adaptations.length > 0 && (
          <ul aria-label="Adaptations du programme" className="mt-3 flex flex-wrap gap-1.5">
            {file.program.adaptations.map((a) => (
              <li key={a} className="rounded-full bg-olive-pale px-3 py-1 text-legende font-semibold text-olive-fonce">
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="retour-titre" className="flex flex-col gap-3">
            <h2 id="retour-titre" className="text-sous-titre">Dernier retour</h2>
            {fb ? (
              <div className="liste-groupee p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {fb.handled_at ? (
                    <span className="rounded-full bg-separateur px-2.5 py-0.5 text-legende font-semibold text-texte-2">Traité</span>
                  ) : (
                    <UrgencyBadge urgency={urgencyOf(fb)} detail={urgencyOf(fb) === 1 ? fb.pain_zone : null} />
                  )}
                  <RpeChip rpe={fb.rpe} />
                  <span className="rounded-full bg-separateur px-2.5 py-0.5 text-legende font-semibold text-texte-2">Ressenti : {feelingLabel[fb.feeling] ?? fb.feeling}</span>
                </div>
                <blockquote className="mt-3 rounded-[16px] bg-fond px-4 py-3 text-[17px]">{fb.note?.trim() || "Pas de mot laissé."}</blockquote>
                <p className="mt-2 text-legende tabular-nums text-texte-2">
                  {fb.sessionName ? `Séance « ${fb.sessionName} » · ` : ""}
                  envoyé {relativeTime(fb.created_at, now)} ({fmtDateTime(fb.created_at)})
                  {fb.handled_at ? ` · traité le ${fmtDateTime(fb.handled_at)}` : ""}
                </p>
              </div>
            ) : (
              <p className="liste-groupee p-5 text-texte-2">{name} n’a pas encore envoyé de retour.</p>
            )}
          </section>

          <section aria-labelledby="ajuster-titre" className="flex flex-col gap-3">
            <h2 id="ajuster-titre" className="text-sous-titre">Ajuster la charge</h2>
            <AdjustLoad clientId={file.id} feedbackId={file.openFeedbackId} firstName={name} exercises={file.adjustable} suggestion={suggestionFor(file)} />
          </section>
        </div>

        <aside aria-labelledby="profil-titre" className="flex flex-col gap-3">
          <h2 id="profil-titre" className="text-sous-titre">Profil</h2>
          <dl className="liste-groupee">
            <Fact label="Objectif" value={file.goal ?? "Non renseigné"} />
            {goals.length > 0 && <Fact label="Cible" value={goals.join(" · ")} />}
            <Fact label="Blessures" value={file.injuries?.trim() || "Aucune signalée"} tone={file.injuries?.trim() ? "alerte" : undefined} />
            {file.level && <Fact label="Niveau" value={levelLabel[file.level] ?? file.level} />}
            {file.sessionsPerWeek != null && <Fact label="Rythme" value={`${file.sessionsPerWeek} séance${file.sessionsPerWeek > 1 ? "s" : ""} par semaine`} />}
            {file.weightKg != null && <Fact label="Poids" value={`${fmtKg(file.weightKg)} kg`} />}
          </dl>
          <Link
            href={`/coach/coaches/${file.id}/nutrition`}
            className="liste-groupee flex min-h-11 items-center justify-between px-4 py-3 font-semibold text-olive-fonce hover:bg-fond"
          >
            Nutrition de {name} <span aria-hidden>›</span>
          </Link>
          <ActivitiesCard clientId={file.id} firstName={name} />
        </aside>
      </div>

      <section aria-labelledby="prevu-titre" className="flex flex-col gap-3">
        <h2 id="prevu-titre" className="text-sous-titre">Prévu / réalisé</h2>
        <PlanVsDone sessions={file.recent} />
      </section>

      <section aria-labelledby="fil-titre" className="flex flex-col gap-3">
        <h2 id="fil-titre" className="text-sous-titre">Messages avec {name}</h2>
        <ClientThread messages={messages} firstName={name} now={now} />
      </section>
    </article>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "alerte" }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3">
      <dt className="text-legende text-texte-2">{label}</dt>
      <dd className={`text-[16px] ${tone === "alerte" ? "font-semibold text-peche-fonce" : ""}`}>{value}</dd>
    </div>
  );
}

function FicheSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche" className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <span className="size-14 animate-pulse rounded-full bg-separateur" />
        <span className="h-9 w-64 animate-pulse rounded-lg bg-separateur" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="liste-groupee h-80 animate-pulse" />
        <div className="liste-groupee h-60 animate-pulse" />
      </div>
    </div>
  );
}
