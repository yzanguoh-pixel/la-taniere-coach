/** Mise en forme partagée de l'espace coaché (fonctions pures, utilisables côté serveur et client). */

export const FEELINGS = ["facile", "correct", "difficile", "douleur"] as const;
export type Feeling = (typeof FEELINGS)[number];
export const FEELING_LABELS: Record<Feeling, string> = { facile: "Facile", correct: "Correct", difficile: "Difficile", douleur: "Douleur" };

export const TIME_ZONE = "Europe/Paris";

/** Date du jour (AAAA-MM-JJ) à Paris, pour comparer avec client_sessions.date. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Mercredi 25 novembre ». */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return cap(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }));
}

/** « Aujourd’hui », « Demain », « Hier » ou la date longue. */
export function dayLabel(iso: string, today: string = todayIso()): string {
  const diff = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  return longDate(iso);
}

/** 62.5 → « 62,5 kg ». */
export function formatKg(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  return `${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg`;
}

export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** « Séance A — Squat ». */
export function sessionTitle(s: { label: string; name: string }): string {
  return `Séance ${s.label} — ${s.name}`;
}

/** Les exercices de gainage se comptent en secondes, le reste en répétitions. */
export function isTimed(category: string | null | undefined): boolean {
  return category === "Gainage";
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n > 1 ? pluralWord : word}`;
}

/** Prescription d'une série : « 6 reps × 60 kg », « 45 s ». */
export function setPrescription(set: { target_reps: number | null; target_load_kg: number | string | null }, timed: boolean): string {
  const reps = set.target_reps == null ? "" : timed ? `${set.target_reps} s` : `${set.target_reps} reps`;
  const load = toNumber(set.target_load_kg);
  return [reps, load != null ? formatKg(load) : ""].filter(Boolean).join(" × ") || "Libre";
}

/** RPE cible : « RPE 7 », ou chaîne vide. */
export function rpeLabel(v: number | string | null | undefined): string {
  const n = toNumber(v);
  return n == null ? "" : `RPE ${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`;
}

type DurationExercise = { category: string | null; rest_s: number | null; sets: { target_reps: number | null }[] };

/**
 * Durée estimée (comme la démo) : par série environ 45 s d'effort (ou la durée tenue pour le gainage)
 * plus le repos prévu (60 s par défaut), arrondie à 5 min.
 */
export function estimateMinutes(exercises: DurationExercise[]): number | null {
  const sec = exercises.reduce((total, ex) => {
    const rest = ex.rest_s ?? 60;
    return total + ex.sets.reduce((t, s) => t + (isTimed(ex.category) && s.target_reps ? s.target_reps : 45) + rest, 0);
  }, 0);
  return sec ? Math.max(5, Math.round(sec / 300) * 5) : null;
}

/** Charge clé : l'exercice le plus chargé de la séance. */
export function keyLoad(exercises: { name: string; sets: { target_load_kg: number | string | null }[] }[]): { name: string; kg: number } | null {
  let best: { name: string; kg: number } | null = null;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      const kg = toNumber(s.target_load_kg);
      if (kg != null && (!best || kg > best.kg)) best = { name: ex.name, kg };
    }
  }
  return best;
}
