/**
 * Calcul d'un bilan de progression, version 2 (fonctions pures, sans base ni horloge implicite).
 * Entrée : données brutes d'un coaché sur la période du bilan ET la période précédente de même durée (lues par data.ts) ;
 * sortie : ProgressReportData (contrat figé dans types.ts).
 * Aucune IA : chaque note, chaque phrase vient d'une règle simple écrite ci-dessous.
 */
import { kgNumber, pickReference, shortDate, type ProgSession } from "@/lib/progression/compute";
import { PROFILE_AXES, type LiftSession, type LiftWeek, type ProfileAxis, type ProfileScore, type ProgressReportData, type ReportLift, type ReportWeekPoint } from "./types";

// ---------------------------------------------------------------- entrée

export type ReportSet = { targetKg: number | null; loadKg: number | null; reps: number | null; rpe: number | null; done: boolean };
export type ReportExercise = { exerciseId: string; name: string; category: string | null; sets: ReportSet[] };
export type ReportSession = {
  id: string;
  date: string; // AAAA-MM-JJ
  label: string | null; // « A »
  name: string | null; // « Squat »
  status: "planned" | "done" | "skipped";
  mode: "presentiel" | "solo";
  exercises: ReportExercise[];
};

export type ReportInput = {
  goal: string | null;
  targets: Record<string, unknown>; // clients.targets, ex. { squat_kg: 70 }
  sessionsPerWeek: number | null;
  profileWeightKg: number | null; // clients.weight_kg (poids déclaré, à défaut de pesée)
  /** Séances de la période ET de la période précédente (radar « avant », charge de départ). */
  sessions: ReportSession[];
  feedback: { sessionDate: string; rpe: number; feeling: string; painZone: string | null }[];
  weights: { date: string; kg: number }[];
  food: { date: string; kcal: number; proteinG: number | null }[]; // une ligne par aliment saisi
  nutritionGoals: { dayType: string; kcal: number; proteinG: number | null }[]; // jour d'entraînement (training), jour de repos (rest)
  activities: { date: string; durationMin: number | null; distanceKm: number | null }[]; // activités visibles par le coach (hors Strava)
};

export type Period = { start: string; end: string };

// ---------------------------------------------------------------- dates

const DAY = 864e5;
const toT = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, n: number) => new Date(toT(iso) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((toT(b) - toT(a)) / DAY);
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toT(s)) && new Date(toT(s)).toISOString().startsWith(s);

/** Période par défaut : les 4 semaines complètes (28 jours) qui se terminent la veille de `today`. */
export function defaultPeriod(today: string): Period {
  const end = addDays(today, -1);
  return { start: addDays(end, -27), end };
}

/** Période précédente de même durée, qui se termine la veille du début de `p` (« avant » du radar). */
export function previousPeriod(p: Period): Period {
  const len = daysBetween(p.start, p.end) + 1;
  return { start: addDays(p.start, -len), end: addDays(p.start, -1) };
}

/** « Bilan du 28 oct. au 24 nov. ». */
export const reportTitle = (p: Period) => `Bilan du ${shortDate(p.start)} au ${shortDate(p.end)}`;

const periodDays = (p: Period) => daysBetween(p.start, p.end) + 1;
/** Nombre de semaines de la période, arrondi (au moins 1). */
const weeksIn = (p: Period) => Math.max(1, Math.round(periodDays(p) / 7));
const inPeriod = (date: string, p: Period) => date >= p.start && date <= p.end;

/** Semaines « de programme » : semaines de la période avec au moins une séance prévue ou une activité (au moins 1). */
function activeWeeks(input: ReportInput, sessions: ReportSession[], p: Period): number {
  let n = 0;
  for (let w = p.start; w <= p.end; w = addDays(w, 7)) {
    const r = { start: w, end: addDays(w, 6) < p.end ? addDays(w, 6) : p.end };
    if (sessions.some((s) => inPeriod(s.date, r)) || input.activities.some((a) => inPeriod(a.date, r))) n += 1;
  }
  return Math.max(1, n);
}

/** Semaines du bilan : blocs de 7 jours depuis le début de la période (la dernière peut être plus courte). */
function weekRanges(p: Period): Period[] {
  const out: Period[] = [];
  for (let w = p.start; w <= p.end; w = addDays(w, 7)) out.push({ start: w, end: addDays(w, 6) < p.end ? addDays(w, 6) : p.end });
  return out;
}

// ---------------------------------------------------------------- formats

