import { kgNumber, shortDate } from "@/lib/progression/compute";

/**
 * Mini graphique SVG fait main : charge de travail de l'exercice de référence, semaine par semaine.
 * Point de départ (charge au début de la période), puis meilleure charge de chaque semaine ; ligne de l'objectif si connue.
 */
export function LoadChart({
  exercise,
  startKg,
  weeks,
  targetKg,
}: {
  exercise: string;
  startKg: number | null;
  weeks: { weekStart: string; topKg: number | null }[];
  targetKg: number | null;
}) {
  const pts: { label: string; kg: number }[] = [];
  if (startKg != null) pts.push({ label: "Début", kg: startKg });
  for (const w of weeks) if (w.topKg != null) pts.push({ label: shortDate(w.weekStart), kg: w.topKg });
  if (pts.length < 2) return null;

  const W = 320;
  const H = 140;
  const padX = 24;
  const padTop = 22;
  const padBottom = 26;
  const values = pts.map((p) => p.kg).concat(targetKg != null ? [targetKg] : []);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 5) {
    min -= 2.5;
    max += 2.5;
  }
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (pts.length - 1);
  const y = (kg: number) => padTop + ((max - kg) * (H - padTop - padBottom)) / (max - min);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const summary = `${exercise} : ${pts.map((p) => `${p.label} ${kgNumber(p.kg)} kg`).join(", ")}${targetKg != null ? `. Objectif ${kgNumber(targetKg)} kg` : ""}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block h-auto w-full">
        {targetKg != null && (
          <g>
            <line x1={padX} x2={W - padX} y1={y(targetKg)} y2={y(targetKg)} className="stroke-olive" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={W - padX} y={y(targetKg) - 6} textAnchor="end" className="fill-texte-2 text-[11px]">
              Objectif {kgNumber(targetKg)} kg
            </text>
          </g>
        )}
        <path d={path} fill="none" className="stroke-olive-fonce" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={x(i)} cy={y(p.kg)} r={4} className="fill-carte stroke-olive-fonce" strokeWidth={2} />
            <text x={x(i)} y={y(p.kg) - 9} textAnchor="middle" className="fill-texte text-[11px] font-semibold tabular-nums">
              {kgNumber(p.kg)}
            </text>
            <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-texte-2 text-[10px]">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
