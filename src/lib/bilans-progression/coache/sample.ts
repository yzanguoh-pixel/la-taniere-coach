import type { LiftSession, LiftWeek, ProgressReportData, ReportLift } from "@/lib/bilans-progression/types";

/**
 * Exemple typé d'un bilan de Léa (version 2), UNIQUEMENT pour les tests de rendu en développement.
 * N'est importé par aucune page : jamais affiché en production.
 * Période : 4 semaines du lundi 26 oct. au dimanche 22 nov. 2026 ; 8 séances sur 8, dont 5 encadrées.
 */
export const SAMPLE_REPORT_META = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Bilan du mois — Léa",
  periodStart: "2026-10-26",
  periodEnd: "2026-11-22",
  sentAt: "2026-11-25T09:30:00+01:00",
  readAt: null,
  coachName: "Karim",
  coachNote:
    "Superbe mois Léa ! Huit séances sur huit : ta régularité paie, +10 kg au squat et une technique bien plus stable. On garde ce rythme et on vise 65 kg avant Noël.",
} as const;

const WEEKS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];

// Séance A (squat, développé couché, hip thrust) et séance B (soulevé de terre, presse), deux par semaine.
const A = [
  { date: "2026-10-27", mode: "presentiel" },
  { date: "2026-11-03", mode: "presentiel" },
  { date: "2026-11-10", mode: "presentiel" },
  { date: "2026-11-17", mode: "presentiel" },
] as const;
const B = [
  { date: "2026-10-30", mode: "solo" },
  { date: "2026-11-06", mode: "solo" },
  { date: "2026-11-13", mode: "presentiel" },
  { date: "2026-11-20", mode: "solo" },
] as const;

type S = [reps: number, kg: number, rpe: number | null];
const e1rm = (reps: number, kg: number) => Math.round(kg * (1 + reps / 30) * 2) / 2;
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** Construit un exercice cohérent (semaines, séances, 1RM estimé, record) à partir des séries réalisées. */
function buildLift(
  exerciseId: string,
  exercise: string,
  category: string,
  sessionName: string,
  slots: readonly { date: string; mode: "presentiel" | "solo" }[],
  perSession: S[][],
  targetKg: number | null = null,
): ReportLift {
  const sessions: LiftSession[] = slots.map((slot, i) => {
    const sets = perSession[i];
    const best = sets.reduce((b, s) => (s[1] > b[1] || (s[1] === b[1] && s[0] > b[0]) ? s : b));
    return {
      date: slot.date,
      sessionName,
      mode: slot.mode,
      sets: sets.map(([reps, kg, rpe]) => ({ reps, kg, rpe })),
      bestSet: `${best[0]} × ${fr(best[1])} kg`,
      e1rm: Math.max(...sets.map(([r, k]) => e1rm(r, k))),
    };
  });
  const weeks: LiftWeek[] = WEEKS.map((weekStart, wi) => {
    const inWeek = sessions.filter((s) => s.date >= weekStart && s.date < (WEEKS[wi + 1] ?? "2026-11-23"));
    const sets = inWeek.flatMap((s) => s.sets);
    return {
      weekStart,
      topKg: sets.length ? Math.max(...sets.map((s) => s.kg ?? 0)) : null,
      e1rm: inWeek.length ? Math.max(...inWeek.map((s) => s.e1rm ?? 0)) : null,
      volumeKg: sets.reduce((t, s) => t + (s.reps ?? 0) * (s.kg ?? 0), 0),
      setsDone: sets.length,
    };
  });
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const startKg = first.sets[0].kg;
  const endKg = last.sets[0].kg;
  const prKg = Math.max(...weeks.map((w) => w.topKg ?? 0));
  const bestSession = sessions.reduce((b, s) => ((s.e1rm ?? 0) > (b.e1rm ?? 0) ? s : b));
  return {
    exerciseId,
    exercise,
    category,
    startKg,
    endKg,
    deltaKg: startKg != null && endKg != null ? endKg - startKg : null,
    startE1rm: first.e1rm,
    endE1rm: last.e1rm,
    prKg,
    bestSet: bestSession.bestSet,
    targetKg,
    weeks,
    sessions,
  };
}

