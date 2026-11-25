/** Calculs de semaine et d'heures de l'agenda, à l'heure de Paris. Pur, utilisable côté serveur et client. */

export const TZ = "Europe/Paris";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isIsoDate = (s: string) => ISO_DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
export const isHhmm = (s: string) => HHMM.test(s);

/** Date du jour (ou d'un instant) à Paris, au format AAAA-MM-JJ. */
export function parisDate(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** Ajoute n jours à une date AAAA-MM-JJ (calcul en UTC, sans effet d'heure d'été). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant la date. */
export function mondayOf(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  return addDays(iso, -((dow + 6) % 7));
}

/** Décalage de Paris par rapport à UTC (en ms) à un instant donné. */
function parisOffsetMs(at: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** « 2026-12-01 » + « 18:00 » (heure de Paris) → instant UTC. Gère l'heure d'été. */
export function parisToUtc(dateIso: string, hhmm: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, h, mi);
  let ts = naive - parisOffsetMs(naive);
  ts = naive - parisOffsetMs(ts);
  return new Date(ts);
}

export type WeekDay = { iso: string; short: string; long: string };

/** Les 7 jours (lundi → dimanche) d'une semaine. */
export function weekDays(monday: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(monday, i);
    const d = new Date(`${iso}T12:00:00Z`);
    return {
      iso,
      short: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(d),
      long: new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(d),
    };
  });
}

/** « Semaine du 23 au 29 novembre » / « Semaine du 30 novembre au 6 décembre ». */
export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const f = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts }).format(new Date(`${iso}T12:00:00Z`));
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const start = sameMonth ? f(monday, { day: "numeric" }) : f(monday, sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
  return `Semaine du ${start} au ${f(sunday, { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) })}`;
}

/** « 18:00 » à Paris. */
export const fmtTime = (d: string | Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));

/** « mer. 25 nov. » à Paris. */
export const fmtDayShort = (d: string | Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(d));

export const formatLabel: Record<string, string> = { visio: "Visio", salle: "En salle", les_deux: "Visio ou salle" };

/** Durée d'une séance encadrée à la salle. */
export const SESSION_MINUTES = 60;

/** Fin d'une séance encadrée (début + 1 h). */
export const sessionEnd = (startsAt: string) => new Date(new Date(startsAt).getTime() + SESSION_MINUTES * 60_000).toISOString();

/** « lun. » à partir d'une date AAAA-MM-JJ. */
export const fmtWeekday = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" }).format(new Date(`${iso}T12:00:00Z`));
