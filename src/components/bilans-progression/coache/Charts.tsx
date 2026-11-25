import type { ReportWeekPoint } from "@/lib/bilans-progression/types";
import { longDay, nb, shortDay } from "@/lib/bilans-progression/coache/format";

/**
 * Mini graphiques SVG faits main pour le bilan du coaché.
 * Le SVG est décoratif (aria-hidden) : chaque graphique est doublé d'un tableau masqué visuellement, lu par les lecteurs d'écran.
 */

const W = 320;

function ticks(lo: number, hi: number) {
  const pad = Math.max((hi - lo) * 0.15, hi === lo ? Math.max(1, hi * 0.05) : 0);
  return { min: lo - pad, max: hi + pad };
}

function SrTable({ caption, head, rows }: { caption: string; head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={`${a}-${i}`}>
            <th scope="row">{a}</th>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Courbe simple : un point par valeur, étiquettes de début et de fin. */
function LineChart({ points, unit, height = 120 }: { points: { key: string; label: string; v: number }[]; unit: string; height?: number }) {
  const PAD = { top: 20, bottom: 24, side: 26 };
  const { min, max } = ticks(Math.min(...points.map((p) => p.v)), Math.max(...points.map((p) => p.v)));
  const iw = W - PAD.side * 2;
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.side + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v: number) => PAD.top + ih - ((v - min) / (max - min || 1)) * ih;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
      <line x1={PAD.side} x2={W - PAD.side} y1={PAD.top + ih} y2={PAD.top + ih} className="stroke-separateur" strokeWidth={1} />
      {points.length > 1 && <path d={d} fill="none" className="stroke-olive-fonce" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={`${p.key}-${i}`}>
          <circle cx={x(i)} cy={y(p.v)} r={i === last ? 5 : 3.5} className="fill-carte stroke-olive-fonce" strokeWidth={2} />
          {(i === 0 || i === last) && (
            <text x={x(i)} y={y(p.v) - 10} textAnchor="middle" className={`text-[12px] tabular-nums ${i === last ? "fill-texte font-bold" : "fill-texte-2 font-medium"}`}>
              {`${nb(p.v)}${unit}`}
            </text>
          )}
          {(i === 0 || i === last || points.length <= 5) && (
            <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Meilleure charge par semaine (weeks.topKg). Rien si moins de deux semaines chiffrées. */
export function LiftWeeksChart({ weeks, exercise }: { weeks: ReportWeekPoint[]; exercise: string }) {
  const pts = weeks.filter((w) => w.topKg != null).map((w) => ({ key: w.weekStart, label: shortDay(w.weekStart), v: w.topKg as number }));
  if (pts.length < 2) return null;
  return (
    <figure className="m-0">
      <LineChart points={pts} unit=" kg" />
      <SrTable
        caption={`${exercise} : meilleure charge par semaine`}
        head={["Semaine", "Charge"]}
        rows={pts.map((p) => [`Semaine du ${longDay(p.key)}`, `${nb(p.v)} kg`])}
      />
      <figcaption className="mt-1 text-legende text-texte-2">{`${exercise} : meilleure charge de chaque semaine.`}</figcaption>
    </figure>
  );
}

/** Barres « fait / prévu » par semaine. */
export function RegularityChart({ weeks }: { weeks: ReportWeekPoint[] }) {
  const H = 130;
  const PAD = { top: 20, bottom: 24, side: 6 };
  const maxV = Math.max(1, ...weeks.map((w) => Math.max(w.planned, w.done)));
  const slot = (W - PAD.side * 2) / weeks.length;
  const bw = Math.min(36, slot * 0.55);
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
          return (
            <g key={`${w.weekStart}-${i}`}>
              {w.planned > 0 && <rect x={cx - bw / 2} y={base - h(w.planned)} width={bw} height={h(w.planned)} rx={6} className="fill-olive-pale" />}
              {w.done > 0 && <rect x={cx - bw / 2} y={base - h(w.done)} width={bw} height={h(w.done)} rx={6} className="fill-olive-fonce" />}
              <text x={cx} y={base - h(Math.max(w.planned, w.done)) - 6} textAnchor="middle" className="fill-texte text-[12px] font-semibold tabular-nums">
                {`${w.done}/${w.planned}`}
              </text>
              {(showDates || i === 0 || i === weeks.length - 1) && (
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-texte-2 text-[11px] tabular-nums">
                  {shortDay(w.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <SrTable
        caption="Séances faites sur séances prévues, par semaine"
        head={["Semaine", "Séances"]}
        rows={weeks.map((w) => [`Semaine du ${longDay(w.weekStart)}`, `${w.done} faite${w.done > 1 ? "s" : ""} sur ${w.planned} prévue${w.planned > 1 ? "s" : ""}`])}
      />
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-legende text-texte-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-olive-fonce" />
          Faites
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-olive-pale" />
          Prévues
        </span>
      </figcaption>
    </figure>
  );
}

/** Courbe du poids (au moins deux pesées). */
export function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return null;
  return (
    <figure className="m-0">
      <LineChart points={points.map((p) => ({ key: p.date, label: shortDay(p.date), v: p.kg }))} unit=" kg" />
      <SrTable caption="Poids sur la période" head={["Date", "Poids"]} rows={points.map((p) => [longDay(p.date), `${nb(p.kg)} kg`])} />
      <figcaption className="mt-1 text-legende text-texte-2">Tes pesées sur la période.</figcaption>
    </figure>
  );
}
