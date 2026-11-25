import type { ReportWeekPoint } from "@/lib/bilans-progression/types";
import { longDay, nb, shortDay } from "@/lib/bilans-progression/coache/format";

/**
 * Graphiques SVG faits main du bilan de progression (composants purs, rendus côté serveur).
 * Chaque SVG est décoratif (aria-hidden) et doublé d'un tableau masqué visuellement, lu par les lecteurs d'écran.
 */

const W = 340;

/** Tableau masqué visuellement, équivalent textuel d'un graphique. */
export function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    // Le tableau est enveloppé : un <table> ignore width: 1px et déborderait de la page.
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([first, ...rest], i) => (
          <tr key={`${first}-${i}`}>
            <th scope="row">{first}</th>
            {rest.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

function scale(values: number[], zeroBased: boolean) {
  const lo = zeroBased ? 0 : Math.min(...values);
  const hi = Math.max(...values);
  const pad = hi === lo ? Math.max(1, Math.abs(hi) * 0.08) : (hi - lo) * 0.18;
  return { min: zeroBased ? 0 : lo - pad, max: hi + pad };
}

export type ChartPoint = { key: string; label: string; v: number | null };

/**
 * Courbe par semaine (ou par date). Les valeurs nulles laissent un trou sans casser l'espacement.
 * `target` trace une ligne d'objectif en pointillés.
 */
export function LineChart({
  points,
  unit,
  target,
  format = (v: number) => nb(v),
  height = 160,
}: {
  points: ChartPoint[];
  unit: string;
  target?: { v: number; label: string } | null;
  format?: (v: number) => string;
  height?: number;
}) {
  const known = points.filter((p): p is ChartPoint & { v: number } => p.v != null);
  if (known.length === 0) return null;
  const PAD = { top: 24, bottom: 26, left: 28, right: target ? 30 : 28 };
  const { min, max } = scale(known.map((p) => p.v).concat(target ? [target.v] : []), false);
  const iw = W - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v: number) => PAD.top + ih - ((v - min) / (max - min || 1)) * ih;
  const idx = points.map((p, i) => ({ ...p, i })).filter((p): p is ChartPoint & { v: number; i: number } => p.v != null);
  const d = idx.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const showAll = idx.length <= 6;
  const lastI = idx[idx.length - 1].i;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
      <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ih} y2={PAD.top + ih} className="stroke-bordure" strokeWidth={1} />
      {target && (
        <g>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(target.v)} y2={y(target.v)} className="stroke-peche-fonce" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={W - PAD.right} y={y(target.v) - 6} textAnchor="end" className="fill-peche-fonce text-[11px] font-semibold">
            {target.label}
          </text>
        </g>
      )}
      {idx.length > 1 && <path d={d} fill="none" className="stroke-olive-fonce" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      {idx.map((p) => (
        <g key={`${p.key}-${p.i}`}>
          <circle cx={x(p.i)} cy={y(p.v)} r={p.i === lastI ? 5 : 3.5} className="fill-carte stroke-olive-fonce" strokeWidth={2} />
          {(showAll || p.i === idx[0].i || p.i === lastI) && (
            <text x={x(p.i)} y={y(p.v) - 10} textAnchor="middle" className={`text-[12px] tabular-nums ${p.i === lastI ? "fill-texte font-bold" : "fill-texte-2 font-medium"}`}>
              {`${format(p.v)}${unit}`}
            </text>
          )}
        </g>
      ))}
      {points.map((p, i) =>
        points.length <= 6 || i === 0 || i === points.length - 1 ? (
          <text key={`l-${p.key}-${i}`} x={x(i)} y={height - 7} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Barres simples (volume par semaine). */
export function BarChart({ points, unit, format = (v: number) => nb(v, 0), height = 150 }: { points: ChartPoint[]; unit: string; format?: (v: number) => string; height?: number }) {
  if (!points.some((p) => (p.v ?? 0) > 0)) return null;
  const PAD = { top: 22, bottom: 26, side: 8 };
  const maxV = Math.max(...points.map((p) => p.v ?? 0));
  const slot = (W - PAD.side * 2) / points.length;
  const bw = Math.min(38, slot * 0.55);
  const ih = height - PAD.top - PAD.bottom;
  const base = PAD.top + ih;
  const h = (v: number) => (v / maxV) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
      <line x1={PAD.side} x2={W - PAD.side} y1={base} y2={base} className="stroke-bordure" strokeWidth={1} />
      {points.map((p, i) => {
        const cx = PAD.side + slot * i + slot / 2;
        const v = p.v ?? 0;
        return (
          <g key={`${p.key}-${i}`}>
            {v > 0 && <rect x={cx - bw / 2} y={base - h(v)} width={bw} height={h(v)} rx={5} className="fill-olive-fonce" />}
            {(points.length <= 6 || v === maxV) && (
              <text x={cx} y={base - h(v) - 6} textAnchor="middle" className="fill-texte text-[11px] font-semibold tabular-nums">
                {v > 0 ? `${format(v)}${unit}` : "—"}
              </text>
            )}
            {(points.length <= 6 || i === 0 || i === points.length - 1) && (
              <text x={cx} y={height - 7} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Régularité : séances prévues (contour), faites en présentiel (olive foncé) et en solo (olive), par semaine. */
export function RegularityChart({ weeks }: { weeks: ReportWeekPoint[] }) {
  const H = 150;
  const PAD = { top: 22, bottom: 26, side: 8 };
  const maxV = Math.max(1, ...weeks.map((w) => Math.max(w.planned, w.done)));
  const slot = (W - PAD.side * 2) / weeks.length;
  const bw = Math.min(38, slot * 0.55);
  const ih = H - PAD.top - PAD.bottom;
  const h = (n: number) => (n / maxV) * ih;
  const base = PAD.top + ih;
  const showDates = weeks.length <= 6;
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
        <line x1={PAD.side} x2={W - PAD.side} y1={base} y2={base} className="stroke-bordure" strokeWidth={1} />
        {weeks.map((w, i) => {
          const cx = PAD.side + slot * i + slot / 2;
          const solo = Math.max(0, w.done - w.presentiel);
          return (
            <g key={`${w.weekStart}-${i}`}>
              {w.planned > 0 && (
                <rect x={cx - bw / 2 + 0.75} y={base - h(w.planned) + 0.75} width={bw - 1.5} height={h(w.planned) - 0.75} rx={5} className="fill-carte stroke-olive" strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              {w.presentiel > 0 && <rect x={cx - bw / 2} y={base - h(w.presentiel)} width={bw} height={h(w.presentiel)} rx={5} className="fill-olive-fonce" />}
              {solo > 0 && <rect x={cx - bw / 2} y={base - h(w.presentiel + solo)} width={bw} height={h(solo) - (w.presentiel > 0 ? 2 : 0)} rx={5} className="fill-olive" />}
              <text x={cx} y={base - h(Math.max(w.planned, w.done)) - 6} textAnchor="middle" className="fill-texte text-[12px] font-semibold tabular-nums">
                {w.planned > 0 ? `${w.done}/${w.planned}` : `${w.done}`}
              </text>
              {(showDates || i === 0 || i === weeks.length - 1) && (
                <text x={cx} y={H - 7} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
                  {shortDay(w.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <SrTable
        caption="Séances par semaine"
        head={["Semaine", "Prévues", "Faites", "Dont en présentiel"]}
        rows={weeks.map((w) => [`Semaine du ${longDay(w.weekStart)}`, `${w.planned}`, `${w.done}`, `${w.presentiel}`])}
      />
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-legende text-texte-2">
        <LegendSwatch className="bg-olive-fonce">En présentiel</LegendSwatch>
        <LegendSwatch className="bg-olive">En solo</LegendSwatch>
        <LegendSwatch className="border-[1.5px] border-dashed border-olive bg-carte">Prévues</LegendSwatch>
      </figcaption>
    </figure>
  );
}

export function LegendSwatch({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-3 shrink-0 rounded-[3px] ${className}`} />
      {children}
    </span>
  );
}

/** Courbe du poids (au moins deux pesées). */
export function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return null;
  return (
    <figure className="m-0">
      <LineChart points={points.map((p) => ({ key: p.date, label: shortDay(p.date), v: p.kg }))} unit=" kg" height={140} />
      <SrTable caption="Pesées sur la période" head={["Date", "Poids"]} rows={points.map((p) => [longDay(p.date), `${nb(p.kg)} kg`])} />
      <figcaption className="mt-1 text-legende text-texte-2">Tes pesées sur la période.</figcaption>
    </figure>
  );
}

/** Jauge horizontale « valeur / objectif » (décorative : la valeur est écrite à côté). */
export function Gauge({ value, target }: { value: number; target: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  return (
    <span aria-hidden="true" className="relative mt-2 block h-2.5 overflow-hidden rounded-full bg-separateur">
      <span className="absolute inset-y-0 left-0 rounded-full bg-olive-fonce" style={{ width: `${pct}%` }} />
    </span>
  );
}