const round1 = (n: number) => Math.round(n * 10) / 10;
const roundHalf = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const dec = (n: number, digits = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Poids de corps : toujours une décimale (62,0). */
const bodyKg = (n: number) => dec(n, 1);
const ratioTxt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const scoreTxt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${kgNumber(Math.abs(round1(n)))} kg`;
const plural = (n: number, word: string, pluralWord = `${word}s`) => `${n} ${n > 1 ? pluralWord : word}`;
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

// ---------------------------------------------------------------- catégories

const CARDIO_CATEGORIES = new Set(["Cardio", "Course", "Hyrox"]);
const MOBILITY_CATEGORIES = new Set(["Mobilité", "Gainage"]);
/** Pas de charge à suivre exercice par exercice : cardio pur, course, mobilité, gainage. Les stations Hyrox lestées restent suivies. */
const NOT_LIFT_CATEGORIES = new Set(["Cardio", "Course", "Mobilité", "Gainage"]);
/** Stations Hyrox : la charge se suit, mais Epley n'a pas de sens (efforts de quelques dizaines de mètres ou de répétitions). */
const NO_E1RM_CATEGORIES = new Set(["Hyrox"]);
/** Exercices où « reps » est une distance en mètres : pas de volume reps × kg. */
const isDistanceLoad = (name: string) => /^sled /.test(normalize(name));

/** 1RM estimé (Epley) : kg × (1 + reps / 30), arrondi à 0,5 kg. Une série sans répétitions saisies compte pour 1. */
const epley = (kg: number, reps: number | null) => roundHalf(kg * (1 + Math.max(1, reps ?? 1) / 30));

const doneSet = (s: ReportSet) => s.done;
const loadedSet = (s: ReportSet): s is ReportSet & { loadKg: number } => s.done && s.loadKg != null && s.loadKg > 0;
const setVolume = (ex: ReportExercise, s: ReportSet) => (loadedSet(s) && !isDistanceLoad(ex.name) ? s.loadKg * (s.reps ?? 0) : 0);

// ---------------------------------------------------------------- radar : force

type BaseLift = { key: string; names: string[]; ref: number; bodyweight?: boolean; label: string };
/** Exercices de base et ratio 1RM estimé / poids de corps correspondant à 5/5. */
const BASE_LIFTS: BaseLift[] = [
  { key: "squat", names: ["squat barre"], ref: 1.5, label: "squat" },
  { key: "squat-avant", names: ["squat avant"], ref: 1.25, label: "squat avant" },
  { key: "dc", names: ["developpe couche"], ref: 1.0, label: "développé couché" },
  { key: "sdt", names: ["souleve de terre"], ref: 1.8, label: "soulevé de terre" },
  { key: "sdt-roumain", names: ["souleve de terre roumain"], ref: 1.5, label: "soulevé de terre roumain" },
  { key: "dm", names: ["developpe militaire"], ref: 0.65, label: "développé militaire" },
  { key: "tractions", names: ["tractions"], ref: 1.4, bodyweight: true, label: "tractions (poids de corps + lest)" },
  { key: "hip-thrust", names: ["hip thrust"], ref: 1.8, label: "hip thrust" },
];
const baseLiftOf = (name: string) => BASE_LIFTS.find((b) => b.names.includes(normalize(name))) ?? null;

const FORCE_RULE =
  "Moyenne, sur les exercices de base pratiqués, du 1RM estimé (Epley) rapporté au poids de corps ; 5/5 = squat à 1,5 ×, squat avant à 1,25 ×, développé couché à 1 ×, soulevé de terre à 1,8 ×, soulevé de terre roumain à 1,5 ×, développé militaire à 0,65 ×, tractions à 1,4 × (lest compris), hip thrust à 1,8 ×.";

/** Poids de corps retenu pour une période : dernière pesée jusqu'à la fin de la période, sinon le poids de la fiche. */
function bodyWeightAt(input: ReportInput, p: Period): { kg: number; source: "pesée" | "fiche" } | null {
  const last = input.weights.filter((w) => w.date <= p.end).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  if (last) return { kg: last.kg, source: "pesée" };
  if (input.profileWeightKg != null && input.profileWeightKg > 0) return { kg: input.profileWeightKg, source: "fiche" };
  return null;
}

type AxisResult = { score: number | null; detail: string };

function forceAxis(input: ReportInput, done: ReportSession[], p: Period): AxisResult {
  const bw = bodyWeightAt(input, p);
  const best = new Map<string, { base: BaseLift; name: string; e1rm: number }>();
  for (const s of done)
    for (const ex of s.exercises) {
      const base = baseLiftOf(ex.name);
      if (!base) continue;
      for (const set of ex.sets) {
        if (!set.done) continue;
        const kg = base.bodyweight ? (bw?.kg ?? 0) + (set.loadKg ?? 0) : (set.loadKg ?? 0);
        if (kg <= 0 || (base.bodyweight && (set.reps ?? 0) < 1)) continue;
        const e = epley(kg, set.reps);
        const cur = best.get(base.key);
        if (!cur || e > cur.e1rm) best.set(base.key, { base, name: ex.name, e1rm: e });
      }
    }
  if (!best.size) return { score: null, detail: "Aucun exercice de base (squat, développé couché, soulevé de terre…) chargé sur la période" };
  if (!bw) return { score: null, detail: "Poids de corps inconnu : ni pesée ni poids sur la fiche" };
  const rows = [...best.values()].map((b) => ({ ...b, ratio: b.e1rm / bw.kg }));
  const score = round1(5 * (mean(rows.map((r) => Math.min(1, r.ratio / r.base.ref))) ?? 0));
  const parts = rows.map((r) => `${r.name} ${kgNumber(r.e1rm)} kg = ${ratioTxt(r.ratio)} × (cible ${dec(r.base.ref, r.base.ref % 1 ? 2 : 0)})`);
  return { score, detail: `1RM estimé : ${parts.join(" ; ")} · poids de corps ${bodyKg(bw.kg)} kg (${bw.source})` };
}

// ---------------------------------------------------------------- radar : endurance

/**
 * Minutes d'effort d'une série cardio faite. L'app enregistre un nombre entier dans `reps` sans unité
 * (seul le gainage est saisi en « Secondes ») : l'unité est déduite de l'exercice.
 */
function cardioSetMinutes(ex: ReportExercise, set: ReportSet): number {
  const n = normalize(ex.name);
  const r = set.reps ?? 0;
  if (ex.category === "Course") {
    if (n.startsWith("fractionne")) return Math.max(1, r) * 2; // une répétition de 400 m ≈ 2 min
    if (n.startsWith("sortie longue")) return r > 0 && r <= 4 ? r * 60 : r || 60; // « 1 h 10 » saisi 1 : heures
    return r > 0 ? r : 30; // minutes (« 15 min », « 20 min »)
  }
  if (/rameur|skierg|velo/.test(n) && r >= 100) return r / 250; // mètres : 500 m ≈ 2 min
  if (/rameur|skierg|velo/.test(n) && r > 0) return r; // minutes
  return 1; // station, burpees, wall balls, corde… : 1 min d'effort par série
}

const ENDURANCE_RULE =
  "Minutes d'effort cardio par semaine de programme (séries faites des catégories Cardio, Course, Hyrox et activités enregistrées hors Strava) ; 5/5 = 150 min par semaine. Durées estimées : course en minutes (sortie longue en heures), 2 min par 400 m de fractionné, 2 min par 500 m de rameur ou SkiErg, 1 min par série de station.";

type EnduranceStats = { minutes: number; perWeek: number; weeks: number; sessions: number; distanceKm: number | null; fromActivities: number };

function enduranceStats(input: ReportInput, sessions: ReportSession[], p: Period): EnduranceStats {
  const done = sessions.filter((s) => s.status === "done");
  const weeks = activeWeeks(input, sessions, p);
  let minutes = 0;
  let cardioSessions = 0;
  for (const s of done) {
    let m = 0;
    for (const ex of s.exercises) if (ex.category && CARDIO_CATEGORIES.has(ex.category)) for (const set of ex.sets) if (set.done) m += cardioSetMinutes(ex, set);
    if (m > 0) cardioSessions += 1;
    minutes += m;
  }
  const acts = input.activities.filter((a) => inPeriod(a.date, p));
  const fromActivities = sum(acts.map((a) => a.durationMin ?? 0));
  const dists = acts.map((a) => a.distanceKm).filter((d): d is number => d != null && d > 0);
  minutes = Math.round(minutes + fromActivities);
  return { minutes, perWeek: Math.round(minutes / weeks), weeks, sessions: cardioSessions + acts.length, distanceKm: dists.length ? round1(sum(dists)) : null, fromActivities: Math.round(fromActivities) };
}

function enduranceAxis(st: EnduranceStats): AxisResult {
  const score = round1(clamp((5 * st.perWeek) / 150, 0, 5));
  if (!st.minutes) return { score: 0, detail: "Aucun effort cardio sur la période" };
  const acts = st.fromActivities ? `, dont ${st.fromActivities} min d'activités` : "";
  return { score, detail: `${st.perWeek} min d'effort cardio par semaine (${st.minutes} min en ${plural(st.weeks, "semaine")} de programme${acts}, ${plural(st.sessions, "séance")})` };
}

