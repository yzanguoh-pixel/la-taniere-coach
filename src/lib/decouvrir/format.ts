/** Parcours prospect : formats, dates à Paris et validation des coordonnées. Pur, utilisable côté client et serveur. */

export const TZ = "Europe/Paris";
export const DAYS_AHEAD = 14;

export type BilanFormat = "visio" | "salle";
export const FORMATS: BilanFormat[] = ["visio", "salle"];
export const FORMAT_LABEL: Record<BilanFormat, string> = { visio: "En visio", salle: "En salle" };

export const isFormat = (v: unknown): v is BilanFormat => v === "visio" || v === "salle";

/** Un créneau « les_deux » convient aux deux formats. */
export const slotFits = (slotFormat: string, format: BilanFormat) => slotFormat === format || slotFormat === "les_deux";

/** Créneau libre tel qu'affiché au prospect (dates déjà calculées côté serveur, fuseau Paris). */
export type FreeSlot = { id: string; startsAt: string; endsAt: string; format: string; dayKey: string; time: string };
export type DayOption = { key: string; weekday: string; day: string; month: string; label: string };

/** « 2026-11-25 » à Paris. */
export const dayKeyOf = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** « 18:00 » à Paris. */
export const timeOf = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Jeudi 26 novembre » à Paris. */
export const longDateOf = (iso: string) =>
  cap(new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }));

/** Les 14 jours à venir (aujourd'hui compris), à Paris. */
export function nextDays(now = new Date(), count = DAYS_AHEAD): DayOption[] {
  const today = dayKeyOf(now);
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000);
    const opt = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("fr-FR", { ...o, timeZone: "UTC" });
    return {
      key: d.toISOString().slice(0, 10),
      weekday: cap(opt({ weekday: "short" }).replace(".", "")),
      day: opt({ day: "numeric" }),
      month: opt({ month: "short" }),
      label: cap(opt({ weekday: "long", day: "numeric", month: "long" })),
    };
  });
}

/* ---------------------------------------------------------------- validation */

export const MSG_REQUIRED = "Ce champ est obligatoire.";
export const MSG_PHONE = "Saisissez un numéro à 10 chiffres.";
export const MSG_EMAIL = "Saisissez un e-mail valide.";
export const MSG_SLOT_TAKEN = "Ce créneau vient d’être réservé, choisissez-en un autre.";

/** « 06.41.22.18.90 » → « 0641221890 » ; null si ce n'est pas 10 chiffres commençant par 0. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  return /^0\d{9}$/.test(digits) ? digits : null;
}

/** « 0641221890 » → « 06 41 22 18 90 » (même forme que les données de démo). */
export const prettyPhone = (digits: string) => digits.replace(/(\d{2})(?=\d)/g, "$1 ");

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/* ---------------------------------------------------------------- questionnaire */

export const NIVEAUX = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "confirme", label: "Confirmé" },
] as const;

/** Champs du formulaire, dans l'ordre d'affichage. Les clés du questionnaire sont celles lues par Karim (intake_forms.answers). */
export const CONTACT_FIELDS = ["full_name", "phone", "email"] as const;
export const INTAKE_FIELDS = ["objectif", "disponibilites", "niveau", "experience", "douleurs", "alimentation", "sommeil"] as const;
export type FieldName = (typeof CONTACT_FIELDS)[number] | (typeof INTAKE_FIELDS)[number];
export const REQUIRED_FIELDS: FieldName[] = ["full_name", "phone", "objectif", "disponibilites", "niveau", "douleurs"];

export type ReserveValues = Partial<Record<FieldName, string>>;
export type ReserveState = { errors?: Partial<Record<FieldName | "slot" | "form", string>>; values?: ReserveValues };

/** Vérifie les champs et renvoie les erreurs (vide si tout est bon). */
export function validateReservation(v: ReserveValues): NonNullable<ReserveState["errors"]> {
  const errors: NonNullable<ReserveState["errors"]> = {};
  for (const f of REQUIRED_FIELDS) if (!(v[f] ?? "").trim()) errors[f] = MSG_REQUIRED;
  const phone = (v.phone ?? "").trim();
  if (phone && !normalizePhone(phone)) errors.phone = MSG_PHONE;
  const email = (v.email ?? "").trim();
  if (email && !isEmail(email)) errors.email = MSG_EMAIL;
  const niveau = v.niveau ?? "";
  if (niveau && !NIVEAUX.some((n) => n.value === niveau)) errors.niveau = MSG_REQUIRED;
  return errors;
}

/** Réservation gardée en cookie pour la page de confirmation (le visiteur ne relit pas la table bookings). */
export type Confirmation = { bookingId: string; startsAt: string; endsAt: string; format: BilanFormat; firstName: string; phone: string; intakeSent: boolean };
export const CONFIRMATION_COOKIE = "taniere_bilan";
