import type { ProgressReportData } from "@/lib/bilans-progression/types";
import { goalRatio } from "@/lib/bilans-progression/coache/parse";
import { nb, periodLabel, sentDate, signed } from "@/lib/bilans-progression/coache/format";
import { LiftWeeksChart, RegularityChart, WeightChart } from "./Charts";

/** Vue complète d'un bilan de progression côté coaché (composant d'affichage pur, sans accès aux données). */

export type ReportViewMeta = {
  title: string;
  periodStart: string;
  periodEnd: string;
  sentAt: string;
  coachNote: string | null;
};

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mx-1 mb-2 mt-7 text-legende font-bold uppercase tracking-[0.04em] text-texte-2">
      {children}
    </h2>
  );
}

function Tile({ label, value, sub, accent = false }: { label: string; value: React.ReactNode; sub?: string | null; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl px-4 py-3 ${accent ? "bg-olive-pale text-olive-fonce" : "bg-carte shadow-legere"}`}>
      <dt className={`text-legende font-medium ${accent ? "text-olive-fonce" : "text-texte-2"}`}>{label}</dt>
      <dd className="m-0">
        <span className="block text-[22px] font-bold leading-tight tabular-nums [overflow-wrap:anywhere]">{value}</span>
        {sub ? <span className={`mt-0.5 block text-legende tabular-nums ${accent ? "text-olive-fonce" : "text-texte-2"}`}>{sub}</span> : null}
      </dd>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export function ReportHeader({ meta, coachFirstName }: { meta: ReportViewMeta; coachFirstName: string }) {
  const sent = sentDate(meta.sentAt);
  return (
    <header>
      <p className="text-[15px] font-medium text-texte-2">{`Bilan ${periodLabel(meta.periodStart, meta.periodEnd)}`}</p>
      <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{meta.title}</h1>
      <p className="mt-1 text-[15px] text-texte-2">{`Envoyé par ${coachFirstName}${sent ? ` le ${sent}` : ""}`}</p>
    </header>
  );
}

export function CoachNote({ note, coachFirstName }: { note: string; coachFirstName: string }) {
  return (
    <section aria-labelledby="mot-coach" className="mt-6 rounded-[20px] bg-olive-pale p-5">
      <h2 id="mot-coach" className="text-[17px] font-bold text-olive-fonce">{`Le mot de ${coachFirstName}`}</h2>
      <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-texte [overflow-wrap:anywhere]">{note}</p>
    </section>
  );
}

export function ReportBody({ data }: { data: ProgressReportData }) {
  const { sessions: s, weight: w } = data;
  const hasSessions = s.planned > 0 || s.done > 0;
  const mainLift = data.lifts[0]?.exercise ?? null;
  const goal = goalRatio(data.goal.progressText);
  const goalPct = goal ? Math.round(goal.ratio * 100) : null;
  const hasGoal = data.goal.label || data.goal.progressText;
  const n = data.nutrition;
  const hasNutrition = n && (n.daysLogged > 0 || n.avgKcal != null);

  return (
    <>
      {/* Chiffres clés */}
      {hasSessions || data.rpeAvg != null || w.deltaKg != null ? (
        <>
          <SectionTitle id="chiffres">En chiffres</SectionTitle>
          <dl aria-labelledby="chiffres" className="m-0 grid grid-cols-2 gap-3">
            {hasSessions && (
              <Tile
                accent
                label="Séances faites"
                value={
                  s.planned > 0 ? (
                    <>
                      {s.done}
                      <span className="text-[15px] font-semibold"> / {s.planned}</span>
                    </>
                  ) : (
                    s.done
                  )
                }
                sub={s.planned > 0 ? `${s.adherencePct} % d’assiduité` : null}
              />
            )}
            {hasSessions && (
              <Tile label="Encadrées" value={s.presentiel} sub={`${plural(s.solo, "séance")} en autonomie`} />
            )}
            {data.rpeAvg != null && (
              <Tile
                label="Effort ressenti"
                value={
                  <>
                    {nb(data.rpeAvg)}
                    <span className="text-[15px] font-semibold text-texte-2"> / 10</span>
                  </>
                }
                sub="RPE moyen"
              />
            )}
            {w.deltaKg != null && (
              <Tile
                label="Poids"
                value={`${signed(w.deltaKg)} kg`}
                sub={w.startKg != null && w.endKg != null ? `${nb(w.startKg)} → ${nb(w.endKg)} kg` : null}
              />
            )}
          </dl>
        </>
      ) : null}

      {/* Charges */}
      {data.lifts.length > 0 && (
        <>
          <SectionTitle id="charges">Tes charges</SectionTitle>
          <section aria-labelledby="charges" className="liste-groupee">
            <ul className="m-0 list-none p-0">
              {data.lifts.map((l, i) => (
                <li key={`${l.exercise}-${i}`} className="flex min-h-14 items-center justify-between gap-3 border-separateur px-5 py-3 [&:not(:first-child)]:border-t">
                  <div className="min-w-0">
                    <p className="font-semibold [overflow-wrap:anywhere]">{l.exercise}</p>
                    <p className="text-legende text-texte-2 tabular-nums">
                      {l.startKg != null && l.endKg != null ? `${nb(l.startKg)} → ${nb(l.endKg)} kg` : l.endKg != null ? `${nb(l.endKg)} kg` : l.startKg != null ? `Départ ${nb(l.startKg)} kg` : "Charge non renseignée"}
                      {l.bestSet ? ` · meilleure série ${l.bestSet}` : ""}
                    </p>
                  </div>
                  {l.deltaKg != null && l.deltaKg !== 0 ? (
                    <p className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[15px] font-bold tabular-nums ${l.deltaKg > 0 ? "bg-olive-pale text-olive-fonce" : "bg-separateur text-texte"}`}>
                      {`${signed(l.deltaKg)} kg`}
                    </p>
                  ) : l.deltaKg === 0 ? (
                    <p className="shrink-0 whitespace-nowrap text-[15px] font-medium text-texte-2">Stable</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {mainLift && data.weeks.filter((x) => x.topKg != null).length >= 2 ? (
              <div className="p-5">
                <LiftWeeksChart weeks={data.weeks} exercise={mainLift} />
              </div>
            ) : null}
          </section>
        </>
      )}

      {/* Régularité */}
      {data.weeks.length > 0 && data.weeks.some((x) => x.planned > 0 || x.done > 0) && (
        <>
          <SectionTitle id="regularite">Ta régularité</SectionTitle>
          <section aria-labelledby="regularite" className="liste-groupee p-5">
            <RegularityChart weeks={data.weeks} />
          </section>
        </>
      )}

      {/* Poids */}
      {w.points.length >= 2 && (
        <>
          <SectionTitle id="poids">Ton poids</SectionTitle>
          <section aria-labelledby="poids" className="liste-groupee p-5">
            <WeightChart points={w.points} />
          </section>
        </>
      )}

      {/* Nutrition */}
      {hasNutrition && n && (
        <>
          <SectionTitle id="nutrition">Nutrition</SectionTitle>
          <section aria-labelledby="nutrition" className="liste-groupee p-5">
            <p className="text-[17px] tabular-nums">
              <span className="font-bold">{plural(n.daysLogged, "jour")}</span> de journal rempli
            </p>
            {n.avgKcal != null && (
              <p className="mt-1 text-[15px] text-texte-2 tabular-nums">
                {`${nb(Math.round(n.avgKcal), 0)} kcal en moyenne par jour`}
                {n.targetKcal != null ? ` · objectif ${nb(Math.round(n.targetKcal), 0)} kcal` : ""}
              </p>
            )}
          </section>
        </>
      )}

      {/* Objectif */}
      {hasGoal && (
        <>
          <SectionTitle id="objectif">Objectif</SectionTitle>
          <section aria-labelledby="objectif" className="liste-groupee p-5">
            {data.goal.label && <p className="font-semibold [overflow-wrap:anywhere]">{data.goal.label}</p>}
            {data.goal.progressText && (
              <p className="mt-0.5 text-[15px] text-texte-2 tabular-nums [overflow-wrap:anywhere]">
                {`Où tu en es : ${data.goal.progressText}`}
                {goalPct != null ? ` (${goalPct} %)` : ""}
              </p>
            )}
            {goalPct != null && (
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-separateur"
                role="progressbar"
                aria-label="Avancement vers l’objectif"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={goalPct}
                aria-valuetext={`${goalPct} % de l’objectif`}
              >
                <div className="h-full rounded-full bg-olive-fonce" style={{ width: `${goalPct}%` }} />
              </div>
            )}
          </section>
        </>
      )}

      {/* Points forts */}
      {data.highlights.length > 0 && (
        <>
          <SectionTitle id="points-forts">Points forts</SectionTitle>
          <ul aria-labelledby="points-forts" className="liste-groupee m-0 list-none p-0">
            {data.highlights.map((h, i) => (
              <li key={`${h}-${i}`} className="flex min-h-12 items-start gap-3 px-5 py-3">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-olive-fonce" />
                <span className="[overflow-wrap:anywhere]">{h}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Prochain objectif */}
      {data.nextFocus && (
        <>
          <SectionTitle id="prochain">Prochain objectif</SectionTitle>
          <section aria-labelledby="prochain" className="rounded-[20px] border border-olive bg-carte p-5">
            <p className="text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">{data.nextFocus}</p>
          </section>
        </>
      )}
    </>
  );
}

/** Message quand data est vide ou invalide. */
export function ReportUnavailable() {
  return (
    <p role="status" className="liste-groupee mt-6 p-5 text-[15px] text-texte-2">
      Ce bilan ne peut pas être affiché.
    </p>
  );
}
