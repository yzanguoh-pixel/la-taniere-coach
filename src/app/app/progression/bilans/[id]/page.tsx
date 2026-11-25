import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getMyReport } from "@/lib/bilans-progression/coache/data";
import { hasContent } from "@/lib/bilans-progression/coache/parse";
import { CoachNote, ReportBody, ReportHeader, ReportUnavailable } from "@/components/bilans-progression/coache/ReportView";
import { MarkReportRead } from "@/components/bilans-progression/coache/MarkReportRead";
import { IconChevron } from "@/components/icons";

export const metadata: Metadata = { title: "Mon bilan de progression" };

function BackLink() {
  return (
    <Link href="/app/progression#mes-bilans" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] font-semibold text-olive-fonce hover:underline">
      <IconChevron width={18} height={18} aria-hidden="true" className="rotate-180" />
      Ma progression
    </Link>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <section className="flex flex-col pb-6">
      <BackLink />
      <Suspense
        fallback={
          <div aria-busy="true" className="mt-2 flex flex-col gap-4">
            <div className="h-20 animate-pulse rounded-[20px] bg-olive-pale" />
            <div className="h-48 animate-pulse rounded-[20px] bg-olive-pale" />
          </div>
        }
      >
        <ReportContent params={params} />
      </Suspense>
    </section>
  );
}

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getMyReport(id);

  if (res.state !== "ok") {
    return (
      <div className="mt-2">
        <h1 className="text-titre">Bilan</h1>
        <p role="status" className="liste-groupee mt-6 p-5 text-[15px] text-texte-2">
          {res.state === "introuvable" ? "Ce bilan est introuvable." : "Ce bilan n’a pas pu être chargé. Réessaie dans quelques instants."}
        </p>
      </div>
    );
  }

  const { report, coachFirstName } = res;
  return (
    <article className="mt-2">
      {report.readAt === null && <MarkReportRead reportId={report.id} />}
      <ReportHeader meta={report} coachFirstName={coachFirstName} />
      {report.coachNote && <CoachNote note={report.coachNote} coachFirstName={coachFirstName} />}
      {report.data && hasContent(report.data) ? <ReportBody data={report.data} /> : <ReportUnavailable />}
    </article>
  );
}
