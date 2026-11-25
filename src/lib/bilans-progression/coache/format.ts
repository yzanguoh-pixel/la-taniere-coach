/** Formats d'affichage des bilans côté coaché (dates en Europe/Paris, nombres à la française). */

const dayMonth = (iso: string, month: "short" | "long") =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month, timeZone: "UTC" });

/** « du 28 oct. au 24 nov. » */
export const periodLabel = (start: string, end: string) => `du ${dayMonth(start, "short")} au ${dayMonth(end, "short")}`;

/** Horodatage → « 25 novembre » (ou « 25 nov. »), heure de Paris. */
export function sentDate(ts: string, month: "short" | "long" = "long"): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month, timeZone: "Europe/Paris" });
}

/** 62.5 → « 62,5 » */
export const nb = (v: number, digits = 1) => v.toLocaleString("fr-FR", { maximumFractionDigits: digits });
/** 2.5 → « +2,5 », -1.2 → « −1,2 », 0 → « 0 » */
export const signed = (v: number, digits = 1) => (v > 0 ? `+${nb(v, digits)}` : v < 0 ? `−${nb(-v, digits)}` : "0");
/** « 28 oct. » */
export const shortDay = (iso: string) => dayMonth(iso, "short");
/** « 28 octobre » */
export const longDay = (iso: string) => dayMonth(iso, "long");
/** Note du radar : 2.8 → « 2,8 », 3 → « 3,0 » */
export const note = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Volume soulevé : 12450 → « 12 450 kg » ; ≥ 100 t → « 124 t » */
export const volume = (kg: number) => (kg >= 100_000 ? `${nb(kg / 1000, 0)} t` : `${nb(Math.round(kg), 0)} kg`);
/** « mardi » */
export const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", timeZone: "UTC" });