// ---------------------------------------------------------------- radar : mobilité et gainage

const MOBILITE_RULE = "Séries de mobilité et de gainage faites par semaine de programme ; 5/5 = 6 séries par semaine.";

function mobiliteAxis(input: ReportInput, sessions: ReportSession[], p: Period): AxisResult {
  let planned = 0;
  let done = 0;
  for (const s of sessions)
    for (const ex of s.exercises) {
      if (!ex.category || !MOBILITY_CATEGORIES.has(ex.category)) continue;
      planned += ex.sets.length;
      if (s.status === "done") done += ex.sets.filter(doneSet).length;
    }
  if (!planned && !done) return { score: 0, detail: "Pas de mobilité au programme" };
  const perWeek = done / activeWeeks(input, sessions, p);
  return { score: round1(clamp((5 * perWeek) / 6, 0, 5)), detail: `${dec(perWeek)} série${perWeek >= 2 ? "s" : ""} par semaine (${done} faite${done > 1 ? "s" : ""} sur ${planned} prévue${planned > 1 ? "s" : ""})` };
}

// ---------------------------------------------------------------- radar : régularité

const REGULARITE_RULE = "5 × séances faites / séances prévues sur la période.";

function regulariteAxis(sessions: ReportSession[]): AxisResult {
  const planned = sessions.length;
  if (!planned) return { score: null, detail: "Aucune séance prévue sur la période" };
  const done = sessions.filter((s) => s.status === "done").length;
  return { score: round1((5 * done) / planned), detail: `${done} séance${done > 1 ? "s" : ""} faite${done > 1 ? "s" : ""} sur ${planned} prévue${planned > 1 ? "s" : ""}` };
}

// ---------------------------------------------------------------- radar : récupération

const RECUPERATION_RULE = "Part de 5 : −1 par point de RPE moyen au-dessus de 7, −1 par retour « douleur », −0,5 par retour « difficile » ; entre 0 et 5.";

type Feedbacks = ReportInput["feedback"];

