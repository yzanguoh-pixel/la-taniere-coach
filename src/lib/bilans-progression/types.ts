/**
 * Contenu figé d'un bilan de progression (colonne progress_reports.data).
 * Calculé côté serveur au moment de l'envoi par le coach ; lu tel quel par le coaché.
 * Toutes les dates au format AAAA-MM-JJ (Europe/Paris), poids en kg.
 */
export type ReportLift = {
  exercise: string; // « Squat barre »
  startKg: number | null; // charge de travail au début de la période
  endKg: number | null; // charge de travail à la fin de la période
  deltaKg: number | null; // endKg - startKg
  bestSet: string | null; // « 5 × 60 kg » (meilleure série de la période)
};

export type ReportWeekPoint = { weekStart: string; planned: number; done: number; topKg: number | null };

export type ProgressReportData = {
  version: 1;
  sessions: {
    planned: number;
    done: number;
    presentiel: number; // séances encadrées faites
    solo: number; // séances en autonomie faites
    adherencePct: number; // done / planned, arrondi
  };
  rpeAvg: number | null; // RPE moyen des retours de la période
  lifts: ReportLift[]; // 3 à 5 exercices principaux
  weeks: ReportWeekPoint[]; // une entrée par semaine de la période
  weight: { startKg: number | null; endKg: number | null; deltaKg: number | null; points: { date: string; kg: number }[] };
  nutrition: { daysLogged: number; avgKcal: number | null; targetKcal: number | null } | null;
  goal: { label: string | null; target: string | null; progressText: string | null }; // ex. « Squat 60 / 70 kg »
  highlights: string[]; // 2 à 4 phrases courtes générées : « +10 kg au squat en 4 semaines »
  nextFocus: string | null; // axe proposé pour la suite (modifiable par le coach avant envoi)
};
