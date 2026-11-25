import type { SessionBlock, SetRow } from "@/lib/coach/queries";
import { fmtDay, fmtKg } from "@/lib/coach/format";

/** Résume des séries : « 4 × 6 · 60 kg » si elles sont identiques, sinon série par série. */
function summarize(sets: SetRow[], kind: "plan" | "done"): string {
  const rows = sets
    .map((z) => (kind === "plan" ? { reps: z.target_reps, kg: z.target_load_kg } : { reps: z.reps, kg: z.load_kg }))
    .filter((r) => r.reps != null || r.kg != null);
  if (!rows.length) return kind === "done" ? "Non réalisé" : "—";
  const fmt = (r: { reps: number | null; kg: number | null }) => `${r.reps ?? "?"}${r.kg != null ? ` · ${fmtKg(r.kg)} kg` : ""}`;
  const same = rows.every((r) => r.reps === rows[0].reps && r.kg === rows[0].kg);
  if (same) return `${rows.length} × ${fmt(rows[0])}`;
  return rows.map(fmt).join(" / ");
}

/** Tableau prévu / réalisé des dernières séances faites. */
export function PlanVsDone({ sessions }: { sessions: SessionBlock[] }) {
  if (!sessions.length) return <p className="liste-groupee p-5 text-texte-2">Aucune séance réalisée pour l’instant.</p>;
  return (
    <div className="flex flex-col gap-4">
      {sessions.map((s) => (
        <div key={s.id} className="liste-groupee">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
            <h3 className="text-[17px] font-semibold">
              Séance {s.label} · {s.name}
            </h3>
            <span className="text-legende tabular-nums text-texte-2">
              Semaine {s.week} · {fmtDay(s.date)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[15px]">
              <caption className="sr-only">
                Prévu et réalisé, séance {s.label} du {fmtDay(s.date)}
              </caption>
              <thead>
                <tr className="text-legende text-texte-2">
                  <th scope="col" className="px-5 py-2 font-medium">Exercice</th>
                  <th scope="col" className="px-3 py-2 font-medium">Prévu</th>
                  <th scope="col" className="px-5 py-2 font-medium">Réalisé</th>
                </tr>
              </thead>
              <tbody>
                {s.exercises.map((x) => {
                  const plan = summarize(x.sets, "plan");
                  const done = summarize(x.sets, "done");
                  const diff = plan !== done;
                  return (
                    <tr key={x.id} className="border-t border-separateur">
                      <th scope="row" className="px-5 py-2.5 font-semibold">{x.name}</th>
                      <td className="px-3 py-2.5 tabular-nums text-texte-2">{plan}</td>
                      <td className={`px-5 py-2.5 tabular-nums ${diff ? "font-semibold text-beurre-fonce" : ""}`}>{done}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
