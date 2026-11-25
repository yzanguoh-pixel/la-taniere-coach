import type { ProgressReportData } from "@/lib/bilans-progression/types";

/**
 * Exemple typé d'un bilan de Léa, UNIQUEMENT pour les tests de rendu en développement
 * (le coach n'a encore rien envoyé). N'est importé par aucune page : jamais affiché en production.
 */
export const SAMPLE_REPORT_META = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Bilan du mois — Léa",
  periodStart: "2026-10-28",
  periodEnd: "2026-11-24",
  sentAt: "2026-11-25T09:30:00+01:00",
  readAt: null,
  coachNote:
    "Superbe mois Léa ! Ta régularité paie : +10 kg au squat et une technique bien plus stable. On garde ce rythme et on vise 65 kg avant Noël.",
} as const;

export const SAMPLE_REPORT_DATA: ProgressReportData = {
  version: 1,
  sessions: { planned: 12, done: 11, presentiel: 3, solo: 8, adherencePct: 92 },
  rpeAvg: 6.8,
  lifts: [
    { exercise: "Squat barre", startKg: 50, endKg: 60, deltaKg: 10, bestSet: "5 × 60 kg" },
    { exercise: "Soulevé de terre roumain", startKg: 40, endKg: 47.5, deltaKg: 7.5, bestSet: "8 × 47,5 kg" },
    { exercise: "Développé couché haltères", startKg: 12, endKg: 14, deltaKg: 2, bestSet: "10 × 14 kg" },
    { exercise: "Hip thrust", startKg: 60, endKg: 60, deltaKg: 0, bestSet: null },
  ],
  weeks: [
    { weekStart: "2026-10-26", planned: 3, done: 3, topKg: 50 },
    { weekStart: "2026-11-02", planned: 3, done: 3, topKg: 52.5 },
    { weekStart: "2026-11-09", planned: 3, done: 2, topKg: 55 },
    { weekStart: "2026-11-16", planned: 3, done: 3, topKg: 60 },
  ],
  weight: {
    startKg: 63.4,
    endKg: 62.2,
    deltaKg: -1.2,
    points: [
      { date: "2026-10-28", kg: 63.4 },
      { date: "2026-11-04", kg: 63.1 },
      { date: "2026-11-11", kg: 62.9 },
      { date: "2026-11-18", kg: 62.5 },
      { date: "2026-11-24", kg: 62.2 },
    ],
  },
  nutrition: { daysLogged: 19, avgKcal: 1980, targetKcal: 2000 },
  goal: { label: "Squat à 70 kg", target: "70 kg", progressText: "Squat 60 / 70 kg" },
  highlights: ["+10 kg au squat en 4 semaines", "11 séances sur 12, dont 3 encadrées", "Effort bien dosé : RPE moyen 6,8"],
  nextFocus: "Passer 65 kg au squat en gardant la profondeur, et ajouter une séance mobilité par semaine.",
};

/** Variante minimale (champs vides) pour vérifier les états dégradés. */
export const SAMPLE_REPORT_DATA_MINIMAL: ProgressReportData = {
  version: 1,
  sessions: { planned: 0, done: 0, presentiel: 0, solo: 0, adherencePct: 0 },
  rpeAvg: null,
  lifts: [],
  weeks: [],
  weight: { startKg: null, endKg: null, deltaKg: null, points: [] },
  nutrition: null,
  goal: { label: null, target: null, progressText: null },
  highlights: [],
  nextFocus: null,
};