const squat = buildLift(
  "ex-squat-barre",
  "Squat barre",
  "Jambes",
  "Séance A · Squat",
  A,
  [
    [[5, 50, 6], [5, 50, 6], [5, 50, 7]],
    [[5, 52.5, 6], [5, 52.5, 7], [5, 52.5, 7]],
    [[5, 55, 7], [5, 55, 7], [5, 55, 8]],
    [[5, 60, 7], [5, 60, 8], [4, 60, 9]],
  ],
  70,
);
const bench = buildLift("ex-developpe-couche", "Développé couché", "Pectoraux", "Séance A · Squat", A, [
  [[8, 30, 6], [8, 30, 7], [8, 30, 7]],
  [[8, 32.5, 7], [7, 32.5, 8], [7, 32.5, 8]],
  [[8, 32.5, 7], [8, 32.5, 7], [8, 32.5, 8]],
  [[6, 35, 8], [6, 35, 8], [5, 35, 9]],
]);
const hipThrust = buildLift("ex-hip-thrust", "Hip thrust", "Fessiers", "Séance A · Squat", A, [
  [[10, 60, 6], [10, 60, 6], [10, 60, 7]],
  [[10, 70, 7], [10, 70, 7], [10, 70, 7]],
  [[10, 75, 7], [10, 75, 7], [9, 75, 8]],
  [[10, 80, 7], [10, 80, 8], [8, 80, 8]],
]);
const deadlift = buildLift("ex-souleve-de-terre", "Soulevé de terre", "Dos", "Séance B · Tirage", B, [
  [[5, 60, 6], [5, 60, 7], [5, 60, 7]],
  [[5, 65, 7], [5, 65, 7], [5, 65, 8]],
  [[5, 67.5, 7], [5, 67.5, 8], [4, 67.5, 8]],
  [[5, 70, 7], [5, 70, 8], [5, 70, 8]],
]);
const press = buildLift("ex-presse-cuisses", "Presse à cuisses", "Jambes", "Séance B · Tirage", B, [
  [[12, 100, 6], [12, 100, 6], [12, 100, 7]],
  [[12, 110, 7], [12, 110, 7], [10, 110, 8]],
  [[12, 110, 6], [12, 110, 7], [12, 110, 7]],
  [[10, 120, 7], [10, 120, 8], [10, 120, 8]],
]);

const LIFTS = [squat, bench, deadlift, hipThrust, press];
const weekVolume = (wi: number) => LIFTS.reduce((t, l) => t + l.weeks[wi].volumeKg, 0);
const totalSets = LIFTS.reduce((t, l) => t + l.weeks.reduce((u, w) => u + w.setsDone, 0), 0);

