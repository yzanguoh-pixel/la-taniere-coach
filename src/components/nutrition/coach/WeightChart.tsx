import type { WeightPoint } from "@/lib/nutrition/coach/queries";

const W = 700;
const H = 200;
const PAD_X = 36;
const PAD_TOP = 28;
const PAD_BOTTOM = 30;

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtShort = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const sourceLabel = (s: string) => (s === "withings" ? "Withings" : s === "manuel" ? "saisie manuelle" : s);

/** Courbe des pesées (Withings ou saisies) : SVG fait main, points étiquetés au début et à la fin. */
export function WeightChart({ points }: { points: WeightPoint[] }) {
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last.kg - first.kg;
  const lo = Math.min(...points.map((p) => p.kg)) - 0.5;
  const hi = Math.max(...points.map((p) => p.kg)) + 0.5;
  const t0 = Date.parse(first.date);
  const span = Math.max(1, Date.parse(last.date) - t0);
  const x = (iso: string) => (points.length === 1 ? W / 2 : PAD_X + ((W - 2 * PAD_X) * (Date.parse(iso) - t0)) / span);
  const y = (kg: number) => PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * (1 - (kg - lo) / (hi - lo));
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const sources = Array.from(new Set(points.map((p) => sourceLabel(p.source))));

  return (
    <figure className="flex flex-col gap-2">
      <p className="text-[15px] tabular-nums text-texte-2">
        <strong className="text-[22px] font-semibold text-texte">{fmt(last.kg)} kg</strong> le {fmtShort(last.date)}
        {points.length > 1 && (
          <>
            {" · "}
            {diff === 0 ? "stable" : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))} kg`} depuis le {fmtShort(first.date)}
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="weight-chart-title">
        <title id="weight-chart-title">{`Pesées : ${points.map((p) => `${fmtShort(p.date)} ${fmt(p.kg)} kg`).join(", ")}`}</title>
        {[lo + 0.5, hi - 0.5].map((v, i) => (
          <line key={i} x1={PAD_X} x2={W - PAD_X} y1={y(v)} y2={y(v)} stroke="var(--color-separateur)" strokeWidth={1.5} />
        ))}
        <path d={path} fill="none" stroke="var(--color-olive-fonce)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          const edge = i === 0 || i === points.length - 1;
          return (
            <g key={p.date + i}>
              <circle cx={x(p.date)} cy={y(p.kg)} r={edge ? 6 : 4} fill="var(--color-carte)" stroke="var(--color-olive-fonce)" strokeWidth={3} />
              {edge && (
                <>
                  <text x={x(p.date)} y={y(p.kg) - 12} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--color-texte)" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(p.kg)}
                  </text>
                  <text x={x(p.date)} y={H - 8} textAnchor="middle" fontSize={13} fill="var(--color-texte-2)">
                    {fmtShort(p.date)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-legende text-texte-2">
        {points.length} pesée{points.length > 1 ? "s" : ""} · source : {sources.join(", ")}
      </figcaption>
    </figure>
  );
}
