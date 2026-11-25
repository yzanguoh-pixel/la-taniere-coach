/**
 * Contenu figé d'un bilan de progression (colonne progress_reports.data), version 2.
 * Calculé côté serveur au moment de l'envoi par le coach ; lu tel quel par le coaché.
 * Toutes les dates au format AAAA-MM-JJ (Europe/Paris), charges et poids en kg.
 *
 * Nouveautés v2 (retour client du 25/11) :
 *  - `profile` : le radar « profil athlétique » affiché en tête (6 axes notés de 0 à 5,
 *    période précédente vs période du bilan), chaque note avec sa règle de calcul lisible ;
 *  - `lifts` détaillés exercice par exercice (navigation squat / développé couché / …) :
 *    une courbe hebdomadaire (charge max, 1RM estimé, volume) et l'historique séance par séance.
 */

/** Axes du radar, dans l'ordre d'affichage (sens horaire depuis le haut). */
export const PROFILE_AXES = ["force", "endurance", "mobilite", "regularite", "recuperation", "nutrition"] as const;
export type ProfileAxis = (typeof PROFILE_AXES)[number];

export const PROFILE_AXIS_LABELS: Record<ProfileAxis, string> = {
  force: "Force",
  endurance: "Endurance",
  mobilite: "Mobilité et gainage",
  regularite: "Régularité",
  recuperation: "Récupération",
  nutrition: "Nutrition",
};

export type ProfileScore = {
  axis: ProfileAxis;
  before: number | null; // note 0–5 (une décimale) sur la période précédente de même durée ; null si pas de données
  after: number | null; // note 0–5 sur la période du bilan ; null si pas de données
  detail: string; // ce qui justifie la note, en clair : « 1RM estimé squat 70 kg = 1,13 × poids de corps »
  rule: string; // règle de calcul, une phrase : « 5/5 = squat à 1,5 × poids de corps, développé couché à 1 ×, soulevé de terre à 1,8 × »
};

export type LiftWeek = {
  weekStart: string;
  topKg: number | null; // charge la plus lourde réalisée dans la semaine
  e1rm: number | null; // 1RM estimé (Epley : kg × (1 + reps / 30)), meilleur de la semaine, arrondi à 0,5
  volumeKg: number; // somme reps × kg des séries faites
  setsDone: number;
};

export type LiftSession = {
  date: string;
  sessionName: string; // « Séance A · Squat »
  mode: "presentiel" | "solo";
  sets: { reps: number | null; kg: number | null; rpe: number | null }[]; // séries faites, dans l'ordre
  bestSet: string | null; // « 5 × 60 kg »
  e1rm: number | null;
};

export type ReportLift = {
  exerciseId: string;
  exercise: string; // « Squat barre »
  category: string; // catégorie de la bibliothèque : « Jambes », « Pectoraux »…
  startKg: number | null; // charge de travail au début de la période
  endKg: number | null; // charge de travail à la fin de la période
  deltaKg: number | null;
  startE1rm: number | null;
  endE1rm: number | null;
  prKg: number | null; // meilleure charge réalisée sur la période
  bestSet: string | null; // « 5 × 60 kg »
  targetKg: number | null; // objectif du coaché pour cet exercice s'il existe (clients.targets)
  weeks: LiftWeek[]; // une entrée par semaine de la période (mêmes semaines que ProgressReportData.weeks)
  sessions: LiftSession[]; // historique séance par séance, du plus ancien au plus récent
};

export type ReportWeekPoint = {
  weekStart: string;
  planned: number;
  done: number;
  presentiel: number; // faites en présentiel
  topKg: number | null; // charge max de lifts[0] (exercice principal) cette semaine
  volumeKg: number; // volume total toutes séances
};

export type ProgressReportData = {
  version: 2;
  profile: ProfileScore[]; // les 6 axes, dans l'ordre PROFILE_AXES
  sessions: {
    planned: number;
    done: number;
    presentiel: number; // séances encadrées faites
    solo: number; // séances en autonomie faites
    adherencePct: number; // done / planned, arrondi
    totalVolumeKg: number; // volume soulevé total sur la période
    totalSets: number;
  };
  rpeAvg: number | null; // RPE moyen des retours de la période
  feelings: { facile: number; correct: number; difficile: number; douleur: number }; // nombre de retours par ressenti
  painZones: string[]; // zones de douleur signalées (sans doublon)
  lifts: ReportLift[]; // exercices suivis (3 à 8), lifts[0] = exercice principal (celui de l'objectif)
  weeks: ReportWeekPoint[];
  weight: { startKg: number | null; endKg: number | null; deltaKg: number | null; points: { date: string; kg: number }[] };
  nutrition: {
    daysLogged: number;
    avgKcal: number | null;
    targetKcal: number | null;
    avgProteinG: number | null;
    targetProteinG: number | null;
    daysOnTarget: number; // jours à ± 10 % de l'objectif kcal
  } | null;
  endurance: { minutes: number; sessions: number; distanceKm: number | null } | null; // cardio, course, Hyrox, activités montre
  goal: { label: string | null; target: string | null; progressText: string | null }; // progressText au format « Squat barre : 60 / 70 kg »
  highlights: string[]; // 3 à 5 phrases courtes générées par règles
  watchouts: string[]; // 0 à 3 points d'attention (douleur, irrégularité, nutrition peu saisie)
  nextFocus: string | null; // axe proposé pour la suite (modifiable par le coach avant envoi)
};
