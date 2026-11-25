import { kgLabel, kgNumber, longDate, shortDate, type WeekPoint } from "@/lib/progression/compute";

/** Courbe de la charge par semaine, en SVG fait main (pas de librairie), avec la ligne d'objectif. */

const W = 340;
const H = 210;
const PAD = { top: 22, right: 14, bottom: 28, left: 36 };
const STEPS = [2.5, 5, 10, 20, 25, 50, 100];

function scale(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = STEPS.find((s) => (Math.ceil(hi / s) - Math.floor(lo / s) + 1) <= 5) ?? 100;
  let min = Math.max(0, Math.floor(lo / step) * step - (lo % step === 0 ? step : 0));
  let max = Math.ceil(hi / step) * step;
  if (max - hi < step / 3) max += step; // place pour l'étiquette d'objectif
  if (min === max) min = Math.max(0, max - step);
  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
}

export function ChargeChart({ points, targetKg, exerciseName }: { points: WeekPoint[]; targetKg: number | null; exerciseName: string }) {
  const { min, max, ticks } = scale([...points.map((p) => p.kg), ...(targetKg != null ? [targetKg] : [])]);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const inset = 24; // marge pour que les dates des extrémités restent lisibles
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : inset + (i * (iw - inset * 2)) / (points.length - 1));
  const y = (kg: number) => PAD.top + ih - ((kg - min) / (max - min)) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(points.length - 1).toFixed(1)} ${PAD.top + ih} L${x(0).toFixed(1)} ${PAD.top + ih} Z` : "";
  const labelEvery = points.length <= 6 ? 1 : Math.ceil(points.length / 6);
  const showValues = points.length <= 6;

  const first = points[0];
  const last = points[points.length - 1];
  const desc =
    `${points.length} semaine${points.length > 1 ? "s" : ""} : ` +
    points.map((p) => `semaine du ${longDate(p.week)}, ${kgLabel(p.kg)}`).join(" ; ") +
    `. ${points.length > 1 ? `De ${kgLabel(first.kg)} à ${kgLabel(last.kg)}.` : ""}` +
    (targetKg != null ? ` Objectif : ${kgLabel(targetKg)}.` : "");

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby="charge-titre charge-desc">
        <title id="charge-titre">{`Charge au ${exerciseName.toLowerCase()} par semaine`}</title>
        <desc id="charge-desc">{desc}</desc>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-separateur" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className="fill-texte-2 text-[11px] tabular-nums">
              {kgNumber(t)}
            </text>
          </g>
        ))}

        {targetKg != null && (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(targetKg)} y2={y(targetKg)} className="stroke-olive" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={W - PAD.right} y={y(targetKg) - 6} textAnchor="end" className="fill-olive-fonce text-[11px] font-semibold tabular-nums">
              {`Objectif ${kgLabel(targetKg)}`}
            </text>
          </g>
        )}

        {area && <path d={area} className="fill-olive-pale" opacity={0.7} />}
        {points.length > 1 && <path d={line} fill="none" className="stroke-olive-fonce" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

        {points.map((p, i) => (
          <g key={p.week}>
            <circle cx={x(i)} cy={y(p.kg)} r={i === points.length - 1 ? 5 : 3.5} className="fill-carte stroke-olive-fonce" strokeWidth={2} />
            {(showValues || i === points.length - 1) && (
              <text x={x(i)} y={y(p.kg) - 10} textAnchor="middle" className={`text-[11px] tabular-nums ${i === points.length - 1 ? "fill-texte font-bold" : "fill-texte-2 font-medium"}`}>
                {kgNumber(p.kg)}
              </text>
            )}
            {i % labelEvery === 0 || i === points.length - 1 ? (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
                {shortDate(p.week)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-legende text-texte-2">Charge maximale réalisée chaque semaine, en kg (semaines commençant le lundi).</figcaption>
    </figure>
  );
}
