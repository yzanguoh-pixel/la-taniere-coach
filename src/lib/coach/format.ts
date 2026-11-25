/** Règles d'urgence des retours de séance et petits formats d'affichage (espace coach). Pur, utilisable partout. */

export type Feeling = "facile" | "correct" | "difficile" | "douleur";
export type Urgency = 1 | 2 | 3 | 4;

export type UrgencyInput = { rpe: number; feeling: string; pain_zone: string | null };

/**
 * 1 douleur (ressenti « douleur » ou zone signalée),
 * 2 charge trop haute (RPE ≥ 9 ou ressenti difficile),
 * 3 à monter (RPE ≤ 6 ou ressenti facile),
 * 4 conforme.
 */
export function urgencyOf(f: UrgencyInput): Urgency {
  if (f.feeling === "douleur" || (f.pain_zone != null && f.pain_zone.trim() !== "")) return 1;
  if (f.rpe >= 9 || f.feeling === "difficile") return 2;
  if (f.rpe <= 6 || f.feeling === "facile") return 3;
  return 4;
}

export const urgencyMeta: Record<Urgency, { label: string; className: string }> = {
  1: { label: "Douleur", className: "bg-peche text-peche-fonce" },
  2: { label: "Charge trop haute", className: "bg-beurre text-beurre-fonce" },
  3: { label: "À monter", className: "bg-olive-pale text-olive-fonce" },
  4: { label: "Conforme", className: "bg-separateur text-texte-2" },
};

/** Tri de la file : urgence, puis le plus récent, puis le nom (ordre stable). */
export function sortByUrgency<T extends UrgencyInput & { created_at: string; name?: string }>(list: T[]): (T & { urgency: Urgency })[] {
  return list
    .map((f) => ({ ...f, urgency: urgencyOf(f) }))
    .sort(
      (a, b) =>
        a.urgency - b.urgency ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        (a.name ?? "").localeCompare(b.name ?? "", "fr"),
    );
}

export const feelingLabel: Record<string, string> = {
  facile: "Facile",
  correct: "Correct",
  difficile: "Difficile",
  douleur: "Douleur",
};

/** 62.5 → « 62,5 » ; 60 → « 60 ». */
export function fmtKg(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

export const firstName = (fullName: string) => fullName.split(" ")[0] ?? fullName;

const TZ = "Europe/Paris";

/** Date du jour à Paris, au format AAAA-MM-JJ (comparable aux colonnes `date`). */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** « il y a 3 h », « hier », « il y a 2 jours ». */
export function relativeTime(iso: string, now = new Date()): string {
  const diffS = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "short" });
  const abs = Math.abs(diffS);
  if (abs < 60) return "à l’instant";
  if (abs < 3600) return rtf.format(Math.round(diffS / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffS / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diffS / 86400), "day");
  return fmtDay(iso.slice(0, 10));
}

/** « lun. 30 nov. » pour une colonne `date` (AAAA-MM-JJ). */
export function fmtDay(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** « mercredi 25 novembre », majuscule initiale. */
export function fmtLongToday(now = new Date()): string {
  const s = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « 25 nov., 19:55 ». */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n > 1 ? many : one}`;
