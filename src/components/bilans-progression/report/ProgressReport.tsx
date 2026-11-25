import type { HTMLAttributes, ReactNode } from "react";
import { PROFILE_AXIS_LABELS, type LiftSession, type ProfileScore, type ProgressReportData, type ReportLift } from "@/lib/bilans-progression/types";
import { goalRatio } from "@/lib/bilans-progression/coache/parse";
import { longDay, nb, note, periodLabel, sentDate, shortDay, signed, volume, weekday } from "@/lib/bilans-progression/coache/format";
import { BarChart, Gauge, LineChart, SrTable, WeightChart, RegularityChart, type ChartPoint } from "./charts";
import { Radar } from "./Radar";
import { LiftExplorer, type LiftPanel } from "./LiftExplorer";
import { parseView, type LiftView } from "./views";

/**
 * Bilan de progression complet, partagé entre la vue du coaché et l'aperçu du coach (composant serveur, affichage pur).
 * Ordre : en-tête, mot du coach, sommaire, profil (radar), chiffres clés, exercices (navigation ?exercice=),
 * régularité, récupération, corps et nutrition, à retenir.
 */

export type ProgressReportMeta = {
  title: string;
  periodStart: string;
  periodEnd: string;
  sentAt?: string | null;
  coachName: string;
  coachNote?: string | null;
};

export type ProgressReportProps = {
  data: ProgressReportData;
  meta: ProgressReportMeta;
  variant: "coache" | "coach";
  /** Valeur brute de ?exercice= (exerciseId) ; sans valeur ou inconnue : lifts[0]. */
  exerciseParam?: string | null;
  /** Valeur brute de ?vue= (charge | 1rm | volume) ; défaut : charge. */
  viewParam?: string | null;
};

const SECTIONS = {
  profil: "bilan-profil",
  exercices: "bilan-exercices",
  regularite: "bilan-regularite",
  recuperation: "bilan-recuperation",
  corps: "bilan-corps",
  retenir: "bilan-retenir",
} as const;

const plural = (n: number, one: string, many = `${one}s`) => `${nb(n, 0)} ${n > 1 ? many : one}`;
/** Carte simple (≠ liste-groupee, qui trace un séparateur entre chaque enfant). */
const CARD = "rounded-[20px] bg-carte p-5 shadow-legere";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function H({ level, ...props }: { level: number } & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as "h2";
  return <Tag {...props} />;
}

// ---------------------------------------------------------------- en-tête, mot du coach

export function ReportHeader({ meta, variant }: { meta: ProgressReportMeta; variant: ProgressReportProps["variant"] }) {
  const sent = meta.sentAt ? sentDate(meta.sentAt) : "";
  const level = variant === "coache" ? 1 : 2;
  const hasPeriod = ISO.test(meta.periodStart) && ISO.test(meta.periodEnd);
  return (
    <header>
      <p className="text-[15px] font-medium text-texte-2">{variant === "coach" ? "Aperçu du bilan de progression" : "Bilan de progression"}</p>
      <H level={level} className={`${variant === "coache" ? "text-[30px]" : "text-sous-titre"} font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]`}>
        {meta.title}
      </H>
      <p className="mt-1 text-[15px] text-texte-2">
        {hasPeriod ? capitalize(periodLabel(meta.periodStart, meta.periodEnd)) : null}
        {hasPeriod && (sent || variant === "coach") ? " · " : ""}
        {sent ? `${hasPeriod ? "envoyé" : "Envoyé"} par ${meta.coachName} le ${sent}` : variant === "coach" ? (hasPeriod ? "pas encore envoyé" : "Pas encore envoyé") : ""}
      </p>
    </header>
  );
}

export function CoachNote({ note: text, coachName, level = 2 }: { note: string; coachName: string; level?: number }) {
  return (
    <section aria-labelledby="bilan-mot-coach" className="mt-6 rounded-[20px] bg-olive-pale p-5">
      <H level={level} id="bilan-mot-coach" className="text-[17px] font-bold text-olive-fonce">{`Le mot de ${coachName}`}</H>
      <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-texte [overflow-wrap:anywhere]">{text}</p>
    </section>
  );
}

/** Encadré d'information (bilan ancien, contenu illisible…). */
export function ReportNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className={`${CARD} mt-6 text-[15px] text-texte-2`}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- briques

