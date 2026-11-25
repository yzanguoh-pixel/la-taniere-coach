import Link from "next/link";
import type { WeekDay } from "@/lib/nutrition/coach/queries";
import { fmtKcal } from "@/lib/nutrition/coach/rules";

const W = 700;
const H = 220;
const TOP = 26;
const BOTTOM = 8;
const COL = W / 7;
const BAR = 44;

const dayShort = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
const dayNum = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDate();
const dayLong = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** US26 — Semaine du coaché : kcal par jour (barres) face à l'objectif du type de jour (trait pointillé). SVG fait main. */
export function WeekChart({ week, selected, basePath }: { week: WeekDay[]; selected: string; basePath: string }) {
  const max = Math.max(1, ...week.map((d) => Math.max(d.kcal, d.target ?? 0))) * 1.12;
  const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / max);
  const filled = week.filter((d) => d.entries > 0);
  const onTarget = filled.filter((d) => d.target && Math.abs(d.kcal - d.target) / d.target <= 0.1).length;

  return (
    <figure className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="week-chart-title">
        <title id="week-chart-title">
          {`Calories des 7 derniers jours face à l’objectif : ${week
            .map((d) => `${dayLong(d.date)} ${d.entries ? fmtKcal(d.kcal) + " kcal" : "rien noté"}${d.target ? " sur " + fmtKcal(d.target) : ""}`)
            .join(" ; ")}`}
        </title>
        <line x1={0} x2={W} y1={H - BOTTOM} y2={H - BOTTOM} stroke="var(--color-separateur)" strokeWidth={2} />
        {week.map((d, i) => {
          const cx = COL * i + COL / 2;
          const isSel = d.date === selected;
          const over = d.target != null && d.kcal > d.target * 1.1;
          const fill = d.entries === 0 ? "var(--color-separateur)" : over ? "var(--color-beurre-fonce)" : isSel ? "var(--color-olive-fonce)" : "var(--color-olive)";
          const top = d.entries ? y(d.kcal) : H - BOTTOM - 4;
          return (
            <g key={d.date}>
              {isSel && <rect x={cx - COL / 2 + 4} y={4} width={COL - 8} height={H - 8} rx={14} fill="var(--color-olive-pale)" />}
              <rect x={cx - BAR / 2} y={top} width={BAR} height={Math.max(4, H - BOTTOM - top)} rx={8} fill={fill} />
              {d.target != null && (
                <line x1={cx - BAR / 2 - 8} x2={cx + BAR / 2 + 8} y1={y(d.target)} y2={y(d.target)} stroke="var(--color-texte)" strokeWidth={2} strokeDasharray="5 4" />
              )}
              {d.entries > 0 && (
                <text x={cx} y={Math.max(16, top - 8)} textAnchor="middle" fontSize={15} fontWeight={600} fill="var(--color-texte)" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmtKcal(d.kcal)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <nav aria-label="Choisir le jour du journal" className="grid grid-cols-7 gap-1">
        {week.map((d) => {
          const isSel = d.date === selected;
          return (
            <Link
              key={d.date}
              href={`${basePath}?jour=${d.date}`}
              scroll={false}
              aria-current={isSel ? "date" : undefined}
              aria-label={`${dayLong(d.date)}, ${d.dayType === "training" ? "entraînement" : "repos"}, ${d.entries ? fmtKcal(d.kcal) + " kcal" : "rien noté"}`}
              className={`flex min-h-11 flex-col items-center justify-center rounded-[12px] py-1 text-center tabular-nums ${isSel ? "bg-olive-fonce text-white" : "text-texte-2 hover:bg-separateur"}`}
            >
              <span className="text-legende capitalize">{dayShort(d.date)}</span>
              <span className="text-[15px] font-semibold">{dayNum(d.date)}</span>
              <span className={`text-[11px] ${isSel ? "text-white" : "text-texte-2"}`}>{d.dayType === "training" ? "Séance" : "Repos"}</span>
            </Link>
          );
        })}
      </nav>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-legende text-texte-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] bg-olive" /> Calories notées
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" width="18" height="4">
            <line x1="0" x2="18" y1="2" y2="2" stroke="var(--color-texte)" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          Objectif du jour (entraînement ou repos)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] bg-beurre-fonce" /> Au-delà de 110 %
        </span>
        <span className="tabular-nums">
          {filled.length ? `${onTarget} jour${onTarget > 1 ? "s" : ""} sur ${filled.length} renseigné${filled.length > 1 ? "s" : ""} à ±10 % de l’objectif` : "Aucun repas noté cette semaine"}
        </span>
      </figcaption>
    </figure>
  );
}