function recuperationAxis(fb: Feedbacks): AxisResult {
  if (!fb.length) return { score: null, detail: "Aucun retour de séance sur la période" };
  const rpe = mean(fb.map((f) => f.rpe)) ?? 0;
  const pain = fb.filter((f) => f.feeling === "douleur").length;
  const hard = fb.filter((f) => f.feeling === "difficile").length;
  const score = round1(clamp(5 - Math.max(0, rpe - 7) - pain - 0.5 * hard, 0, 5));
  const bits = [`RPE moyen ${dec(rpe)}`, plural(fb.length, "retour"), pain ? plural(pain, "douleur") : "aucune douleur"];
  if (hard) bits.push(`${hard} « difficile »`);
  return { score, detail: bits.join(", ") };
}

// ---------------------------------------------------------------- radar : nutrition

const NUTRITION_RULE = "5 × moyenne de deux parts : jours saisis / jours de la période, et jours à ± 10 % de l'objectif calorique / jours saisis.";

type NutritionStats = { days: number; daysLogged: number; daysOnTarget: number; avgKcal: number | null; avgProteinG: number | null; targetKcal: number | null; targetProteinG: number | null };

function nutritionStats(input: ReportInput, sessions: ReportSession[], p: Period): NutritionStats | null {
  if (!input.nutritionGoals.length) return null;
  const byDay = new Map<string, { kcal: number; protein: number; hasProtein: boolean }>();
  for (const f of input.food) {
    if (!inPeriod(f.date, p)) continue;
    const d = byDay.get(f.date) ?? { kcal: 0, protein: 0, hasProtein: false };
    d.kcal += f.kcal;
    if (f.proteinG != null) {
      d.protein += f.proteinG;
      d.hasProtein = true;
    }
    byDay.set(f.date, d);
  }
  const goals = input.nutritionGoals;
  const avgGoal = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null && x > 0);
    return v.length ? sum(v) / v.length : null;
  };
  const meanKcal = avgGoal(goals.map((g) => g.kcal));
  const training = goals.find((g) => g.dayType === "training")?.kcal ?? meanKcal;
  const rest = goals.find((g) => g.dayType === "rest")?.kcal ?? meanKcal;
  const trainingDays = new Set(sessions.filter((s) => s.status !== "skipped").map((s) => s.date));
  let onTarget = 0;
  for (const [date, d] of byDay) {
    const target = trainingDays.has(date) ? training : rest;
    if (target && Math.abs(d.kcal - target) <= target * 0.1) onTarget += 1;
  }
  const days = [...byDay.values()];
  const proteinDays = days.filter((d) => d.hasProtein);
  const targetProtein = avgGoal(goals.map((g) => g.proteinG));
  return {
    days: periodDays(p),
    daysLogged: byDay.size,
    daysOnTarget: onTarget,
    avgKcal: days.length ? Math.round(sum(days.map((d) => d.kcal)) / days.length) : null,
    avgProteinG: proteinDays.length ? Math.round(sum(proteinDays.map((d) => d.protein)) / proteinDays.length) : null,
    targetKcal: meanKcal != null ? Math.round(meanKcal / 10) * 10 : null,
    targetProteinG: targetProtein != null ? Math.round(targetProtein) : null,
  };
}

function nutritionAxis(st: NutritionStats | null): AxisResult {
  if (!st) return { score: null, detail: "Aucun objectif nutritionnel défini" };
  const logged = st.daysLogged / st.days;
  const onTarget = st.daysLogged ? st.daysOnTarget / st.daysLogged : 0;
  const score = round1(clamp(5 * ((logged + onTarget) / 2), 0, 5));
  if (!st.daysLogged) return { score, detail: `Journal alimentaire non rempli (0 jour sur ${st.days})` };
  return { score, detail: `${plural(st.daysLogged, "jour")} saisi${st.daysLogged > 1 ? "s" : ""} sur ${st.days}, dont ${st.daysOnTarget} à ± 10 % de l'objectif calorique` };
}

// ---------------------------------------------------------------- radar complet

const RULES: Record<ProfileAxis, string> = {
  force: FORCE_RULE,
  endurance: ENDURANCE_RULE,
  mobilite: MOBILITE_RULE,
  regularite: REGULARITE_RULE,
  recuperation: RECUPERATION_RULE,
  nutrition: NUTRITION_RULE,
};

type PeriodSlice = { p: Period; sessions: ReportSession[]; done: ReportSession[]; feedback: Feedbacks; endurance: EnduranceStats; nutrition: NutritionStats | null; hasData: boolean };

function sliceOf(input: ReportInput, p: Period): PeriodSlice {
  const sessions = input.sessions.filter((s) => inPeriod(s.date, p));
  const done = sessions.filter((s) => s.status === "done");
  const feedback = input.feedback.filter((f) => inPeriod(f.sessionDate, p));
  const hasData = sessions.length > 0 || feedback.length > 0 || input.activities.some((a) => inPeriod(a.date, p)) || input.food.some((f) => inPeriod(f.date, p));
  return { p, sessions, done, feedback, endurance: enduranceStats(input, sessions, p), nutrition: nutritionStats(input, sessions, p), hasData };
}

function axesOf(input: ReportInput, s: PeriodSlice): Record<ProfileAxis, AxisResult> {
  return {
    force: forceAxis(input, s.done, s.p),
    endurance: enduranceAxis(s.endurance),
    mobilite: mobiliteAxis(input, s.sessions, s.p),
    regularite: regulariteAxis(s.sessions),
    recuperation: recuperationAxis(s.feedback),
    nutrition: nutritionAxis(s.nutrition),
  };
}

