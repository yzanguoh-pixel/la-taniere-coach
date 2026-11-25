import { kgNumber, shortDate } from "@/lib/progression/compute";
import type { ProgressReportData } from "@/lib/bilans-progression/types";
import { LoadChart } from "./LoadChart";

/** Aperçu d'un bilan de progression, avec les mêmes blocs que ceux présentés au coaché. */
export function ReportPreview({ data, title, coachNote, targetKg }: { data: ProgressReportData; title: string; coachNote?: string | null; targetKg?: number | null }) {
  const s = data.sessions;
  const ref = data.lifts[0] ?? null;
  const bodyKg = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sous-titre">{title}</h3>
        {data.goal.label && <p className="mt-1 text-[15px] text-texte-2">Objectif : {data.goal.label}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KeyFigure label="Séances faites" value={s.planned ? `${s.done} / ${s.planned}` : `${s.done}`} />
        <KeyFigure label="Assiduité" value={s.planned ? `${s.adherencePct} %` : "—"} />
        <KeyFigure label="Encadrées · autonomie" value={`${s.presentiel} · ${s.solo}`} />
        <KeyFigure label="Effort moyen (RPE)" value={data.rpeAvg != null ? kgNumber(data.rpeAvg) : "—"} />
      </dl>

      {data.highlights.length > 0 && (
        <section aria-label="Points forts" className="rounded-[16px] bg-olive-pale px-4 py-3">
          <h4 className="text-[15px] font-semibold text-olive-fonce">Points forts</h4>
          <ul className="mt-1.5 flex flex-col gap-1 text-[16px]">
            {data.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-olive-fonce" />
                <span className="min-w-0 break-words">{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.lifts.length > 0 && (
        <section aria-label="Progression des charges" className="flex flex-col gap-3">
          <h4 className="text-[17px] font-semibold">Progression des charges</h4>
          {ref && <LoadChart exercise={ref.exercise} startKg={ref.startKg} weeks={data.weeks} targetKg={targetKg ?? null} />}
          {data.goal.progressText && <p className="text-[15px] text-texte-2">{data.goal.progressText}</p>}
          <ul className="liste-groupee">
            {data.lifts.map((l) => (
              <li key={l.exercise} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{l.exercise}</p>
                  {l.bestSet && <p className="text-legende tabular-nums text-texte-2">Meilleure série : {l.bestSet}</p>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-[15px]">
                    {l.startKg != null && l.endKg != null && l.startKg !== l.endKg ? `${kgNumber(l.startKg)} → ${kgNumber(l.endKg)} kg` : l.endKg != null ? `${kgNumber(l.endKg)} kg` : "—"}
                  </p>
                  {l.deltaKg != null && l.deltaKg !== 0 && (
                    <p className={`text-legende font-semibold ${l.deltaKg > 0 ? "text-olive-fonce" : "text-peche-fonce"}`}>
                      {l.deltaKg > 0 ? "+" : "−"}
                      {kgNumber(Math.abs(l.deltaKg))} kg
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.weeks.length > 0 && (
        <section aria-label="Assiduité par semaine" className="flex flex-col gap-3">
          <h4 className="text-[17px] font-semibold">Assiduité par semaine</h4>
          <ul className="liste-groupee">
            {data.weeks.map((w) => {
              const pct = w.planned ? Math.round((w.done / w.planned) * 100) : 0;
              return (
                <li key={w.weekStart} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 text-[15px] text-texte-2">Sem. du {shortDate(w.weekStart)}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-separateur" aria-hidden>
                    <span className="block h-full rounded-full bg-olive-fonce" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-12 shrink-0 text-right text-[15px] tabular-nums">{w.planned ? `${w.done}/${w.planned}` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <section aria-label="Poids" className="liste-groupee px-4 py-3">
          <h4 className="text-[15px] font-semibold">Poids</h4>
          {data.weight.points.length ? (
            <p className="mt-1 tabular-nums">
              {data.weight.startKg != null && data.weight.endKg != null && data.weight.points.length > 1
                ? `${bodyKg(data.weight.startKg)} → ${bodyKg(data.weight.endKg)} kg`
                : `${bodyKg(data.weight.endKg ?? 0)} kg`}
              <span className="text-texte-2">
                {" "}
                · {data.weight.points.length} pesée{data.weight.points.length > 1 ? "s" : ""}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-texte-2">Aucune pesée sur la période.</p>
          )}
        </section>
        <section aria-label="Nutrition" className="liste-groupee px-4 py-3">
          <h4 className="text-[15px] font-semibold">Nutrition</h4>
          {data.nutrition && data.nutrition.daysLogged > 0 ? (
            <p className="mt-1 tabular-nums">
              {data.nutrition.daysLogged} jour{data.nutrition.daysLogged > 1 ? "s" : ""} saisi{data.nutrition.daysLogged > 1 ? "s" : ""}
              {data.nutrition.avgKcal != null && <span className="text-texte-2"> · {data.nutrition.avgKcal.toLocaleString("fr-FR")} kcal en moyenne</span>}
              {data.nutrition.targetKcal != null && <span className="text-texte-2"> (repère {data.nutrition.targetKcal.toLocaleString("fr-FR")})</span>}
            </p>
          ) : (
            <p className="mt-1 text-texte-2">Journal alimentaire non rempli.</p>
          )}
        </section>
      </div>

      {data.nextFocus && (
        <section aria-label="Prochain objectif" className="liste-groupee px-4 py-3">
          <h4 className="text-[15px] font-semibold">Prochain objectif</h4>
          <p className="mt-1 break-words">{data.nextFocus}</p>
        </section>
      )}

      {coachNote && (
        <section aria-label="Mot du coach" className="liste-groupee px-4 py-3">
          <h4 className="text-[15px] font-semibold">Mot du coach</h4>
          <p className="mt-1 whitespace-pre-line break-words">{coachNote}</p>
        </section>
      )}
    </div>
  );
}

function KeyFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-carte px-3 py-3 shadow-legere">
      <dt className="text-legende text-texte-2">{label}</dt>
      <dd className="mt-0.5 text-[22px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
