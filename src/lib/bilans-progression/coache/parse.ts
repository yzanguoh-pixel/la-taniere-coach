import {
  PROFILE_AXES,
  type LiftSession,
  type LiftWeek,
  type ProfileAxis,
  type ProfileScore,
  type ProgressReportData,
  type ReportLift,
  type ReportWeekPoint,
} from "@/lib/bilans-progression/types";

/**
 * Lecture défensive de progress_reports.data (contrat ProgressReportData, version 2).
 *  - `ok` : contenu v2 utilisable (les champs mal formés sont ramenés à null / tableau vide) ;
 *  - `ancien` : bilan version 1, envoyé avant la nouvelle version (on n'affiche que le mot du coach) ;
 *  - `invalide` : contenu inutilisable (« Ce bilan ne peut pas être affiché. »).
 */
export type ParsedReport = { status: "ok"; data: ProgressReportData } | { status: "ancien" } | { status: "invalide" };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pos = (v: unknown): number | null => {
  const n = num(v);
  return n != null && n >= 0 ? n : null;
};
const count = (v: unknown): number => {
  const n = num(v);
  return n != null && n > 0 ? Math.round(n) : 0;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v: unknown): string | null => (typeof v === "string" && ISO_DATE.test(v) ? v : null);
const round = (n: number, step: number) => Math.round(n / step) * step;
const strings = (v: unknown): string[] => [...new Set(arr(v).map(str).filter((s): s is string => s !== null))];
const byDate = <T,>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b));
const notNull = <T,>(x: T | null): x is T => x !== null;

/** Note 0–5 à une décimale ; hors bornes → ramenée dans [0, 5]. */
const score = (v: unknown): number | null => {
  const n = num(v);
  return n == null ? null : Math.round(Math.min(5, Math.max(0, n)) * 10) / 10;
};

function profile(v: unknown): ProfileScore[] {
  const byAxis = new Map<ProfileAxis, ProfileScore>();
  for (const p of arr(v)) {
    if (!isObj(p) || !PROFILE_AXES.includes(p.axis as ProfileAxis)) continue;
    const axis = p.axis as ProfileAxis;
    if (byAxis.has(axis)) continue;
    byAxis.set(axis, { axis, before: score(p.before), after: score(p.after), detail: str(p.detail) ?? "", rule: str(p.rule) ?? "" });
  }
  if (byAxis.size === 0) return [];
  // Toujours les 6 axes, dans l'ordre du radar : un axe absent est « sans données ».
  return PROFILE_AXES.map((axis) => byAxis.get(axis) ?? { axis, before: null, after: null, detail: "", rule: "" });
}

function liftWeek(v: unknown): LiftWeek | null {
  if (!isObj(v)) return null;
  const weekStart = date(v.weekStart);
  if (!weekStart) return null;
  return { weekStart, topKg: pos(v.topKg), e1rm: pos(v.e1rm), volumeKg: pos(v.volumeKg) ?? 0, setsDone: count(v.setsDone) };
}

function liftSession(v: unknown): LiftSession | null {
  if (!isObj(v)) return null;
  const d = date(v.date);
  if (!d) return null;
  const sets = arr(v.sets)
    .map((s) => (isObj(s) ? { reps: pos(s.reps), kg: pos(s.kg), rpe: pos(s.rpe) } : null))
    .filter(notNull)
    .filter((s) => s.reps != null || s.kg != null);
  return {
    date: d,
    sessionName: str(v.sessionName) ?? "Séance",
    mode: v.mode === "presentiel" ? "presentiel" : "solo",
    sets,
    bestSet: str(v.bestSet),
    e1rm: pos(v.e1rm),
  };
}

function lift(v: unknown, i: number): ReportLift | null {
  if (!isObj(v)) return null;
  const exercise = str(v.exercise);
  if (!exercise) return null;
  const startKg = pos(v.startKg);
  const endKg = pos(v.endKg);
  return {
    exerciseId: str(v.exerciseId) ?? `exercice-${i + 1}`,
    exercise,
    category: str(v.category) ?? "",
    startKg,
    endKg,
    deltaKg: num(v.deltaKg) ?? (startKg != null && endKg != null ? round(endKg - startKg, 0.01) : null),
    startE1rm: pos(v.startE1rm),
    endE1rm: pos(v.endE1rm),
    prKg: pos(v.prKg),
    bestSet: str(v.bestSet),
    targetKg: num(v.targetKg) != null && (v.targetKg as number) > 0 ? (v.targetKg as number) : null,
    weeks: arr(v.weeks).map(liftWeek).filter(notNull).sort(byDate((w) => w.weekStart)),
    sessions: arr(v.sessions).map(liftSession).filter(notNull).sort(byDate((s) => s.date)),
  };
}