function profileOf(input: ReportInput, cur: PeriodSlice, prev: PeriodSlice): ProfileScore[] {
  const after = axesOf(input, cur);
  const before = axesOf(input, prev);
  return PROFILE_AXES.map((axis) => {
    const a = cur.hasData ? after[axis].score : null;
    const b = prev.hasData ? before[axis].score : null;
    return { axis, before: b, after: a, detail: cur.hasData ? after[axis].detail : "Aucune donnée sur la période", rule: RULES[axis] };
  });
}

// ---------------------------------------------------------------- exercices suivis

type LiftEntry = { session: ReportSession; ex: ReportExercise };

const bestSetOfSets = (sets: ReportSet[]): { kg: number; reps: number } | null => {
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    if (!loadedSet(s)) continue;
    const reps = s.reps ?? 0;
    if (!best || s.loadKg > best.kg || (s.loadKg === best.kg && reps > best.reps)) best = { kg: s.loadKg, reps };
  }
  return best;
};
const bestSetText = (b: { kg: number; reps: number } | null) => (b ? (b.reps > 0 ? `${b.reps} × ${kgNumber(b.kg)} kg` : `${kgNumber(b.kg)} kg`) : null);
const topLoad = (ex: ReportExercise) => bestSetOfSets(ex.sets)?.kg ?? null;
function bestE1rm(ex: ReportExercise): number | null {
  if (ex.category && NO_E1RM_CATEGORIES.has(ex.category)) return null;
  let best: number | null = null;
  for (const s of ex.sets) if (loadedSet(s)) best = Math.max(best ?? 0, epley(s.loadKg, s.reps));
  return best;
}
const sessionName = (s: ReportSession) => {
  const name = s.name?.trim() || "Séance";
  return s.label?.trim() ? `Séance ${s.label.trim()} · ${name}` : name;
};

function toProgSessions(sessions: ReportSession[]): ProgSession[] {
  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    exercises: s.exercises.map((e) => ({ exerciseId: e.exerciseId, name: e.name, category: e.category, sets: e.sets.map((x) => ({ load_kg: x.loadKg, reps: x.reps, done: x.done })) })),
  }));
}

function buildLift(exerciseId: string, entries: LiftEntry[], previous: LiftEntry | null, weeks: Period[], targetKg: number | null): ReportLift {
  const first = entries[0];
  const last = entries.at(-1) ?? first;
  const startKg = (previous && topLoad(previous.ex)) ?? topLoad(first.ex);
  const endKg = topLoad(last.ex);
  const startE1rm = (previous && bestE1rm(previous.ex)) ?? bestE1rm(first.ex);
  const endE1rm = bestE1rm(last.ex);
  const allSets = entries.flatMap((e) => e.ex.sets);
  const liftWeeks: LiftWeek[] = weeks.map((w) => {
    const inW = entries.filter((e) => inPeriod(e.session.date, w));
    const tops = inW.map((e) => topLoad(e.ex)).filter((x): x is number => x != null);
    const e1rms = inW.map((e) => bestE1rm(e.ex)).filter((x): x is number => x != null);
    return {
      weekStart: w.start,
      topKg: tops.length ? Math.max(...tops) : null,
      e1rm: e1rms.length ? Math.max(...e1rms) : null,
      volumeKg: Math.round(sum(inW.flatMap((e) => e.ex.sets.map((s) => setVolume(e.ex, s))))),
      setsDone: sum(inW.map((e) => e.ex.sets.filter(doneSet).length)),
    };
  });
  const sessions: LiftSession[] = entries.map((e) => ({
    date: e.session.date,
    sessionName: sessionName(e.session),
    mode: e.session.mode,
    sets: e.ex.sets.filter(doneSet).map((s) => ({ reps: s.reps, kg: s.loadKg, rpe: s.rpe })),
    bestSet: bestSetText(bestSetOfSets(e.ex.sets)),
    e1rm: bestE1rm(e.ex),
  }));
  const prs = allSets.filter(loadedSet).map((s) => s.loadKg);
  return {
    exerciseId,
    exercise: first.ex.name,
    category: first.ex.category ?? "Autre",
    startKg,
    endKg,
    deltaKg: startKg != null && endKg != null ? round1(endKg - startKg) : null,
    startE1rm,
    endE1rm,
    prKg: prs.length ? Math.max(...prs) : null,
    bestSet: bestSetText(bestSetOfSets(allSets)),
    targetKg,
    weeks: liftWeeks,
    sessions,
  };
}

