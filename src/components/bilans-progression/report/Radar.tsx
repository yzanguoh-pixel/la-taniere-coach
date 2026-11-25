import {
  PROFILE_AXIS_LABELS,
  type ProfileScore,
} from "@/lib/bilans-progression/types";
import { note } from "@/lib/bilans-progression/coache/format";
import { SrTable } from "./charts";

/**
 * Radar hexagonal « Ton profil » (SVG fait main), échelle 0 à 5 :
 * anneaux de zones (rouge doux au centre → verts de plus en plus clairs vers l'extérieur),
 * période précédente en pointillés gris, période du bilan en trait plein olive foncé.
 */

const VW = 400;
const VH = 336;
const CX = 200;
const CY = 168;
const R = 106;
const LABEL_R = R + 16;
const LINE_H = 16;

/** Zones de 1 point, du centre vers l'extérieur : tons doux accordés à l'olive. */
export const RADAR_ZONES = [
  { from: 0, to: 1, fill: "#f2d4cc", label: "À construire" },
  { from: 1, to: 2, fill: "#fde7dc", label: "En route" },
  { from: 2, to: 3, fill: "#d5dcb9", label: "Correct" },
  { from: 3, to: 4, fill: "#e3e8cf", label: "Bon" },
  { from: 4, to: 5, fill: "#f0f2e5", label: "Très bon" },
] as const;

const BEFORE_STROKE = "#5e6358"; // texte-2
const AFTER_STROKE = "#50563b"; // olive-fonce