function week(v: unknown): ReportWeekPoint | null {
  if (!isObj(v)) return null;
  const weekStart = date(v.weekStart);
  if (!weekStart) return null;
  const done = count(v.done);
  return { weekStart, planned: count(v.planned), done, presentiel: Math.min(done, count(v.presentiel)), topKg: pos(v.topKg), volumeKg: pos(v.volumeKg) ?? 0 };
}

function parseV2(raw: Obj): ProgressReportData | null {
  if (!isObj(raw.sessions)) return null;
  const s = raw.sessions;
  const planned = count(s.planned);
  const done = count(s.done);
  const pct = num(s.adherencePct);
  const adherencePct = pct != null ? Math.max(0, Math.round(pct)) : planned > 0 ? Math.round((done / planned) * 100) : 0;

  const w = isObj(raw.weight) ? raw.weight : {};
  const points = arr(w.points)
    .map((p) => (isObj(p) && date(p.date) && pos(p.kg) != null ? { date: p.date as string, kg: p.kg as number } : null))
    .filter(notNull)
    .sort(byDate((p) => p.date));
  const wStart = pos(w.startKg);
  const wEnd = pos(w.endKg);

  const f = isObj(raw.feelings) ? raw.feelings : {};
  const n = isObj(raw.nutrition) ? raw.nutrition : null;
  const e = isObj(raw.endurance) ? raw.endurance : null;
  const g = isObj(raw.goal) ? raw.goal : {};

  const lifts = arr(raw.lifts).map(lift).filter(notNull);
  // Identifiants uniques (ils servent de paramètre d'URL).
  const seen = new Set<string>();
  for (const l of lifts) {
    let id = l.exerciseId;
    for (let k = 2; seen.has(id); k++) id = `${l.exerciseId}-${k}`;
    l.exerciseId = id;
    seen.add(id);
  }

  return {
    version: 2,
    profile: profile(raw.profile),
    sessions: {
      planned,
      done,
      presentiel: count(s.presentiel),
      solo: count(s.solo),
      adherencePct,
      totalVolumeKg: pos(s.totalVolumeKg) ?? 0,
      totalSets: count(s.totalSets),
    },
    rpeAvg: pos(raw.rpeAvg),
    feelings: { facile: count(f.facile), correct: count(f.correct), difficile: count(f.difficile), douleur: count(f.douleur) },
    painZones: strings(raw.painZones),
    lifts,
    weeks: arr(raw.weeks).map(week).filter(notNull).sort(byDate((x) => x.weekStart)),
    weight: {
      startKg: wStart,
      endKg: wEnd,
      deltaKg: num(w.deltaKg) ?? (wStart != null && wEnd != null ? round(wEnd - wStart, 0.1) : null),
      points,
    },
    nutrition: n
      ? {
          daysLogged: count(n.daysLogged),
          avgKcal: pos(n.avgKcal),
          targetKcal: pos(n.targetKcal),
          avgProteinG: pos(n.avgProteinG),
          targetProteinG: pos(n.targetProteinG),
          daysOnTarget: count(n.daysOnTarget),
        }
      : null,
    endurance: e ? { minutes: count(e.minutes), sessions: count(e.sessions), distanceKm: pos(e.distanceKm) } : null,
    goal: { label: str(g.label), target: str(g.target), progressText: str(g.progressText) },
    highlights: strings(raw.highlights),
    watchouts: strings(raw.watchouts),
    nextFocus: str(raw.nextFocus),
  };
}

export function parseReportData(raw: unknown): ParsedReport {
  if (!isObj(raw)) return { status: "invalide" };
  if (raw.version === 1) return { status: "ancien" };
  if (raw.version !== 2) return { status: "invalide" };
  const data = parseV2(raw);
  return data ? { status: "ok", data } : { status: "invalide" };
}

/** « Squat barre : 60 / 70 kg » → { 60, 70, 0,857… } ; null si le texte ne contient pas « valeur / cible ». */
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
    d.profile.some((p) => p.after != null || p.before != null) ||
    d.sessions.planned > 0 ||
    d.sessions.done > 0 ||
    d.rpeAvg != null ||
    d.lifts.length > 0 ||
    d.weeks.length > 0 ||
    d.weight.deltaKg != null ||
    d.weight.points.length > 1 ||
    (d.nutrition != null && (d.nutrition.daysLogged > 0 || d.nutrition.avgKcal != null)) ||
    (d.endurance != null && d.endurance.minutes > 0) ||
    d.goal.label != null ||
    d.goal.progressText != null ||
    d.highlights.length > 0 ||
    d.watchouts.length > 0 ||
    d.nextFocus != null
  );
}