/** Exercices chargés de la période (hors cardio, course, mobilité, gainage) : objectif d'abord, puis par nombre de séries ; 8 au plus. */
function liftsOf(input: ReportInput, cur: PeriodSlice, prev: PeriodSlice, weeks: Period[], target: TargetInfo): ReportLift[] {
  const byEx = new Map<string, LiftEntry[]>();
  const sorted = [...cur.done].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted)
    for (const ex of s.exercises) {
      if (ex.category && NOT_LIFT_CATEGORIES.has(ex.category)) continue;
      if (!ex.sets.some(loadedSet)) continue;
      const list = byEx.get(ex.exerciseId) ?? [];
      list.push({ session: s, ex });
      byEx.set(ex.exerciseId, list);
    }
  const lastBefore = new Map<string, LiftEntry>();
  for (const s of [...prev.done].sort((a, b) => a.date.localeCompare(b.date)))
    for (const ex of s.exercises) if (ex.sets.some(loadedSet)) lastBefore.set(ex.exerciseId, { session: s, ex });

  const targetId = target?.kind === "lift" ? target.exerciseId : null;
  const setsDone = (list: LiftEntry[]) => sum(list.map((e) => e.ex.sets.filter(doneSet).length));
  return [...byEx.entries()]
    .sort(
      ([ia, a], [ib, b]) =>
        Number(ib === targetId) - Number(ia === targetId) || setsDone(b) - setsDone(a) || b.length - a.length || a[0].ex.name.localeCompare(b[0].ex.name, "fr"),
    )
    .slice(0, 8)
    .map(([id, list]) => buildLift(id, list, lastBefore.get(id) ?? null, weeks, id === targetId && target?.kind === "lift" ? target.kg : null));
}

// ---------------------------------------------------------------- objectif

type TargetInfo = { kind: "lift"; exerciseId: string; name: string; kg: number } | { kind: "poids"; kg: number } | { kind: "autre"; text: string } | null;

function targetOf(input: ReportInput): TargetInfo {
  const ref = pickReference(input.targets, toProgSessions(input.sessions));
  if (ref?.fromTarget && ref.targetKg != null) return { kind: "lift", exerciseId: ref.exerciseId, name: ref.name, kg: ref.targetKg };
  const poids = Number(input.targets?.poids_kg);
  if (Number.isFinite(poids) && poids > 0) return { kind: "poids", kg: poids };
  const first = Object.entries(input.targets ?? {}).find(([, v]) => typeof v === "string" || typeof v === "number");
  if (first) return { kind: "autre", text: `${capitalize(first[0].replace(/_/g, " "))} ${String(first[1])}` };
  return null;
}

// ---------------------------------------------------------------- calcul principal

export function buildProgressReport(input: ReportInput, period: Period): ProgressReportData {
  const p = period;
  const cur = sliceOf(input, p);
  const prev = sliceOf(input, previousPeriod(p));
  const { sessions, done } = cur;
  const planned = sessions.length;
  const totalSets = sum(done.flatMap((s) => s.exercises.map((e) => e.sets.filter(doneSet).length)));
  const totalVolumeKg = Math.round(sum(done.flatMap((s) => s.exercises.flatMap((e) => e.sets.map((x) => setVolume(e, x))))));
  const sessionsBlock = {
    planned,
    done: done.length,
    presentiel: done.filter((s) => s.mode === "presentiel").length,
    solo: done.filter((s) => s.mode !== "presentiel").length,
    adherencePct: planned ? Math.round((done.length / planned) * 100) : 0,
    totalVolumeKg,
    totalSets,
  };

  // Retours de séance
  const rpeAvg = cur.feedback.length ? round1(mean(cur.feedback.map((f) => f.rpe)) ?? 0) : null;
  const feelings = { facile: 0, correct: 0, difficile: 0, douleur: 0 };
  for (const f of cur.feedback) if (f.feeling in feelings) feelings[f.feeling as keyof typeof feelings] += 1;
  const painSeen = new Map<string, string>();
  for (const f of cur.feedback) {
    const z = f.painZone?.trim();
    if (z && !painSeen.has(normalize(z))) painSeen.set(normalize(z), z);
  }
  const painZones = [...painSeen.values()];

  // Objectif et exercices suivis
  const target = targetOf(input);
  const ranges = weekRanges(p);
  const lifts = liftsOf(input, cur, prev, ranges, target);
  const refLift = lifts[0] ?? null;
  const targetLift = target?.kind === "lift" && refLift?.exerciseId === target.exerciseId ? refLift : null;

  // Semaines
  const weeks: ReportWeekPoint[] = ranges.map((w, i) => {
    const inW = sessions.filter((s) => inPeriod(s.date, w));
    const doneW = inW.filter((s) => s.status === "done");
    return {
      weekStart: w.start,
      planned: inW.length,
      done: doneW.length,
      presentiel: doneW.filter((s) => s.mode === "presentiel").length,
      topKg: refLift?.weeks[i]?.topKg ?? null,
      volumeKg: Math.round(sum(doneW.flatMap((s) => s.exercises.flatMap((e) => e.sets.map((x) => setVolume(e, x)))))),
    };
  });

  // Poids
  const wPoints = input.weights
    .filter((w) => inPeriod(w.date, p))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, kg: round1(w.kg) }));
  const wStart = wPoints[0]?.kg ?? null;
  const wEnd = wPoints.at(-1)?.kg ?? null;
  const weight = { startKg: wStart, endKg: wEnd, deltaKg: wStart != null && wEnd != null && wPoints.length > 1 ? round1(wEnd - wStart) : null, points: wPoints };

  // Nutrition
  const n = cur.nutrition;
  const foodDays = new Set(input.food.filter((f) => inPeriod(f.date, p)).map((f) => f.date)).size;
  const nutrition = n
    ? { daysLogged: n.daysLogged, avgKcal: n.avgKcal, targetKcal: n.targetKcal, avgProteinG: n.avgProteinG, targetProteinG: n.targetProteinG, daysOnTarget: n.daysOnTarget }
    : foodDays
      ? (() => {
          const days = new Map<string, { k: number; p: number; hp: boolean }>();
          for (const f of input.food)
            if (inPeriod(f.date, p)) {
              const d = days.get(f.date) ?? { k: 0, p: 0, hp: false };
              d.k += f.kcal;
              if (f.proteinG != null) {
                d.p += f.proteinG;
                d.hp = true;
              }
              days.set(f.date, d);
            }
          const v = [...days.values()];
          const pv = v.filter((d) => d.hp);
          return { daysLogged: v.length, avgKcal: Math.round(sum(v.map((d) => d.k)) / v.length), targetKcal: null, avgProteinG: pv.length ? Math.round(sum(pv.map((d) => d.p)) / pv.length) : null, targetProteinG: null, daysOnTarget: 0 };
        })()
      : null;

  // Endurance
  const e = cur.endurance;
  const endurance = e.minutes > 0 || e.sessions > 0 ? { minutes: e.minutes, sessions: e.sessions, distanceKm: e.distanceKm } : null;

  // Objectif lisible
  const goal = {
    label: input.goal?.trim() || null,
    target: target?.kind === "lift" ? `${target.name} ${kgNumber(target.kg)} kg` : target?.kind === "poids" ? `Poids ${kgNumber(target.kg)} kg` : target?.kind === "autre" ? target.text : null,
    progressText:
      target?.kind === "lift" && targetLift?.endKg != null
        ? `${target.name} : ${kgNumber(targetLift.endKg)} / ${kgNumber(target.kg)} kg`
        : target?.kind === "poids" && wEnd != null
          ? `Poids : ${bodyKg(wEnd)} / ${kgNumber(target.kg)} kg`
          : null,
  };

  const profile = profileOf(input, cur, prev);
  const ctx: RuleContext = {
    period: p,
    sessions: sessionsBlock,
    refLift,
    targetLift,
    others: lifts.slice(1),
    weight,
    nutrition,
    endurancePerWeek: e.perWeek,
    target,
    sessionsPerWeek: input.sessionsPerWeek,
    profile,
    feedback: cur.feedback,
    rpeAvg,
  };

  return {
    version: 2,
    profile,
    sessions: sessionsBlock,
    rpeAvg,
    feelings,
    painZones,
    lifts,
    weeks,
    weight,
    nutrition,
    endurance,
    goal,
    highlights: highlightsOf(ctx),
    watchouts: watchoutsOf(ctx),
    nextFocus: nextFocusOf(ctx),
  };
}