export const SAMPLE_REPORT_DATA: ProgressReportData = {
  version: 2,
  profile: [
    {
      axis: "force",
      before: 2.4,
      after: 2.9,
      detail: "1RM estimé : squat 70 kg (1,13 × ton poids), développé couché 42 kg (0,68 ×), soulevé de terre 81,5 kg (1,31 ×).",
      rule: "5/5 = squat à 1,5 × le poids de corps, développé couché à 1 ×, soulevé de terre à 1,8 × ; la note est la moyenne des trois.",
    },
    {
      axis: "endurance",
      before: 2,
      after: 2.4,
      detail: "145 min de cardio en 4 sorties, 18,5 km au total.",
      rule: "5/5 = 150 min d'effort cardio par semaine (repère OMS) ; la note suit le temps hebdomadaire moyen.",
    },
    {
      axis: "mobilite",
      before: 2.6,
      after: 3.1,
      detail: "Gainage tenu 1 min 15 (contre 55 s) ; squat sous la parallèle validé par Karim.",
      rule: "Moyenne de deux repères : gainage (5/5 = 2 min) et amplitude au squat notée par le coach.",
    },
    {
      axis: "regularite",
      before: 3.8,
      after: 5,
      detail: "8 séances faites sur 8 prévues (100 %).",
      rule: "Note = part des séances prévues réellement faites × 5.",
    },
    {
      axis: "recuperation",
      before: 3.2,
      after: 3.5,
      detail: "RPE moyen 7,2 ; une gêne signalée sur 8 retours.",
      rule: "Part des retours « facile » ou « correct », retirée d'un point par douleur signalée, ramenée sur 5.",
    },
    {
      axis: "nutrition",
      before: null,
      after: 3.2,
      detail: "16 jours saisis sur 28 ; 1 960 kcal et 98 g de protéines en moyenne.",
      rule: "Moyenne de trois repères : jours saisis, jours à ± 10 % de l'objectif calorique, protéines par rapport à l'objectif.",
    },
  ],
  sessions: {
    planned: 8,
    done: 8,
    presentiel: 5,
    solo: 3,
    adherencePct: 100,
    totalVolumeKg: WEEKS.reduce((t, _, i) => t + weekVolume(i), 0),
    totalSets,
  },
  rpeAvg: 7.2,
  feelings: { facile: 2, correct: 4, difficile: 1, douleur: 1 },
  painZones: ["Bas du dos"],
  lifts: LIFTS,
  weeks: WEEKS.map((weekStart, i) => ({
    weekStart,
    planned: 2,
    done: 2,
    presentiel: i === 2 ? 2 : 1,
    topKg: squat.weeks[i].topKg,
    volumeKg: weekVolume(i),
  })),
  weight: {
    startKg: 63.4,
    endKg: 62.2,
    deltaKg: -1.2,
    points: [
      { date: "2026-10-26", kg: 63.4 },
      { date: "2026-11-02", kg: 63.1 },
      { date: "2026-11-09", kg: 62.9 },
      { date: "2026-11-16", kg: 62.5 },
      { date: "2026-11-22", kg: 62.2 },
    ],
  },
  nutrition: { daysLogged: 16, avgKcal: 1960, targetKcal: 2000, avgProteinG: 98, targetProteinG: 110, daysOnTarget: 11 },
  endurance: { minutes: 145, sessions: 4, distanceKm: 18.5 },
  goal: { label: "Squat à 70 kg", target: "70 kg", progressText: "Squat barre : 60 / 70 kg" },
  highlights: ["+10 kg au squat en 4 semaines", "8 séances sur 8, dont 5 encadrées", "+20 kg au hip thrust, toujours en contrôle", "Effort bien dosé : RPE moyen 7,2"],
  watchouts: ["Gêne au bas du dos signalée le 13 nov. : on surveille le soulevé de terre.", "Journal alimentaire rempli 16 jours sur 28."],
  nextFocus: "Passer 65 kg au squat en gardant la profondeur, et ajouter une séance mobilité par semaine.",
};

/** Variante minimale (champs vides) pour vérifier les états dégradés. */
export const SAMPLE_REPORT_DATA_MINIMAL: ProgressReportData = {
  version: 2,
  profile: [],
  sessions: { planned: 0, done: 0, presentiel: 0, solo: 0, adherencePct: 0, totalVolumeKg: 0, totalSets: 0 },
  rpeAvg: null,
  feelings: { facile: 0, correct: 0, difficile: 0, douleur: 0 },
  painZones: [],
  lifts: [],
  weeks: [],
  weight: { startKg: null, endKg: null, deltaKg: null, points: [] },
  nutrition: null,
  endurance: null,
  goal: { label: null, target: null, progressText: null },
  highlights: [],
  watchouts: [],
  nextFocus: null,
};

/** Contenu brut d'un ancien bilan (version 1), pour vérifier le message « envoyé avant la nouvelle version ». */
export const SAMPLE_REPORT_RAW_V1: unknown = { version: 1, sessions: { planned: 12, done: 11 }, lifts: [], weeks: [] };
