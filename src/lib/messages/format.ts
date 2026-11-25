/** Mise en forme du fil de messages (fonctions pures, serveur et client). */

const TZ = "Europe/Paris";

/** Longueur maximale d’un message texte. */
export const MESSAGE_MAX_LENGTH = 2000;

function parisDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** « 14:32 ». */
export function messageTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Clé de jour (AAAA-MM-JJ, heure de Paris) pour regrouper le fil. */
export function messageDayKey(iso: string): string {
  return parisDay(new Date(iso));
}

/** « Aujourd’hui », « Hier » ou « Lundi 23 novembre ». */
export function messageDayLabel(iso: string, now: Date = new Date()): string {
  const key = parisDay(new Date(iso));
  const today = parisDay(now);
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 864e5);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  const label = new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...(key.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
