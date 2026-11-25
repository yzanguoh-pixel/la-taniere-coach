import { fmt, type Macros } from "@/lib/nutrition/coache/format";

const ROWS = [
  { key: "protein", label: "Protéines" },
  { key: "carbs", label: "Glucides" },
  { key: "fat", label: "Lipides" },
] as const;

/** Macros du jour face aux objectifs : une barre par macro, en grammes. */
export function MacroBars({ total, goal }: { total: Macros; goal: Macros | null }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {ROWS.map(({ key, label }) => {
        const value = total[key];
        const target = goal?.[key] ?? null;
        const pct = target ? Math.round((value / target) * 100) : null;
        const over = pct != null && pct > 100;
        return (
          <li key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="text-[15px] tabular-nums text-texte-2">
                <span className="font-semibold text-texte">{fmt(value)}</span>
                {target != null ? ` / ${fmt(target)} g` : " g"}
              </span>
            </div>
            {target != null && (
              <span
                role="progressbar"
                aria-label={`${label} : ${fmt(value)} g sur ${fmt(target)} g`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, pct ?? 0)}
                className="block h-2 overflow-hidden rounded-full bg-olive-pale"
              >
                <span className={`block h-full rounded-full ${over ? "bg-peche-fonce" : "bg-olive-fonce"}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
