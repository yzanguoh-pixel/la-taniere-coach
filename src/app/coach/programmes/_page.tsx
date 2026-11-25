import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconChevron } from "@/components/icons";
import { AdaptationBanner } from "@/components/programmes/editor/AdaptationBanner";
import { ProgramEditor } from "@/components/programmes/editor/ProgramEditor";
import type { EditorData } from "@/components/programmes/editor/types";
import { getExerciseLibrary } from "@/lib/programmes/templates";
import { editorSupabase, loadClientProgram, loadTemplate } from "./_data";

/** Corps commun des deux routes de l'éditeur (copie d'un coaché, modèle). */
export function EditorPage({ mode, args }: { mode: "copie" | "modele"; args: Promise<{ id: string; week: string | undefined }> }) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorArgs mode={mode} args={args} />
    </Suspense>
  );
}

async function EditorArgs({ mode, args }: { mode: "copie" | "modele"; args: Promise<{ id: string; week: string | undefined }> }) {
  const { id, week } = await args;
  return <EditorBody mode={mode} id={id} week={week} />;
}

async function EditorBody({ mode, id, week }: { mode: "copie" | "modele"; id: string; week: string | undefined }) {
  const ctx = await editorSupabase();
  if (!ctx) {
    return <p className="liste-groupee p-5 text-texte-2">Connectez-vous en tant que coach pour modifier ce programme.</p>;
  }
  const [data, exercises] = await Promise.all([
    mode === "copie" ? loadClientProgram(ctx.supabase, ctx.userId, id) : loadTemplate(ctx.supabase, ctx.userId, id),
    getExerciseLibrary(ctx.supabase),
  ]);
  if (!data) notFound();
  const basePath = mode === "copie" ? `/coach/programmes/${data.id}` : `/coach/programmes/modele/${data.id}`;
  return (
    <section className="flex flex-col gap-6">
      <Header data={data} />
      <AdaptationBanner data={data} />
      <ProgramEditor data={data} exercises={exercises} week={pickWeek(data, week)} basePath={basePath} />
    </section>
  );
}

/** Semaine demandée (?semaine=N), sinon la première semaine qui a encore une séance à faire. */
function pickWeek(data: EditorData, raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= data.weeks) return n;
  return data.sessions.find((s) => s.status === "planned")?.week ?? 1;
}

function Header({ data }: { data: EditorData }) {
  const back =
    data.mode === "copie" && data.clientId
      ? { href: `/coach/coaches/${data.clientId}`, label: data.clientFullName ?? "Fiche du coaché" }
      : { href: "/coach/modeles", label: "Modèles" };
  return (
    <header className="flex flex-col gap-2">
      <Link href={back.href} className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 font-semibold text-olive-fonce hover:underline">
        <IconChevron width={18} height={18} className="rotate-180" />
        {back.label}
      </Link>
      <h1 className="text-titre">{data.name}</h1>
      <p className="flex flex-wrap items-center gap-2 text-texte-2">
        <span className="rounded-full bg-olive-pale px-2.5 py-0.5 text-legende font-semibold text-olive-fonce">{data.mode === "copie" ? "Copie" : "Modèle"}</span>
        {data.mode === "copie" ? (
          <span>
            pour{" "}
            <Link href={`/coach/coaches/${data.clientId}`} className="font-semibold text-texte underline decoration-olive underline-offset-4">
              {data.clientFullName}
            </Link>
          </span>
        ) : (
          data.goal && <span>{data.goal}</span>
        )}
        <span className="tabular-nums">
          · {data.weeks} semaine{data.weeks > 1 ? "s" : ""}
          {data.mode === "copie" && data.startDate ? ` · depuis le ${new Date(data.startDate + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })}` : ""}
        </span>
      </p>
    </header>
  );
}

function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du programme" className="flex flex-col gap-6">
      <div className="h-11 w-40 animate-pulse rounded-full bg-separateur" />
      <div className="h-10 w-72 animate-pulse rounded-xl bg-separateur" />
      <div className="h-28 animate-pulse rounded-[20px] bg-olive-pale" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="liste-groupee h-96 animate-pulse" />
        <div className="liste-groupee hidden h-96 animate-pulse lg:block" />
      </div>
    </div>
  );
}