const angle = (i: number, n: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
const pt = (i: number, n: number, r: number) =>
  [CX + r * Math.cos(angle(i, n)), CY + r * Math.sin(angle(i, n))] as const;
const poly = (n: number, r: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => pt(i, n, r(i)))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

/** Coupe un libellé en lignes d'au plus ~12 caractères (« Mobilité et gainage » → 2 lignes). */
function wrap(label: string, max = 12): string[] {
  const lines: string[] = [];
  for (const word of label.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= max)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

export function Radar({
  profile,
  beforeLabel,
  afterLabel,
}: {
  profile: ProfileScore[];
  beforeLabel: string;
  afterLabel: string;
}) {
  const n = profile.length;
  const hasBefore = profile.some((p) => p.before != null);
  const rOf = (v: number | null) => ((v ?? 0) / 5) * R;

  return (
    <div className="@container w-full">
      <figure className="m-0 flex flex-col items-center gap-4 @xl:flex-row @xl:items-center @xl:gap-6">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="block h-auto w-full max-w-[440px] @xl:flex-1"
          aria-hidden="true"
          focusable="false"
        >
          {/* Zones, de l'extérieur vers l'intérieur */}
          {[...RADAR_ZONES].reverse().map((z) => (
            <polygon
              key={z.to}
              points={poly(n, () => (z.to / 5) * R)}
              fill={z.fill}
              stroke="#ffffff"
              strokeWidth={1.25}
            />
          ))}
          {/* Rayons */}
          {profile.map((p, i) => {
            const [x, y] = pt(i, n, R);
            return (
              <line
                key={p.axis}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="#ffffff"
                strokeWidth={1.25}
              />
            );
          })}
          {/* Graduations 0 à 5, le long du rayon du haut */}
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <text
              key={k}
              x={CX + 5}
              y={CY - (k / 5) * R + (k === 0 ? 12 : 4)}
              className="fill-texte-2 text-[11px] tabular-nums"
            >
              {k}
            </text>
          ))}

          {/* Avant : pointillés gris foncé */}
          {hasBefore && (
            <g>
              <polygon
                points={poly(n, (i) => rOf(profile[i].before))}
                fill="none"
                stroke={BEFORE_STROKE}
                strokeWidth={1.75}
                strokeDasharray="5 4"
                strokeLinejoin="round"
              />
              {profile.map((p, i) => {
                if (p.before == null) return null;
                const [x, y] = pt(i, n, rOf(p.before));
                return (
                  <circle
                    key={p.axis}
                    cx={x}
                    cy={y}
                    r={2.5}
                    fill={BEFORE_STROKE}
                  />
                );
              })}
            </g>
          )}

          {/* Aujourd'hui : trait plein olive foncé, points */}
          <polygon
            points={poly(n, (i) => rOf(profile[i].after))}
            fill={AFTER_STROKE}
            fillOpacity={0.14}
            stroke={AFTER_STROKE}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {profile.map((p, i) => {
            const [x, y] = pt(i, n, rOf(p.after));
            return (
              <circle
                key={p.axis}
                cx={x}
                cy={y}
                r={p.after == null ? 3 : 4.5}
                fill={p.after == null ? "#ffffff" : AFTER_STROKE}
                stroke={AFTER_STROKE}
                strokeWidth={p.after == null ? 1.5 : 0}
              />
            );
          })}

          {/* Libellés des axes + note actuelle */}
          {profile.map((p, i) => {
            const [lx, ly] = pt(i, n, LABEL_R);
            const cos = Math.cos(angle(i, n));
            const sin = Math.sin(angle(i, n));
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const lines = wrap(PROFILE_AXIS_LABELS[p.axis]);
            const value =
              p.after == null ? "pas de données" : `${note(p.after)} / 5`;
            const total = lines.length + 1;
            // Haut : bloc posé au-dessus du point ; bas : bloc sous le point ; côtés : centré.
            const firstY =
              sin < -0.5
                ? ly - (total - 1) * LINE_H - 2
                : sin > 0.5
                  ? ly + LINE_H - 2
                  : ly - ((total - 1) * LINE_H) / 2 + 4;
            return (
              <text
                key={p.axis}
                x={lx}
                y={firstY}
                textAnchor={anchor}
                className="fill-texte text-[14px] font-semibold"
              >
                {lines.map((l, k) => (
                  <tspan key={k} x={lx} dy={k === 0 ? 0 : LINE_H}>
                    {l}
                  </tspan>
                ))}
                <tspan
                  x={lx}
                  dy={LINE_H}
                  className={
                    p.after == null
                      ? "fill-texte-2 text-[12px] font-normal italic"
                      : "fill-olive-fonce text-[13px] font-bold tabular-nums"
                  }
                >
                  {value}
                </tspan>
              </text>
            );
          })}
        </svg>

        <figcaption className="flex w-full flex-col gap-3 text-legende text-texte-2 @xl:w-44 @xl:shrink-0">
          <span className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-2 text-texte">
              <svg
                width="28"
                height="10"
                aria-hidden="true"
                focusable="false"
                className="shrink-0"
              >
                <line
                  x1="1"
                  y1="5"
                  x2="27"
                  y2="5"
                  stroke={AFTER_STROKE}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="5" r="3.5" fill={AFTER_STROKE} />
              </svg>
              {afterLabel}
            </span>
            {hasBefore && (
              <span className="inline-flex items-center gap-2 text-texte">
                <svg
                  width="28"
                  height="10"
                  aria-hidden="true"
                  focusable="false"
                  className="shrink-0"
                >
                  <line
                    x1="1"
                    y1="5"
                    x2="27"
                    y2="5"
                    stroke={BEFORE_STROKE}
                    strokeWidth="1.75"
                    strokeDasharray="5 4"
                  />
                </svg>
                {beforeLabel}
              </span>
            )}
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 @xl:flex-col">
            {[...RADAR_ZONES].reverse().map((z) => (
              <span key={z.to} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-[3px] border border-bordure"
                  style={{ background: z.fill }}
                />
                <span className="tabular-nums">{`${z.from}–${z.to} · ${z.label}`}</span>
              </span>
            ))}
          </span>
        </figcaption>

        <SrTable
          caption="Ton profil, notes sur 5"
          head={["Axe", beforeLabel, afterLabel]}
          rows={profile.map((p) => [
            PROFILE_AXIS_LABELS[p.axis],
            p.before == null ? "pas de données" : note(p.before),
            p.after == null ? "pas de données" : note(p.after),
          ])}
        />
      </figure>
    </div>
  );
}
