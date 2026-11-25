import type { ProgressReportData } from "@/lib/bilans-progression/types";
import { ProgressReport } from "@/components/bilans-progression/report/ProgressReport";

/**
 * Aperçu coach d'un bilan de progression : exactement le composant que verra le coaché (variant « coach »).
 * Les anciennes props restent acceptées : `targetKg` est ignoré (l'objectif est désormais porté par chaque exercice, lifts[].targetKg).
 * Sans `periodStart` / `periodEnd`, la période est déduite des semaines du bilan.
 * `exerciseParam` / `viewParam` : valeurs de ?exercice= et ?vue= si la page les lit ; sinon la navigation se fait côté client.
 */
export function ReportPreview({
  data,
  title,
  coachNote = null,
  coachName = "Ton coach",
  periodStart,
  periodEnd,
  exerciseParam = null,
  viewParam = null,
}: {
  data: ProgressReportData;
  title: string;
  coachNote?: string | null;
  coachName?: string;
  periodStart?: string;
  periodEnd?: string;
  exerciseParam?: string | null;
  viewParam?: string | null;
  /** @deprecated ignoré : voir lifts[].targetKg */
  targetKg?: number | null;
}) {
  const weeks = data.weeks;
  const start = periodStart ?? weeks[0]?.weekStart ?? "";
  const end = periodEnd ?? (weeks.length ? addDays(weeks[weeks.length - 1].weekStart, 6) : start);
  return (
    <ProgressReport
      data={data}
      meta={{ title, periodStart: start, periodEnd: end, coachName, coachNote }}
      variant="coach"
      exerciseParam={exerciseParam}
      viewParam={viewParam}
    />
  );
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