// ---------------------------------------------------------------- règles de rédaction

type RuleContext = {
  period: Period;
  sessions: ProgressReportData["sessions"];
  refLift: ReportLift | null;
  targetLift: ReportLift | null; // exercice de l'objectif de charge, s'il a été pratiqué sur la période
  others: ReportLift[];
  weight: ProgressReportData["weight"];
  nutrition: ProgressReportData["nutrition"];
  endurancePerWeek: number;
  target: TargetInfo;
  sessionsPerWeek: number | null;
  profile: ProfileScore[];
  feedback: Feedbacks;
  rpeAvg: number | null;
};

const AXIS_NAMES: Record<ProfileAxis, string> = {
  force: "Force",
  endurance: "Endurance",
  mobilite: "Mobilité et gainage",
  regularite: "Régularité",
  recuperation: "Récupération",
  nutrition: "Nutrition",
};

/** 3 à 5 phrases courtes : charge de référence, assiduité, encadré / autonomie, endurance, axe en progrès, poids, autre charge, journal. */
export function highlightsOf(c: RuleContext): string[] {
  const out: string[] = [];
  const weeks = weeksIn(c.period);
  const r = c.refLift;
  if (r?.deltaKg != null && r.startKg != null && r.endKg != null) {
    if (r.deltaKg > 0) out.push(`${r.exercise} : ${signedKg(r.deltaKg)} en ${plural(weeks, "semaine")} (${kgNumber(r.startKg)} → ${kgNumber(r.endKg)} kg)`);
    else if (r.deltaKg === 0 && r === c.targetLift) out.push(`${r.exercise} : charge tenue à ${kgNumber(r.endKg)} kg`);
  }

  const s = c.sessions;
  if (s.planned > 0) out.push(`${s.done} séance${s.done > 1 ? "s" : ""} sur ${s.planned} faite${s.done > 1 ? "s" : ""} (${s.adherencePct} %)`);
  else out.push("Aucune séance prévue sur la période");

  if (s.done > 0) {
    if (s.presentiel && s.solo) out.push(`${plural(s.presentiel, "séance")} encadrée${s.presentiel > 1 ? "s" : ""}, ${s.solo} en autonomie`);
    else if (s.presentiel) out.push(`${plural(s.presentiel, "séance")} encadrée${s.presentiel > 1 ? "s" : ""} avec le coach`);
    else out.push(`${plural(s.solo, "séance")} faite${s.solo > 1 ? "s" : ""} en autonomie`);
  }

  if (c.endurancePerWeek > 0) out.push(`${c.endurancePerWeek} min d’effort cardio par semaine`);

  const gain = c.profile
    .filter((p) => p.before != null && p.after != null && p.after - p.before >= 0.5)
    .sort((a, b) => (b.after ?? 0) - (b.before ?? 0) - ((a.after ?? 0) - (a.before ?? 0)))[0];
  if (gain) out.push(`${AXIS_NAMES[gain.axis]} : ${scoreTxt(gain.before ?? 0)} → ${scoreTxt(gain.after ?? 0)} / 5`);

  const w = c.weight;
  if (w.deltaKg != null && w.startKg != null && w.endKg != null) {
    out.push(Math.abs(w.deltaKg) < 0.5 ? `Poids stable : ${bodyKg(w.startKg)} → ${bodyKg(w.endKg)} kg` : `Poids : ${signedKg(w.deltaKg)} (${bodyKg(w.startKg)} → ${bodyKg(w.endKg)} kg)`);
  }

  const other = c.others.filter((l) => (l.deltaKg ?? 0) > 0).sort((a, b) => (b.deltaKg ?? 0) - (a.deltaKg ?? 0))[0];
  if (other?.deltaKg != null) out.push(`${other.exercise} : ${signedKg(other.deltaKg)}`);

  const n = c.nutrition;
  if (n && n.daysLogged >= 7) out.push(`Journal alimentaire rempli ${n.daysLogged} jours sur ${periodDays(c.period)}`);

  if (out.length < 3) {
    const strongest = c.profile.filter((p) => p.after != null).sort((a, b) => (b.after ?? 0) - (a.after ?? 0))[0];
    if (strongest) out.push(`Point fort du profil : ${AXIS_NAMES[strongest.axis].toLowerCase()} (${scoreTxt(strongest.after ?? 0)} / 5)`);
  }
  return out.slice(0, 5);
}