function Section({ id, title, level, children }: { id: string; title: string; level: number; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="mt-10 flex scroll-mt-24 flex-col gap-3">
      <H level={level} id={`${id}-titre`} className="mx-1 text-sous-titre">
        {title}
      </H>
      {children}
    </section>
  );
}

function SubTitle({ level, children, id }: { level: number; children: ReactNode; id?: string }) {
  return (
    <H level={level} id={id} className="text-[17px] font-semibold">
      {children}
    </H>
  );
}

function Tile({ label, value, sub, accent = false }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl px-4 py-3 ${accent ? "bg-olive-pale" : "bg-carte shadow-legere"}`}>
      <dt className={`text-legende font-medium ${accent ? "text-olive-fonce" : "text-texte-2"}`}>{label}</dt>
      <dd className="m-0">
        <span className={`block text-[22px] font-bold leading-tight tabular-nums [overflow-wrap:anywhere] ${accent ? "text-olive-fonce" : ""}`}>{value}</span>
        {sub ? <span className={`mt-0.5 block text-legende tabular-nums ${accent ? "text-olive-fonce" : "text-texte-2"}`}>{sub}</span> : null}
      </dd>
    </div>
  );
}

function Small({ children }: { children: ReactNode }) {
  return <span className="text-[15px] font-semibold text-texte-2">{children}</span>;
}

/** Variation : ▲ +0,5 (olive foncé), ▼ −0,3 (pêche foncé), = (gris). Texte complet pour les lecteurs d'écran. */
function Trend({ delta, unit = "", digits = 1, neutral = false }: { delta: number; unit?: string; digits?: number; neutral?: boolean }) {
  const eps = digits === 0 ? 0.5 : 0.05;
  if (Math.abs(delta) < eps)
    return (
      <span className="text-texte-2">
        <span aria-hidden="true">=</span>
        <span className="sr-only">stable</span>
      </span>
    );
  const up = delta > 0;
  return (
    <span className={`font-semibold ${neutral ? "text-texte" : up ? "text-olive-fonce" : "text-peche-fonce"}`}>
      <span aria-hidden="true">{`${up ? "▲" : "▼"} ${signed(delta, digits)}${unit}`}</span>
      <span className="sr-only">{`${up ? "en hausse de" : "en baisse de"} ${nb(Math.abs(delta), digits)}${unit}`}</span>
    </span>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="shrink-0 transition-transform group-open:rotate-90">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Badge({ mode }: { mode: LiftSession["mode"] }) {
  return mode === "presentiel" ? (
    <span className="inline-block rounded-full bg-olive-pale px-2 py-0.5 text-[12px] font-semibold text-olive-fonce">Présentiel</span>
  ) : (
    <span className="inline-block rounded-full bg-lavande px-2 py-0.5 text-[12px] font-semibold text-lavande-fonce">Solo</span>
  );
}

// ---------------------------------------------------------------- profil

function ProfileRow({ p }: { p: ProfileScore }) {
  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-semibold">{PROFILE_AXIS_LABELS[p.axis]}</span>
        <span className="whitespace-nowrap text-[15px] tabular-nums">
          {p.after == null ? (
            <span className="italic text-texte-2">pas de données</span>
          ) : (
            <>
              {p.before == null ? (
                <span className="text-texte-2">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">pas de données</span>
                </span>
              ) : (
                <span className="text-texte-2">{note(p.before)}</span>
              )}
              <span aria-hidden="true" className="text-texte-2">{" → "}</span>
              <span className="sr-only"> puis </span>
              <span className="font-bold">{note(p.after)}</span>
              {p.before != null && (
                <>
                  {" "}
                  <Trend delta={p.after - p.before} />
                </>
              )}
            </>
          )}
        </span>
      </div>
      {(p.detail || p.rule) && (
        <details className="group">
          <summary className="-ml-1 inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-1 text-[15px] font-semibold text-olive-fonce [&::-webkit-details-marker]:hidden">
            <Chevron />
            Comment c’est calculé
          </summary>
          <div className="flex flex-col gap-1 pb-1 pl-5 text-[15px] [overflow-wrap:anywhere]">
            {p.detail && <p>{p.detail}</p>}
            {p.rule && <p className="text-texte-2">{`Règle : ${p.rule}`}</p>}
          </div>
        </details>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- exercices

const setText = (s: LiftSession["sets"][number]) =>
  s.reps != null && s.kg != null ? `${s.reps}×${nb(s.kg)}` : s.reps != null ? `${s.reps} rép.` : s.kg != null ? `${nb(s.kg)} kg` : "";

function liftHeader(l: ReportLift, level: number) {
  const target = l.targetKg;
  const current = l.endKg ?? l.prKg;
  const targetPct = target && current != null ? Math.min(100, Math.round((current / target) * 100)) : null;
  return (
    <>
      <H level={level} className="text-[20px] font-bold leading-tight [overflow-wrap:anywhere]">
        {l.exercise}
      </H>
      {l.category && <p className="text-legende text-texte-2">{l.category}</p>}
      <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <dt className="text-legende text-texte-2">Charge de travail</dt>
          <dd className="m-0 tabular-nums">
            <span className="font-bold">
              {l.startKg != null && l.endKg != null ? `${nb(l.startKg)} → ${nb(l.endKg)} kg` : l.endKg != null ? `${nb(l.endKg)} kg` : l.startKg != null ? `${nb(l.startKg)} kg` : "—"}
            </span>
            {l.deltaKg != null && (
              <span className="block text-[15px]">
                <Trend delta={l.deltaKg} unit=" kg" />
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-legende text-texte-2">Record de la période</dt>
          <dd className="m-0 tabular-nums">
            <span className="font-bold">{l.prKg != null ? `${nb(l.prKg)} kg` : "—"}</span>
            {l.bestSet && <span className="block text-[15px] text-texte-2">{`meilleure série ${l.bestSet}`}</span>}
          </dd>
        </div>
        {(l.startE1rm != null || l.endE1rm != null) && (
          <div className="min-w-0">
            <dt className="text-legende text-texte-2">1RM estimé</dt>
            <dd className="m-0 font-bold tabular-nums">
              {l.startE1rm != null && l.endE1rm != null ? `${nb(l.startE1rm)} → ${nb(l.endE1rm)} kg` : `${nb((l.endE1rm ?? l.startE1rm) as number)} kg`}
            </dd>
          </div>
        )}
        {target != null && (
          <div className="min-w-0">
            <dt className="text-legende text-texte-2">Objectif</dt>
            <dd className="m-0 tabular-nums">
              <span className="font-bold">{`${nb(target)} kg`}</span>
              {targetPct != null && (
                <>
                  <span className="text-[15px] text-texte-2">{` · ${targetPct} %`}</span>
                  <Gauge value={current as number} target={target} />
                </>
              )}
            </dd>
          </div>
        )}
      </dl>
    </>
  );
}

function liftCharts(l: ReportLift): Partial<Record<LiftView, ReactNode>> {
  const label = (w: { weekStart: string }) => shortDay(w.weekStart);
  const rows = (pick: (w: ReportLift["weeks"][number]) => string) => l.weeks.map((w) => [`Semaine du ${longDay(w.weekStart)}`, pick(w)]);
  const charge: ChartPoint[] = l.weeks.map((w) => ({ key: w.weekStart, label: label(w), v: w.topKg }));
  const e1rm: ChartPoint[] = l.weeks.map((w) => ({ key: w.weekStart, label: label(w), v: w.e1rm }));
  const vol: ChartPoint[] = l.weeks.map((w) => ({ key: w.weekStart, label: label(w), v: w.volumeKg }));
  const enough = (pts: ChartPoint[]) => pts.filter((p) => p.v != null && p.v > 0).length >= 2;
  const fig = (chart: ReactNode, table: ReactNode, caption: string) => (
    <figure className="m-0">
      {chart}
      {table}
      <figcaption className="mt-1 text-legende text-texte-2">{caption}</figcaption>
    </figure>
  );
  const out: Partial<Record<LiftView, ReactNode>> = {};
  if (enough(charge))
    out.charge = fig(
      <LineChart points={charge} unit=" kg" target={l.targetKg != null ? { v: l.targetKg, label: `Objectif ${nb(l.targetKg)} kg` } : null} />,
      <SrTable caption={`${l.exercise} : charge la plus lourde par semaine`} head={["Semaine", "Charge max"]} rows={rows((w) => (w.topKg != null ? `${nb(w.topKg)} kg` : "pas de séance"))} />,
      "Charge la plus lourde soulevée chaque semaine.",
    );
  if (enough(e1rm))
    out["1rm"] = fig(
      <LineChart points={e1rm} unit=" kg" />,
      <SrTable caption={`${l.exercise} : 1RM estimé par semaine`} head={["Semaine", "1RM estimé"]} rows={rows((w) => (w.e1rm != null ? `${nb(w.e1rm)} kg` : "pas de séance"))} />,
      "1RM estimé : la charge que tu pourrais soulever une fois, déduite de ta meilleure série (formule d’Epley).",
    );
  if (enough(vol))
    out.volume = fig(
      <BarChart points={vol} unit="" />,
      <SrTable caption={`${l.exercise} : volume par semaine`} head={["Semaine", "Volume", "Séries"]} rows={l.weeks.map((w) => [`Semaine du ${longDay(w.weekStart)}`, `${nb(w.volumeKg, 0)} kg`, `${w.setsDone}`])} />,
      "Volume : répétitions × charge, additionnées sur la semaine (en kg).",
    );
  return out;
}

function liftTable(l: ReportLift, level: number) {
  const sessions = [...l.sessions].reverse();
  return (
    <div className="px-5 pb-4 pt-5">
      <SubTitle level={level}>Séance par séance</SubTitle>
      {sessions.length === 0 ? (
        <p className="mt-2 text-[15px] text-texte-2">Aucune séance enregistrée pour cet exercice.</p>
      ) : (
        <table className="mt-2 w-full table-fixed border-collapse text-[15px]">
          <caption className="sr-only">{`${l.exercise} : séances de la plus récente à la plus ancienne`}</caption>
          <colgroup>
            <col className="w-[22%]" />
            <col />
            <col className="w-[33%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-legende text-texte-2">
              <th scope="col" className="pb-1 pr-2 font-medium">
                Date
              </th>
              <th scope="col" className="pb-1 pr-2 font-medium">
                Séance et séries
              </th>
              <th scope="col" className="pb-1 text-right font-medium">
                Meilleure série
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={`${s.date}-${i}`} className="border-t border-separateur align-top">
                <th scope="row" className="py-2.5 pr-2 text-left font-semibold tabular-nums">
                  <span className="block">{shortDay(s.date)}</span>
                  <span className="block text-legende font-normal text-texte-2">{weekday(s.date)}</span>
                </th>
                <td className="min-w-0 py-2.5 pr-2">
                  <span className="block [overflow-wrap:anywhere]">{s.sessionName}</span>
                  <span className="mt-0.5 block">
                    <Badge mode={s.mode} />
                  </span>
                  {s.sets.length > 0 && <span className="mt-1 block text-legende text-texte-2 tabular-nums [overflow-wrap:anywhere]">{s.sets.map(setText).join(" · ")}</span>}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  <span className="block whitespace-nowrap font-semibold">{s.bestSet ?? "—"}</span>
                  {s.e1rm != null && <span className="block whitespace-nowrap text-legende text-texte-2">{`1RM ≈ ${nb(s.e1rm)} kg`}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- composant principal

export function ProgressReport({ data, meta, variant, exerciseParam, viewParam }: ProgressReportProps) {
  const L = variant === "coache" ? 2 : 3; // niveau des titres de section (le titre du bilan est un niveau au-dessus)
  const s = data.sessions;
  const w = data.weight;
  const n = data.nutrition;
  const e = data.endurance;
  const f = data.feelings;
  const nbWeeks = data.weeks.length || 4;

  const hasProfile = data.profile.some((p) => p.after != null || p.before != null);
  const hasSessions = s.planned > 0 || s.done > 0;
  const hasRegularity = data.weeks.some((x) => x.planned > 0 || x.done > 0);
  const hasEndurance = e != null && (e.minutes > 0 || e.sessions > 0);
  const feelingsTotal = f.facile + f.correct + f.difficile + f.douleur;
  const hasRecovery = data.rpeAvg != null || feelingsTotal > 0 || data.painZones.length > 0;
  const hasNutrition = n != null && (n.daysLogged > 0 || n.avgKcal != null);
  const hasBody = w.deltaKg != null || w.points.length > 0 || hasNutrition;
  const hasRetenir = data.highlights.length > 0 || data.watchouts.length > 0 || data.nextFocus != null;
  const goal = goalRatio(data.goal.progressText);
  const goalPct = goal ? Math.round(goal.ratio * 100) : null;

  const toc: { id: string; label: string }[] = (
    [
    hasProfile && { id: SECTIONS.profil, label: "Profil" },
    data.lifts.length > 0 && { id: SECTIONS.exercices, label: "Exercices" },
    (hasRegularity || hasEndurance) && { id: SECTIONS.regularite, label: "Régularité" },
    hasRecovery && { id: SECTIONS.recuperation, label: "Récupération" },
    hasBody && { id: SECTIONS.corps, label: "Corps et nutrition" },
    hasRetenir && { id: SECTIONS.retenir, label: "À retenir" },
    ] as const
  ).flatMap((x) => (x ? [x] : []));

  const panels: LiftPanel[] = data.lifts.map((l) => ({
    id: l.exerciseId,
    label: l.exercise,
    header: liftHeader(l, L + 1),
    charts: liftCharts(l),
    table: liftTable(l, L + 2),
  }));
  const initialId = data.lifts.find((l) => l.exerciseId === exerciseParam)?.exerciseId ?? data.lifts[0]?.exerciseId ?? "";

  return (
    <div className="@container min-w-0">
      <ReportHeader meta={meta} variant={variant} />
      {meta.coachNote && <CoachNote note={meta.coachNote} coachName={meta.coachName} level={L} />}

      {toc.length > 1 && (
        <nav aria-label="Sommaire du bilan" className="mt-6">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="inline-flex min-h-11 items-center rounded-full border border-bordure bg-carte px-4 text-[15px] font-semibold text-texte hover:bg-olive-pale">
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* 1. Profil */}
      {hasProfile && (
        <Section id={SECTIONS.profil} title="Ton profil" level={L}>
          <div className="liste-groupee">
            <div className="px-2 py-4 @xl:p-5">
              <Radar profile={data.profile} beforeLabel={`Il y a ${nbWeeks} semaines`} afterLabel="Aujourd’hui" />
            </div>
            <ul className="m-0 list-none p-0 [&>li+li]:border-t [&>li+li]:border-separateur">
              {data.profile.map((p) => (
                <ProfileRow key={p.axis} p={p} />
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* 2. Chiffres clés */}
      {(hasSessions || data.rpeAvg != null || w.deltaKg != null || s.totalVolumeKg > 0) && (
        <section aria-labelledby="bilan-chiffres-titre" className="mt-8 flex flex-col gap-3">
          <H level={L} id="bilan-chiffres-titre" className="mx-1 text-sous-titre">
            En chiffres
          </H>
          <dl className="m-0 grid grid-cols-2 gap-3 @xl:grid-cols-3">
            {hasSessions && (
              <Tile
                accent
                label="Séances faites"
                value={
                  s.planned > 0 ? (
                    <>
                      {s.done}
                      <span className="text-[15px] font-semibold">{` / ${s.planned}`}</span>
                    </>
                  ) : (
                    s.done
                  )
                }
                sub={s.planned > 0 ? `${s.adherencePct} % d’assiduité` : null}
              />
            )}
            {hasSessions && (
              <Tile
                label="Encadrées · solo"
                value={
                  <>
                    {s.presentiel}
                    <Small>{" · "}</Small>
                    {s.solo}
                  </>
                }
              />
            )}
            {s.totalVolumeKg > 0 && <Tile label="Volume soulevé" value={volume(s.totalVolumeKg)} sub={s.totalSets > 0 ? plural(s.totalSets, "série") : null} />}
            {data.rpeAvg != null && (
              <Tile
                label="Effort ressenti"
                value={
                  <>
                    {nb(data.rpeAvg)}
                    <Small> / 10</Small>
                  </>
                }
                sub="RPE moyen"
              />
            )}
            {w.deltaKg != null && <Tile label="Poids" value={`${signed(w.deltaKg)} kg`} sub={w.startKg != null && w.endKg != null ? `${nb(w.startKg)} → ${nb(w.endKg)} kg` : null} />}
          </dl>
        </section>
      )}

      {/* 3. Exercices */}
      {data.lifts.length > 0 && (
        <Section id={SECTIONS.exercices} title="Tes exercices" level={L}>
          {(data.goal.label || data.goal.progressText) && (
            <div className="rounded-[20px] border border-olive bg-carte px-5 py-4">
              <p className="text-legende font-medium text-texte-2">Ton objectif</p>
              {data.goal.label && <p className="font-semibold [overflow-wrap:anywhere]">{data.goal.label}</p>}
              {data.goal.progressText && (
                <p className="text-[15px] text-texte-2 tabular-nums [overflow-wrap:anywhere]">
                  {`Où tu en es : ${data.goal.progressText}`}
                  {goalPct != null ? ` (${goalPct} %)` : ""}
                </p>
              )}
              {goal && <Gauge value={goal.current} target={goal.target} />}
            </div>
          )}
          <p className="mx-1 text-[15px] text-texte-2">Choisis un exercice pour voir sa progression semaine après semaine.</p>
          <LiftExplorer panels={panels} initialId={initialId} initialView={parseView(viewParam)} anchor={SECTIONS.exercices} />
        </Section>
      )}

      {/* 4. Régularité + endurance */}
      {(hasRegularity || hasEndurance) && (
        <Section id={SECTIONS.regularite} title="Ta régularité" level={L}>
          {hasRegularity && (
            <div className={CARD}>
              {hasSessions && (
                <p className="mb-3 text-[15px] tabular-nums">
                  <span className="font-bold">{`${s.done} séance${s.done > 1 ? "s" : ""}${s.planned > 0 ? ` sur ${s.planned}` : ""}`}</span>
                  <span className="text-texte-2">{` · ${s.presentiel} en présentiel, ${s.solo} en solo`}</span>
                </p>
              )}
              <RegularityChart weeks={data.weeks} />
            </div>
          )}
          {hasEndurance && e && (
            <div className={CARD}>
              <SubTitle level={L + 1}>Endurance</SubTitle>
              <p className="text-legende text-texte-2">Cardio, course, Hyrox et activités de ta montre.</p>
              <dl className="m-0 mt-3 grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <dt className="text-legende text-texte-2">Temps</dt>
                  <dd className="m-0 text-[20px] font-bold tabular-nums">{e.minutes >= 60 ? `${Math.floor(e.minutes / 60)} h ${String(e.minutes % 60).padStart(2, "0")}` : `${e.minutes} min`}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-legende text-texte-2">Sorties</dt>
                  <dd className="m-0 text-[20px] font-bold tabular-nums">{e.sessions}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-legende text-texte-2">Distance</dt>
                  <dd className="m-0 text-[20px] font-bold tabular-nums">{e.distanceKm != null ? `${nb(e.distanceKm)} km` : "—"}</dd>
                </div>
              </dl>
            </div>
          )}
        </Section>
      )}

      {/* 5. Récupération : ressentis, RPE, douleurs */}
      {hasRecovery && (
        <Section id={SECTIONS.recuperation} title="Ta récupération" level={L}>
          <div className={CARD}>
            {data.rpeAvg != null && (
              <p className="text-[15px] tabular-nums">
                <span className="font-bold">{`Effort ressenti moyen : ${nb(data.rpeAvg)} / 10`}</span>
                <span className="text-texte-2"> (RPE)</span>
              </p>
            )}
            {feelingsTotal > 0 && (
              <>
                <SubTitle level={L + 1}>{`Tes ressentis après séance (${feelingsTotal} retour${feelingsTotal > 1 ? "s" : ""})`}</SubTitle>
                <span aria-hidden="true" className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-separateur">
                  {f.facile > 0 && <span className="h-full bg-olive" style={{ width: `${(f.facile / feelingsTotal) * 100}%` }} />}
                  {f.correct > 0 && <span className="h-full bg-olive-fonce" style={{ width: `${(f.correct / feelingsTotal) * 100}%` }} />}
                  {f.difficile > 0 && <span className="h-full bg-beurre-fonce" style={{ width: `${(f.difficile / feelingsTotal) * 100}%` }} />}
                  {f.douleur > 0 && <span className="h-full bg-peche-fonce" style={{ width: `${(f.douleur / feelingsTotal) * 100}%` }} />}
                </span>
                <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-4">
                  {(
                    [
                      ["Facile", f.facile, "bg-olive"],
                      ["Correct", f.correct, "bg-olive-fonce"],
                      ["Difficile", f.difficile, "bg-beurre-fonce"],
                      ["Douleur", f.douleur, "bg-peche-fonce"],
                    ] as const
                  ).map(([label, v, color]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${color}`} />
                      <dt className="text-[15px]">{label}</dt>
                      <dd className="m-0 ml-auto text-[17px] font-bold tabular-nums @xl:ml-1">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {data.painZones.length > 0 && (
              <div className="mt-4">
                <p className="text-[15px] font-semibold">Zones de douleur signalées</p>
                <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-2 p-0">
                  {data.painZones.map((z) => (
                    <li key={z} className="rounded-full bg-peche px-3 py-1 text-[15px] font-semibold text-peche-fonce">
                      {z}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 6. Corps et nutrition */}
      {hasBody && (
        <Section id={SECTIONS.corps} title="Corps et nutrition" level={L}>
          {(w.deltaKg != null || w.points.length > 0) && (
            <div className={CARD}>
              <SubTitle level={L + 1}>Poids</SubTitle>
              <p className="text-[15px] tabular-nums">
                {w.startKg != null && w.endKg != null ? `${nb(w.startKg)} → ${nb(w.endKg)} kg` : w.endKg != null ? `${nb(w.endKg)} kg` : ""}
                {w.deltaKg != null && (
                  <>
                    {" "}
                    <Trend delta={w.deltaKg} unit=" kg" neutral />
                  </>
                )}
                <span className="text-texte-2">{` · ${plural(w.points.length, "pesée")}`}</span>
              </p>
              {w.points.length >= 2 && (
                <div className="mt-3">
                  <WeightChart points={w.points} />
                </div>
              )}
            </div>
          )}
          {hasNutrition && n && (
            <div className={CARD}>
              <SubTitle level={L + 1}>Nutrition</SubTitle>
              <p className="text-[15px] tabular-nums">
                <span className="font-semibold">{plural(n.daysLogged, "jour")}</span>
                <span className="text-texte-2">{` de journal rempli${n.daysLogged > 0 ? ` · ${n.daysOnTarget} dans ta cible calorique (± 10 %)` : ""}`}</span>
              </p>
              <dl className="m-0 mt-3 flex flex-col gap-4">
                {n.avgKcal != null && (
                  <div>
                    <dt className="text-[15px] text-texte-2">Calories, moyenne par jour</dt>
                    <dd className="m-0 tabular-nums">
                      <span className="font-bold">{`${nb(Math.round(n.avgKcal), 0)} kcal`}</span>
                      {n.targetKcal != null && <span className="text-texte-2">{` sur un objectif de ${nb(Math.round(n.targetKcal), 0)} kcal`}</span>}
                      {n.targetKcal != null && n.targetKcal > 0 && <Gauge value={n.avgKcal} target={n.targetKcal} />}
                    </dd>
                  </div>
                )}
                {n.avgProteinG != null && (
                  <div>
                    <dt className="text-[15px] text-texte-2">Protéines, moyenne par jour</dt>
                    <dd className="m-0 tabular-nums">
                      <span className="font-bold">{`${nb(Math.round(n.avgProteinG), 0)} g`}</span>
                      {n.targetProteinG != null && <span className="text-texte-2">{` sur un objectif de ${nb(Math.round(n.targetProteinG), 0)} g`}</span>}
                      {n.targetProteinG != null && n.targetProteinG > 0 && <Gauge value={n.avgProteinG} target={n.targetProteinG} />}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </Section>
      )}

      {/* 7. À retenir */}
      {hasRetenir && (
        <Section id={SECTIONS.retenir} title="À retenir" level={L}>
          {data.highlights.length > 0 && (
            <div className="rounded-[20px] bg-carte shadow-legere">
              <div className="px-5 pb-1 pt-4">
                <SubTitle level={L + 1} id="bilan-points-forts">
                  Points forts
                </SubTitle>
              </div>
              <ul aria-labelledby="bilan-points-forts" className="m-0 list-none p-0 pb-2">
                {data.highlights.map((h, i) => (
                  <li key={`${h}-${i}`} className="flex items-start gap-3 px-5 py-2">
                    <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-olive-fonce" />
                    <span className="[overflow-wrap:anywhere]">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.watchouts.length > 0 && (
            <div className="rounded-[20px] bg-peche">
              <div className="px-5 pb-1 pt-4">
                <SubTitle level={L + 1} id="bilan-attention">
                  Points d’attention
                </SubTitle>
              </div>
              <ul aria-labelledby="bilan-attention" className="m-0 list-none p-0 pb-2">
                {data.watchouts.map((h, i) => (
                  <li key={`${h}-${i}`} className="flex items-start gap-3 px-5 py-2">
                    <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-peche-fonce" />
                    <span className="[overflow-wrap:anywhere]">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.nextFocus && (
            <div className="rounded-[20px] border border-olive bg-carte p-5">
              <SubTitle level={L + 1}>Prochain objectif</SubTitle>
              <p className="mt-1 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">{data.nextFocus}</p>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
