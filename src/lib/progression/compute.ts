/** Calculs de « Ma progression » (fonctions pures, testables sans base). */

export type ProgSet = { load_kg: number | null; reps: number | null; done: boolean };
export type ProgExercise = { exerciseId: string; name: string; category: string | null; sets: ProgSet[] };
export type ProgSession = { id: string; date: string; status: "planned" | "done" | "skipped"; exercises: ProgExercise[] };

export type Reference = { exerciseId: string; name: string; targetKg: number | null; fromTarget: boolean };
export type WeekPoint = { week: string; kg: number; date: string };
export type WeekAttendance = { week: string; planned: number; due: number; done: number; current: boolean };
export type RecordRow = { exerciseId: string; name: string; bestKg: number; date: string; firstKg: number; sessions: number };

const DAY = 864e5;

/** Lundi (AAAA-MM-JJ) de la semaine d'une date AAAA-MM-JJ. */
export function mondayOf(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // lundi = 0
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
}
const addWeeks = (monday: string, n: number) => new Date(Date.parse(`${monday}T00:00:00Z`) + n * 7 * DAY).toISOString().slice(0, 10);

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Charge réalisée maximale d'un exercice (séries cochées, charge > 0), ou null. */
function bestDoneLoad(ex: ProgExercise): number | null {
  let best: number | null = null;
  for (const s of ex.sets) if (s.done && s.load_kg != null && s.load_kg > 0 && (best == null || s.load_kg > best)) best = s.load_kg;
  return best;
}

/** Séances terminées, triées par date. */
const doneSessions = (sessions: ProgSession[]) => sessions.filter((s) => s.status === "done").sort((a, b) => a.date.localeCompare(b.date));

/** Nombre de séances terminées où l'exercice a au moins une série chargée réalisée. */
function loadedCounts(sessions: ProgSession[]): Map<string, { name: string; count: number; best: number }> {
  const out = new Map<string, { name: string; count: number; best: number }>();
  for (const s of doneSessions(sessions)) {
    for (const ex of s.exercises) {
      const kg = bestDoneLoad(ex);
      if (kg == null) continue;
      const cur = out.get(ex.exerciseId) ?? { name: ex.name, count: 0, best: 0 };
      cur.count += 1;
      cur.best = Math.max(cur.best, kg);
      out.set(ex.exerciseId, cur);
    }
  }
  return out;
}

/**
 * Exercice de référence : celui de l'objectif de charge (clé `<exercice>_kg` de clients.targets, ex. squat_kg → « Squat barre »),
 * sinon l'exercice chargé le plus fréquent dans les séances terminées.
 */
export function pickReference(targets: Record<string, unknown>, sessions: ProgSession[]): Reference | null {
  const counts = loadedCounts(sessions);
  const names = new Map<string, string>();
  for (const s of sessions) for (const ex of s.exercises) names.set(ex.exerciseId, ex.name);

  for (const [key, raw] of Object.entries(targets ?? {})) {
    const m = /^(.+)_kg$/.exec(key);
    const kg = Number(raw);
    if (!m || m[1] === "poids" || !Number.isFinite(kg) || kg <= 0) continue;
    const word = normalize(m[1].replace(/_/g, " "));
    const candidates = [...names.entries()].filter(([, n]) => normalize(n).startsWith(word) || ` ${normalize(n)} `.includes(` ${word} `));
    if (!candidates.length) continue;
    candidates.sort(([a], [b]) => (counts.get(b)?.count ?? 0) - (counts.get(a)?.count ?? 0));
    const [exerciseId, name] = candidates[0];
    return { exerciseId, name, targetKg: kg, fromTarget: true };
  }

  const best = [...counts.entries()].sort(([, a], [, b]) => b.count - a.count || b.best - a.best)[0];
  return best ? { exerciseId: best[0], name: best[1].name, targetKg: null, fromTarget: false } : null;
}

/** Charge maximale réalisée par semaine (lundi) pour un exercice, 12 dernières semaines au plus. */
export function weeklyLoads(sessions: ProgSession[], exerciseId: string, maxWeeks = 12): WeekPoint[] {
  const byWeek = new Map<string, WeekPoint>();
  for (const s of doneSessions(sessions)) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const kg = bestDoneLoad(ex);
      if (kg == null) continue;
      const week = mondayOf(s.date);
      const cur = byWeek.get(week);
      if (!cur || kg > cur.kg) byWeek.set(week, { week, kg, date: s.date });
    }
  }
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week)).slice(-maxWeeks);
}

/** Assiduité par semaine : séances prévues, échues (date passée ou du jour) et faites, depuis la première séance (6 semaines au plus). */
export function attendance(sessions: ProgSession[], today: string, maxWeeks = 6): WeekAttendance[] {
  if (!sessions.length) return [];
  const current = mondayOf(today);
  const first = mondayOf([...sessions].sort((a, b) => a.date.localeCompare(b.date))[0].date);
  const weeks: string[] = [];
  for (let w = current; w >= first && weeks.length < maxWeeks; w = addWeeks(w, -1)) weeks.unshift(w);
  return weeks.map((week) => {
    const inWeek = sessions.filter((s) => mondayOf(s.date) === week);
    return {
      week,
      planned: inWeek.length,
      due: inWeek.filter((s) => s.status === "done" || s.date <= today).length,
      done: inWeek.filter((s) => s.status === "done").length,
      current: week === current,
    };
  });
}

/**
 * Série en cours : semaines consécutives (jusqu'à cette semaine) où toutes les séances échues ont été faites.
 * Une semaine sans séance échue (semaine en cours pas encore commencée, semaine sans programme) ne casse pas la série.
 */
export function currentStreak(sessions: ProgSession[], today: string): number {
  if (!sessions.length) return 0;
  const first = mondayOf([...sessions].sort((a, b) => a.date.localeCompare(b.date))[0].date);
  let streak = 0;
  for (let w = mondayOf(today); w >= first; w = addWeeks(w, -1)) {
    const due = sessions.filter((s) => mondayOf(s.date) === w && (s.status === "done" || s.date <= today));
    if (!due.length) continue;
    if (due.every((s) => s.status === "done")) streak += 1;
    else break;
  }
  return streak;
}

/** Records : meilleure charge réalisée par exercice et date où elle a été atteinte la première fois. */
export function records(sessions: ProgSession[], referenceId: string | null, limit = 6): RecordRow[] {
  const out = new Map<string, RecordRow>();
  for (const s of doneSessions(sessions)) {
    for (const ex of s.exercises) {
      const kg = bestDoneLoad(ex);
      if (kg == null) continue;
      const cur = out.get(ex.exerciseId);
      if (!cur) out.set(ex.exerciseId, { exerciseId: ex.exerciseId, name: ex.name, bestKg: kg, date: s.date, firstKg: kg, sessions: 1 });
      else {
        cur.sessions += 1;
        if (kg > cur.bestKg) Object.assign(cur, { bestKg: kg, date: s.date });
      }
    }
  }
  return [...out.values()]
    .sort((a, b) => Number(b.exerciseId === referenceId) - Number(a.exerciseId === referenceId) || b.bestKg - a.bestKg || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit);
}

/** 62.5 → « 62,5 ». */
export const kgNumber = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
/** 62.5 → « 62,5 kg ». */
export const kgLabel = (v: number) => `${kgNumber(v)} kg`;
/** « 23 nov. ». */
export const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
/** « 23 novembre ». */
export const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Date du jour à Paris (AAAA-MM-JJ). */
export function todayParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
