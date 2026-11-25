import { urgencyMeta, type Urgency } from "@/lib/coach/format";

export function UrgencyBadge({ urgency, detail }: { urgency: Urgency; detail?: string | null }) {
  const m = urgencyMeta[urgency];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-legende font-semibold ${m.className}`}>
      {m.label}
      {detail ? ` · ${detail}` : ""}
    </span>
  );
}

export function RpeChip({ rpe }: { rpe: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-legende font-semibold tabular-nums ${rpe >= 9 ? "bg-beurre text-beurre-fonce" : "bg-separateur text-texte-2"}`}>
      RPE {rpe}
    </span>
  );
}

export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-olive-pale text-[14px] font-semibold text-olive-fonce"
    >
      {initials}
    </span>
  );
}
