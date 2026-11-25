import { IconProfil } from "@/components/icons";

export type SessionMode = "presentiel" | "solo";

export const asMode = (m: string | null | undefined): SessionMode => (m === "presentiel" ? "presentiel" : "solo");

/** Heure du rendez-vous à Paris : « 17:00 » (chaîne vide si pas d'heure). */
export function sessionHour(startsAt: string | null | undefined): string {
  if (!startsAt) return "";
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d);
}

type Props = {
  mode: string | null | undefined;
  startsAt?: string | null;
  /** Prénom du coach (« Karim »), pour la version complète. */
  coach?: string;
  /** « Présentiel » / « Solo », pour les listes. */
  compact?: boolean;
  className?: string;
};

/**
 * Mode d'une séance : encadrée par le coach à la salle, ou en autonomie (suivi à distance).
 * Complet : « Avec Karim · 17:00 · à la salle » / « En autonomie ». Compact : « Présentiel » / « Solo ».
 */
export function ModeBadge({ mode, startsAt, coach = "ton coach", compact = false, className = "" }: Props) {
  const m = asMode(mode);
  const hour = sessionHour(startsAt);
  const tone = m === "presentiel" ? "bg-olive-pale text-olive-fonce" : "bg-separateur text-texte-2";
  const text = compact
    ? m === "presentiel"
      ? hour
        ? `Présentiel · ${hour}`
        : "Présentiel"
      : "Solo"
    : m === "presentiel"
      ? ["Avec " + coach, hour, "à la salle"].filter(Boolean).join(" · ")
      : "En autonomie";
  const label = m === "presentiel" ? `Séance encadrée${hour ? ` à ${hour}` : ""}, à la salle` : "Séance en autonomie";
  return (
    <span
      title={label}
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-legende font-semibold tabular-nums ${tone} ${className}`}
    >
      {m === "presentiel" && !compact && <IconProfil width={14} height={14} aria-hidden="true" className="shrink-0" />}
      <span className="truncate">{text}</span>
    </span>
  );
}
