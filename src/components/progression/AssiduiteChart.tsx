import { longDate, shortDate, type WeekAttendance } from "@/lib/progression/compute";

/** Barres d'assiduité : séances faites sur séances prévues, par semaine (SVG fait main). */

const W = 340;
const H = 150;
const PAD = { top: 22, bottom: 26, side: 6 };

export function AssiduiteChart({ weeks }: { weeks: WeekAttendance[] }) {
  const maxPlanned = Math.max(1, ...weeks.map((w) => w.planned));
  const slot = (W - PAD.side * 2) / weeks.length;
  const bw = Math.min(34, slot * 0.55);
  const ih = H - PAD.top - PAD.bottom;
  const h = (n: number) => (n / maxPlanned) * ih;
  const base = PAD.top + ih;

  const desc = weeks
    .map((w) => `semaine du ${longDate(w.week)}${w.current ? " (en cours)" : ""} : ${w.done} faite${w.done > 1 ? "s" : ""} sur ${w.planned} prévue${w.planned > 1 ? "s" : ""}`)
    .join(" ; ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby="assiduite-titre assiduite-desc">
      <title id="assiduite-titre">Séances faites sur séances prévues, par semaine</title>
      <desc id="assiduite-desc">{desc}.</desc>
      <line x1={PAD.side} x2={W - PAD.side} y1={base} y2={base} className="stroke-bordure" strokeWidth={1} />
      {weeks.map((w, i) => {
        const cx = PAD.side + slot * i + slot / 2;
        return (
          <g key={w.week}>
            {w.planned > 0 && <rect x={cx - bw / 2} y={base - h(w.planned)} width={bw} height={h(w.planned)} rx={7} className="fill-olive-pale" />}
            {w.done > 0 && <rect x={cx - bw / 2} y={base - h(w.done)} width={bw} height={h(w.done)} rx={7} className="fill-olive-fonce" />}
            <text x={cx} y={base - h(Math.max(w.planned, 0)) - 7} textAnchor="middle" className="fill-texte text-[12px] font-semibold tabular-nums">
              {w.planned ? `${w.done}/${w.planned}` : "–"}
            </text>
            <text x={cx} y={H - 8} textAnchor="middle" className={`text-[11px] tabular-nums ${w.current ? "fill-texte font-semibold" : "fill-texte-2"}`}>
              {w.current ? "Cette sem." : shortDate(w.week)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