/** 0 à 3 points d'attention, par priorité : douleur, assiduité, effort ressenti, charge en baisse, nutrition peu saisie. */
export function watchoutsOf(c: RuleContext): string[] {
  const out: string[] = [];
  const pains = c.feedback.filter((f) => f.feeling === "douleur" || f.painZone);
  const byZone = new Map<string, { label: string; n: number }>();
  for (const f of pains) {
    const z = f.painZone?.trim() || "";
    const cur = byZone.get(normalize(z)) ?? { label: z, n: 0 };
    cur.n += 1;
    byZone.set(normalize(z), cur);
  }
  for (const { label, n } of [...byZone.values()].sort((a, b) => b.n - a.n))
    out.push(label ? `Douleur ${/^(genou|dos|coude|poignet|pied|mollet|cou|bas du dos|haut du dos|bras|talon)\b/i.test(label) ? `au ${label}` : `(${label})`} signalée ${n} fois` : `Douleur signalée ${n} fois`);

  const s = c.sessions;
  if (s.planned > 0 && s.adherencePct < 75) out.push(`Assiduité à ${s.adherencePct} % (${s.done} séance${s.done > 1 ? "s" : ""} sur ${s.planned})`);
  if (c.rpeAvg != null && c.rpeAvg >= 8.5) out.push(`Effort ressenti élevé : RPE moyen ${dec(c.rpeAvg)}`);
  const r = c.refLift;
  if (r?.deltaKg != null && r.deltaKg < 0) out.push(`${r.exercise} en baisse : ${signedKg(r.deltaKg)}`);
  const n = c.nutrition;
  if (n && n.targetKcal != null && n.daysLogged < 7) {
    const days = periodDays(c.period);
    out.push(n.daysLogged ? `Nutrition saisie ${n.daysLogged} jour${n.daysLogged > 1 ? "s" : ""} sur ${days}` : `Journal alimentaire non rempli sur les ${days} jours`);
  }
  return out.slice(0, 3);
}

/** Axe proposé pour la suite (le coach peut le modifier avant l'envoi). */
export function nextFocusOf(c: RuleContext): string | null {
  const perWeek = c.sessionsPerWeek && c.sessionsPerWeek > 0 ? c.sessionsPerWeek : 3;
  if (c.sessions.planned > 0 && c.sessions.adherencePct < 75) return `Retrouver la régularité : viser ${plural(perWeek, "séance")} par semaine`;

  const t = c.target;
  if (t?.kind === "lift" && c.targetLift?.endKg != null) {
    const left = round1(t.kg - c.targetLift.endKg);
    if (left <= 0) return `Objectif atteint (${t.name} ${kgNumber(t.kg)} kg) : fixer le prochain palier`;
    if (left <= Math.max(10, t.kg * 0.15)) return `Dernière marche vers l’objectif : ${t.name} à ${kgNumber(t.kg)} kg`;
    return `Continuer la montée en charge : encore ${kgNumber(left)} kg pour ${t.name} à ${kgNumber(t.kg)} kg`;
  }
  if (t?.kind === "poids" && c.weight.endKg != null) {
    const left = round1(c.weight.endKg - t.kg);
    if (Math.abs(left) < 0.5) return `Objectif de poids atteint : le stabiliser à ${kgNumber(t.kg)} kg`;
    return `${left > 0 ? "Perdre" : "Prendre"} encore ${kgNumber(Math.abs(left))} kg vers ${kgNumber(t.kg)} kg, sans précipiter`;
  }
  if (c.nutrition?.targetKcal != null && c.nutrition.daysLogged < 7) return "Remplir le journal alimentaire au moins 3 jours par semaine";
  if (c.sessions.planned === 0) return `Reprendre un rythme de ${plural(perWeek, "séance")} par semaine`;
  return `Garder le rythme de ${plural(perWeek, "séance")} par semaine`;
}
