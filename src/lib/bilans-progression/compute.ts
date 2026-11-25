/**
 * Calcul d'un bilan de progression (fonctions pures, sans base ni horloge implicite).
 * Entrée : données brutes d'un coaché lues par data.ts ; sortie : ProgressReportData (contrat figé dans types.ts).
 * Aucune IA : chaque phrase vient d'une règle simple ci-dessous.
 */
import { kgNumber, pickReference, shortDate, type ProgSession } from "@/lib/progression/compute";
import type { ProgressReportData, ReportLift, ReportWeekPoint } from "./types";

// ---------------------------------------------------------------- entrée

export type ReportSet = { targetKg: number | null; loadKg: number | null; reps: number | null; done: boolean };
export type ReportExercise = { exerciseId: string; name: string; category: string | null; sets: ReportSet[] };
export type ReportSession = {
  id: string;
  date: string; // AAAA-MM-JJ
  status: "planned" | "done" | "skipped";
  mode: "presentiel" | "solo";
  exercises: ReportExercise[];
};

export type ReportInput = {
  goal: string | null;
  targets: Record<string, unknown>; // clients.targets, ex. { squat_kg: 70 }
  sessionsPerWeek: number | null;
  /** Séances de la période ET des 4 semaines précédentes (pour la charge de départ). */
  sessions: ReportSession[];
  feedback: { sessionDate: string; rpe: number }[];
  weights: { date: string; kg: number }[];
  food: { date: string; kcal: number }[]; // une ligne par aliment saisi
  kcalGoals: number[]; // nutrition_goals.kcal (jour d'entraînement, jour de repos)
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

/** « Bilan du 28 oct. au 24 nov. ». */
export const reportTitle = (p: Period) => `Bilan du ${shortDate(p.start)} au ${shortDate(p.end)}`;

/** Nombre de semaines de la période, arrondi (au moins 1). */
const weeksIn = (p: Period) => Math.max(1, Math.round((daysBetween(p.start, p.end) + 1) / 7));

// ---------------------------------------------------------------- formats

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Poids de corps : toujours une décimale (62,0). */
const bodyKg = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${kgNumber(Math.abs(round1(n)))} kg`;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ---------------------------------------------------------------- charges

const inPeriod = (date: string, p: Period) => date >= p.start && date <= p.end;

/** Charge la plus lourde réellement soulevée (séries cochées), ou null. */
function topLoad(ex: ReportExercise): number | null {
  let best: number | null = null;
  for (const s of ex.sets) if (s.done && s.loadKg != null && s.loadKg > 0 && (best == null || s.loadKg > best)) best = s.loadKg;
  return best;
}

/** Meilleure série : la plus lourde, puis la plus longue. « 6 × 60 kg ». */
function bestSetOf(entries: ReportExercise[]): string | null {
  let best: { kg: number; reps: number } | null = null;
  for (const ex of entries)
    for (const s of ex.sets) {
      if (!s.done || s.loadKg == null || s.loadKg <= 0) continue;
      const reps = s.reps ?? 0;
      if (!best || s.loadKg > best.kg || (s.loadKg === best.kg && reps > best.reps)) best = { kg: s.loadKg, reps };
    }
  if (!best) return null;
  return best.reps > 0 ? `${best.reps} × ${kgNumber(best.kg)} kg` : `${kgNumber(best.kg)} kg`;
}

type LiftAcc = { exerciseId: string; name: string; before: number | null; points: { date: string; kg: number }[]; entries: ReportExercise[] };

/** Charges par exercice : charge de travail avant la période (dernière séance faite) et charges de la période. */
function liftsOf(sessions: ReportSession[], p: Period): Map<string, LiftAcc> {
  const out = new Map<string, LiftAcc>();
  const done = sessions.filter((s) => s.status === "done").sort((a, b) => a.date.localeCompare(b.date));
  for (const s of done) {
    if (s.date > p.end) continue;
    for (const ex of s.exercises) {
      const kg = topLoad(ex);
      if (kg == null) continue;
      const acc = out.get(ex.exerciseId) ?? { exerciseId: ex.exerciseId, name: ex.name, before: null, points: [], entries: [] };
      if (s.date < p.start) acc.before = kg; // la plus récente l'emporte (tri croissant)
      else {
        acc.points.push({ date: s.date, kg });
        acc.entries.push(ex);
      }
      out.set(ex.exerciseId, acc);
    }
  }
  for (const [id, acc] of out) if (!acc.points.length) out.delete(id);
  return out;
}

function toLift(acc: LiftAcc): ReportLift {
  const startKg = acc.before ?? acc.points[0]?.kg ?? null;
  const endKg = acc.points.at(-1)?.kg ?? null;
  return {
    exercise: acc.name,
    startKg,
    endKg,
    deltaKg: startKg != null && endKg != null ? round1(endKg - startKg) : null,
    bestSet: bestSetOf(acc.entries),
  };
}

// ---------------------------------------------------------------- objectif

type TargetInfo = { kind: "lift"; exerciseId: string; name: string; kg: number } | { kind: "poids"; kg: number } | { kind: "autre"; text: string } | null;

function toProgSessions(sessions: ReportSession[]): ProgSession[] {
  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    exercises: s.exercises.map((e) => ({ exerciseId: e.exerciseId, name: e.name, category: e.category, sets: e.sets.map((x) => ({ load_kg: x.loadKg, reps: x.reps, done: x.done })) })),
  }));
}

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
  const sessions = input.sessions.filter((s) => inPeriod(s.date, p));
  const done = sessions.filter((s) => s.status === "done");
  const planned = sessions.length;
  const adherencePct = planned ? Math.round((done.length / planned) * 100) : 0;
  const sessionsBlock = {
    planned,
    done: done.length,
    presentiel: done.filter((s) => s.mode === "presentiel").length,
    solo: done.filter((s) => s.mode !== "presentiel").length,
    adherencePct,
  };

  // RPE moyen des retours des séances de la période
  const rpes = input.feedback.filter((f) => inPeriod(f.sessionDate, p)).map((f) => f.rpe);
  const rpeAvg = rpes.length ? round1(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null;

  // Objectif et exercice de référence
  const target = targetOf(input);
  // Charges de la période ; référence = exercice de l'objectif, sinon la plus forte progression, sinon le plus pratiqué
  const accs = liftsOf(input.sessions, p);
  const ref = target?.kind === "lift" ? { exerciseId: target.exerciseId } : (() => {
    const best = [...accs.values()].map((a) => ({ id: a.exerciseId, d: toLift(a).deltaKg ?? 0 })).filter((x) => x.d > 0).sort((a, b) => b.d - a.d)[0];
    if (best) return { exerciseId: best.id };
    const r = pickReference({}, toProgSessions(sessions));
    return r ? { exerciseId: r.exerciseId } : null;
  })();

  // Ordre : référence d'abord, puis les exercices les plus pratiqués et les plus progressés (5 au plus)
  const lifts = [...accs.values()]
    .map((acc) => ({ acc, lift: toLift(acc) }))
    .sort(
      (a, b) =>
        Number(b.acc.exerciseId === ref?.exerciseId) - Number(a.acc.exerciseId === ref?.exerciseId) ||
        b.acc.points.length - a.acc.points.length ||
        (b.lift.deltaKg ?? 0) - (a.lift.deltaKg ?? 0) ||
        (b.lift.endKg ?? 0) - (a.lift.endKg ?? 0) ||
        a.lift.exercise.localeCompare(b.lift.exercise, "fr"),
    );
  const top = lifts.slice(0, 5);
  // lifts[0] est l'exercice principal : weeks[].topKg et le graphique le suivent (contrat de la vue coaché).
  const refLift = top[0] ?? null;
  const targetLift = target?.kind === "lift" && refLift?.acc.exerciseId === target.exerciseId ? refLift : null;

  // Semaines : blocs de 7 jours depuis le début de la période
  const weeks: ReportWeekPoint[] = [];
  for (let w = p.start; w <= p.end; w = addDays(w, 7)) {
    const wEnd = addDays(w, 6) < p.end ? addDays(w, 6) : p.end;
    const inW = sessions.filter((s) => s.date >= w && s.date <= wEnd);
    const kgs = refLift ? refLift.acc.points.filter((pt) => pt.date >= w && pt.date <= wEnd).map((pt) => pt.kg) : [];
    weeks.push({ weekStart: w, planned: inW.length, done: inW.filter((s) => s.status === "done").length, topKg: kgs.length ? Math.max(...kgs) : null });
  }

  // Poids
  const wPoints = input.weights
    .filter((w) => inPeriod(w.date, p))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, kg: round1(w.kg) }));
  const wStart = wPoints[0]?.kg ?? null;
  const wEnd = wPoints.at(-1)?.kg ?? null;
  const weight = { startKg: wStart, endKg: wEnd, deltaKg: wStart != null && wEnd != null && wPoints.length > 1 ? round1(wEnd - wStart) : null, points: wPoints };

  // Nutrition
  const byDay = new Map<string, number>();
  for (const f of input.food) if (inPeriod(f.date, p)) byDay.set(f.date, (byDay.get(f.date) ?? 0) + f.kcal);
  const targetKcal = input.kcalGoals.length ? Math.round(input.kcalGoals.reduce((a, b) => a + b, 0) / input.kcalGoals.length / 10) * 10 : null;
  const nutrition =
    byDay.size || targetKcal != null
      ? { daysLogged: byDay.size, avgKcal: byDay.size ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size) : null, targetKcal }
      : null;

  // Objectif lisible
  const goal = {
    label: input.goal?.trim() || null,
    target: target?.kind === "lift" ? `${target.name} ${kgNumber(target.kg)} kg` : target?.kind === "poids" ? `Poids ${kgNumber(target.kg)} kg` : target?.kind === "autre" ? target.text : null,
    progressText:
      target?.kind === "lift" && targetLift?.lift.endKg != null
        ? `${target.name} : ${kgNumber(targetLift.lift.endKg)} / ${kgNumber(target.kg)} kg`
        : target?.kind === "poids" && wEnd != null
          ? `Poids : ${bodyKg(wEnd)} / ${kgNumber(target.kg)} kg`
          : null,
  };

  const ctx: RuleContext = { period: p, sessions: sessionsBlock, refLift: refLift?.lift ?? null, targetLift: targetLift?.lift ?? null, others: top.filter((l) => l !== refLift).map((l) => l.lift), weight, nutrition, target, sessionsPerWeek: input.sessionsPerWeek };

  return {
    version: 1,
    sessions: sessionsBlock,
    rpeAvg,
    lifts: top.map((l) => l.lift),
    weeks,
    weight,
    nutrition,
    goal,
    highlights: highlightsOf(ctx),
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
  target: TargetInfo;
  sessionsPerWeek: number | null;
};

/** 2 à 4 phrases courtes, dans l'ordre : charge de référence, assiduité, encadré / autonomie, poids, autre charge, journal. */
export function highlightsOf(c: RuleContext): string[] {
  const out: string[] = [];
  const weeks = weeksIn(c.period);
  const r = c.refLift;
  if (r?.deltaKg != null && r.startKg != null && r.endKg != null) {
    if (r.deltaKg > 0) out.push(`${r.exercise} : ${signedKg(r.deltaKg)} en ${plural(weeks, "semaine")} (${kgNumber(r.startKg)} → ${kgNumber(r.endKg)} kg)`);
    else if (r.deltaKg === 0) out.push(`${r.exercise} : charge tenue à ${kgNumber(r.endKg)} kg`);
  }

  const s = c.sessions;
  if (s.planned > 0) out.push(`${s.done} séance${s.done > 1 ? "s" : ""} sur ${s.planned} faite${s.done > 1 ? "s" : ""} (${s.adherencePct} %)`);
  else out.push("Aucune séance prévue sur la période");

  if (s.done > 0) {
    if (s.presentiel && s.solo) out.push(`${plural(s.presentiel, "séance")} encadrée${s.presentiel > 1 ? "s" : ""}, ${s.solo} en autonomie`);
    else if (s.presentiel) out.push(`${plural(s.presentiel, "séance")} encadrée${s.presentiel > 1 ? "s" : ""} avec le coach`);
    else out.push(`${plural(s.solo, "séance")} faite${s.solo > 1 ? "s" : ""} en autonomie`);
  }

  const w = c.weight;
  if (w.deltaKg != null && w.startKg != null && w.endKg != null) {
    out.push(Math.abs(w.deltaKg) < 0.5 ? `Poids stable : ${bodyKg(w.startKg)} → ${bodyKg(w.endKg)} kg` : `Poids : ${signedKg(w.deltaKg)} (${bodyKg(w.startKg)} → ${bodyKg(w.endKg)} kg)`);
  }

  const other = c.others.filter((l) => (l.deltaKg ?? 0) > 0).sort((a, b) => (b.deltaKg ?? 0) - (a.deltaKg ?? 0))[0];
  if (other?.deltaKg != null) out.push(`${other.exercise} : ${signedKg(other.deltaKg)}`);

  const n = c.nutrition;
  if (n && n.daysLogged >= 7) out.push(`Journal alimentaire rempli ${n.daysLogged} jours sur ${daysBetween(c.period.start, c.period.end) + 1}`);

  return out.slice(0, 4);
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
