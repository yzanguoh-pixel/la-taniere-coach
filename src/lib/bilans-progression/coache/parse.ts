import type { ProgressReportData, ReportLift, ReportWeekPoint } from "@/lib/bilans-progression/types";

/**
 * Lecture défensive de progress_reports.data (contrat ProgressReportData, version 1).
 * Renvoie null si le contenu est inutilisable : la page affiche alors « Ce bilan ne peut pas être affiché. »
 * Les champs facultatifs mal formés sont ramenés à null / tableau vide plutôt que de faire échouer l'affichage.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const count = (v: unknown): number => {
  const n = num(v);
  return n != null && n > 0 ? Math.round(n) : 0;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v: unknown): string | null => (typeof v === "string" && ISO_DATE.test(v) ? v : null);

function lift(v: unknown): ReportLift | null {
  if (!isObj(v)) return null;
  const exercise = str(v.exercise);
  if (!exercise) return null;
  const startKg = num(v.startKg);
  const endKg = num(v.endKg);
  const deltaKg = num(v.deltaKg) ?? (startKg != null && endKg != null ? Math.round((endKg - startKg) * 100) / 100 : null);
  return { exercise, startKg, endKg, deltaKg, bestSet: str(v.bestSet) };
}

function week(v: unknown): ReportWeekPoint | null {
  if (!isObj(v)) return null;
  const weekStart = date(v.weekStart);
  if (!weekStart) return null;
  return { weekStart, planned: count(v.planned), done: count(v.done), topKg: num(v.topKg) };
}

export function parseReportData(raw: unknown): ProgressReportData | null {
  if (!isObj(raw) || raw.version !== 1 || !isObj(raw.sessions)) return null;
  const s = raw.sessions;
  const planned = count(s.planned);
  const done = count(s.done);
  const pct = num(s.adherencePct);
  const adherencePct = pct != null ? Math.max(0, Math.round(pct)) : planned > 0 ? Math.round((done / planned) * 100) : 0;

  const w = isObj(raw.weight) ? raw.weight : {};
  const points = (Array.isArray(w.points) ? w.points : [])
    .map((p) => (isObj(p) && date(p.date) && num(p.kg) != null ? { date: p.date as string, kg: p.kg as number } : null))
    .filter((p): p is { date: string; kg: number } => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const wStart = num(w.startKg);
  const wEnd = num(w.endKg);

  const n = isObj(raw.nutrition) ? raw.nutrition : null;
  const g = isObj(raw.goal) ? raw.goal : {};

  return {
    version: 1,
    sessions: { planned, done, presentiel: count(s.presentiel), solo: count(s.solo), adherencePct },
    rpeAvg: num(raw.rpeAvg),
    lifts: (Array.isArray(raw.lifts) ? raw.lifts : []).map(lift).filter((l): l is ReportLift => l !== null),
    weeks: (Array.isArray(raw.weeks) ? raw.weeks : [])
      .map(week)
      .filter((x): x is ReportWeekPoint => x !== null)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    weight: {
      startKg: wStart,
      endKg: wEnd,
      deltaKg: num(w.deltaKg) ?? (wStart != null && wEnd != null ? Math.round((wEnd - wStart) * 10) / 10 : null),
      points,
    },
    nutrition: n ? { daysLogged: count(n.daysLogged), avgKcal: num(n.avgKcal), targetKcal: num(n.targetKcal) } : null,
    goal: { label: str(g.label), target: str(g.target), progressText: str(g.progressText) },
    highlights: (Array.isArray(raw.highlights) ? raw.highlights : []).map(str).filter((h): h is string => h !== null),
    nextFocus: str(raw.nextFocus),
  };
}

/** « Squat 60 / 70 kg » → 0,857… ; null si le texte ne contient pas « valeur / cible ». */
export function goalRatio(progressText: string | null): { current: number; target: number; ratio: number } | null {
  if (!progressText) return null;
  const m = progressText.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const current = Number(m[1].replace(",", "."));
  const target = Number(m[2].replace(",", "."));
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;
  return { current, target, ratio: Math.max(0, Math.min(1, current / target)) };
}

/** Vrai si le bilan contient au moins une rubrique affichable. */
export function hasContent(d: ProgressReportData): boolean {
  return (
    d.sessions.planned > 0 ||
    d.sessions.done > 0 ||
    d.rpeAvg != null ||
    d.lifts.length > 0 ||
    d.weeks.length > 0 ||
    d.weight.deltaKg != null ||
    d.weight.points.length > 1 ||
    (d.nutrition != null && (d.nutrition.daysLogged > 0 || d.nutrition.avgKcal != null)) ||
    d.goal.label != null ||
    d.goal.progressText != null ||
    d.highlights.length > 0 ||
    d.nextFocus != null
  );
}
