import { fmt } from "@/lib/nutrition/coache/format";

/**
 * Anneau des calories (SVG fait main) : l'arc olive foncé montre ce qui est consommé,
 * le centre affiche ce qui reste face à l'objectif du type de jour.
 */
export function CalorieRing({ consumed, goal, size = 188 }: { consumed: number; goal: number | null; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = goal ? Math.min(1, consumed / goal) : 0;
  const over = goal != null && consumed > goal;
  const remaining = goal != null ? Math.round(goal - consumed) : null;
  const label =
    goal == null
      ? `${fmt(consumed)} kcal notées, pas d’objectif défini`
      : over
        ? `${fmt(consumed)} kcal sur ${fmt(goal)} : objectif dépassé de ${fmt(-remaining!)} kcal`
        : `${fmt(consumed)} kcal sur ${fmt(goal)} : il reste ${fmt(remaining!)} kcal`;

  return (
    <div role="img" aria-label={label} className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-olive-pale)" strokeWidth={stroke} />
        {ratio > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "var(--color-peche-fonce)" : "var(--color-olive-fonce)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * ratio} ${c}`}
            className="transition-[stroke-dasharray] duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {remaining != null ? (
          <>
            <span className={`text-[34px] font-bold leading-none tabular-nums ${over ? "text-peche-fonce" : "text-texte"}`}>{fmt(Math.abs(remaining))}</span>
            <span className="mt-1 text-[13px] font-medium text-texte-2">{over ? "kcal en trop" : "kcal restantes"}</span>
          </>
        ) : (
          <>
            <span className="text-[34px] font-bold leading-none tabular-nums">{fmt(consumed)}</span>
            <span className="mt-1 text-[13px] font-medium text-texte-2">kcal notées</span>
          </>
        )}
      </div>
    </div>
  );
}
