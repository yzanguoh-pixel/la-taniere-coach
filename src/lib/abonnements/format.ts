/** Abonnements : statut affiché, périodes, prix et texte du rappel J-7. Fonctions pures, utilisables partout. */

import { pickReference, weeklyLoads, type ProgSession } from "@/lib/progression/compute";

export type SubStatus = "actif" | "a_renouveler" | "en_retard" | "resilie";
export type Period = "mensuel" | "trimestriel" | "annuel";

const DAY = 864e5;
/** Échéance « proche » : 7 jours ou moins (rappel J-7). */
export const REMINDER_DAYS = 7;

/** Nombre de jours entre deux dates AAAA-MM-JJ (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
}

export const periodMonths: Record<Period, number> = { mensuel: 1, trimestriel: 3, annuel: 12 };
export const periodLabel: Record<Period, string> = { mensuel: "Mensuel", trimestriel: "Trimestriel", annuel: "Annuel" };
export const asPeriod = (p: string): Period => (p === "trimestriel" || p === "annuel" ? p : "mensuel");

/** Ajoute n mois à une date AAAA-MM-JJ, en restant sur le dernier jour du mois si besoin (31 janv. + 1 mois → 28 févr.). */
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/**
 * Statut affiché : résilié tel quel ; en retard si l'échéance est passée ; à renouveler si elle tombe dans les 7 jours
 * (ou si Karim l'a marqué ainsi) ; sinon actif.
 */
export function effectiveStatus(stored: string, renewsOn: string, today: string): SubStatus {
  if (stored === "resilie") return "resilie";
  const left = daysBetween(today, renewsOn);
  if (left < 0 || stored === "en_retard") return "en_retard";
  if (left <= REMINDER_DAYS || stored === "a_renouveler") return "a_renouveler";
  return "actif";
}

export const statusMeta: Record<SubStatus, { label: string; className: string }> = {
  actif: { label: "Actif", className: "bg-olive-pale text-olive-fonce" },
  a_renouveler: { label: "À renouveler", className: "bg-beurre text-beurre-fonce" },
  en_retard: { label: "En retard", className: "bg-peche text-peche-fonce" },
  resilie: { label: "Résilié", className: "bg-separateur text-texte-2" },
};

export const invoiceMeta: Record<string, { label: string; className: string }> = {
  payee: { label: "Payée", className: "bg-olive-pale text-olive-fonce" },
  en_attente: { label: "En attente", className: "bg-beurre text-beurre-fonce" },
};

/** Le tarif n'est pas encore fixé : on affiche la valeur de app_config.prix_formules (« [PRIX] »). */
export const PRICE_PLACEHOLDER = "[PRIX]";

/** 79 → « 79 € » ; null → valeur de remplacement (« [PRIX] »). */
export function priceLabel(eur: number | string | null, placeholder: string = PRICE_PLACEHOLDER): string {
  if (eur === null || eur === "") return placeholder;
  const n = Number(eur);
  if (!Number.isFinite(n)) return placeholder;
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });
}

/** « 2 déc. » */
export const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
/** « 2 décembre 2026 » */
export const longDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
/** « mercredi 2 décembre » */
const weekdayDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** « dans 7 j », « aujourd’hui », « il y a 2 j ». */
export function dueLabel(renewsOn: string, today: string): string {
  const left = daysBetween(today, renewsOn);
  if (left === 0) return "aujourd’hui";
  if (left === 1) return "demain";
  if (left > 0) return `dans ${left} j`;
  return `il y a ${-left} j`;
}

const kg = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export type ProgressSummary = {
  reference: { name: string; beforeKg: number; nowKg: number } | null;
  done: number;
  due: number;
  periodStart: string;
};

/**
 * Bilan court pour le rappel : charge de référence au début du suivi → maintenant (via compute.ts de « Ma progression »),
 * et séances faites / prévues sur la période en cours (de la dernière échéance à aujourd'hui).
 */
export function progressSummary(sessions: ProgSession[], targets: Record<string, unknown>, renewsOn: string, period: Period, today: string): ProgressSummary {
  const periodStart = addMonths(renewsOn, -periodMonths[period]);
  const ref = pickReference(targets, sessions);
  let reference: ProgressSummary["reference"] = null;
  if (ref) {
    const points = weeklyLoads(sessions, ref.exerciseId, 520);
    if (points.length) reference = { name: ref.name, beforeKg: points[0].kg, nowKg: points[points.length - 1].kg };
  }
  const inPeriod = sessions.filter((s) => s.date >= periodStart && (s.status === "done" || s.date <= today));
  return { reference, due: inPeriod.length, done: inPeriod.filter((s) => s.status === "done").length, periodStart };
}

/** Texte du message événement envoyé dans le fil du coaché. */
export function reminderBody(planName: string, renewsOn: string, today: string, p: ProgressSummary): string {
  const left = daysBetween(today, renewsOn);
  const head =
    left > 0
      ? `Rappel : ton abonnement ${planName} arrive à échéance le ${weekdayDay(renewsOn)} (dans ${left} jour${left > 1 ? "s" : ""}).`
      : left === 0
        ? `Rappel : ton abonnement ${planName} arrive à échéance aujourd’hui.`
        : `Rappel : ton abonnement ${planName} est arrivé à échéance le ${weekdayDay(renewsOn)}.`;
  const parts: string[] = [];
  if (p.reference) {
    parts.push(
      p.reference.nowKg !== p.reference.beforeKg
        ? `${p.reference.name} ${kg(p.reference.beforeKg)} → ${kg(p.reference.nowKg)} kg depuis le début du suivi`
        : `${p.reference.name} stable à ${kg(p.reference.nowKg)} kg`,
    );
  }
  const since = shortDay(p.periodStart);
  parts.push(p.due ? `${p.done} séance${p.done > 1 ? "s" : ""} faite${p.done > 1 ? "s" : ""} sur ${p.due} prévue${p.due > 1 ? "s" : ""} depuis le ${since}` : `aucune séance prévue depuis le ${since}`);
  return `${head} Ton bilan : ${parts.join(" ; ")}.`;
}
