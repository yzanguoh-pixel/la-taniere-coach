"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { ExerciseLibrary, type ExerciseLite } from "@/components/programmes/library/ExerciseLibrary";
import { Dialog } from "./Dialog";
import { DeleteExerciseForm, ExerciseForm, type ExerciseDraft } from "./ExerciseForm";
import { DeleteSessionForm, SessionForm } from "./SessionForm";
import { fmtNum, fmtRest, type EditorData, type EditorExercise, type EditorSession } from "./types";

type Modal =
  | { kind: "exercise"; session: EditorSession; draft: ExerciseDraft }
  | { kind: "delete-exercise"; session: EditorSession; exercise: EditorExercise }
  | { kind: "session"; session: EditorSession | null }
  | { kind: "delete-session"; session: EditorSession }
  | { kind: "library" };

const sessionTitle = (s: EditorSession) => `Séance ${s.label} — ${s.name}`;
const fmtDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * US14 — Éditeur de programme (copie d'un coaché ou modèle) : semaines, séances A/B/C, exercices,
 * ajout depuis la bibliothèque (panneau droit sur grand écran, fenêtre sur mobile).
 */
export function ProgramEditor({ data, exercises, week, basePath }: { data: EditorData; exercises: ExerciseLite[]; week: number; basePath: string }) {
  const uid = useId();
  const isCopy = data.mode === "copie";
  const sessions = useMemo(() => (isCopy ? data.sessions.filter((s) => s.week === week) : data.sessions), [data.sessions, isCopy, week]);
  const editable = sessions.filter((s) => !isCopy || s.status === "planned");
  const [targetId, setTargetId] = useState<string | null>(null);
  const target = editable.find((s) => s.id === targetId) ?? editable[0] ?? null;
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  const close = () => setModal(null);
  const saved = (text: string) => {
    setModal(null);
    const at = Date.now();
    setToast({ text, at });
    window.setTimeout(() => setToast((t) => (t?.at === at ? null : t)), 5000);
  };
  const common = {
    mode: data.mode,
    ownerId: data.id,
    firstName: data.clientFirstName ?? "le coaché",
    canUpdateTemplate: data.canUpdateTemplate,
    onClose: close,
    onSaved: saved,
  };

  const openLibraryFor = (s: EditorSession) => {
    setTargetId(s.id);
    if (window.matchMedia("(min-width: 1024px)").matches) {
      libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      libraryRef.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus({ preventScroll: true });
    } else {
      setModal({ kind: "library" });
    }
  };
  const addFromLibrary = (e: ExerciseLite) => {
    if (!target) return;
    setModal({
      kind: "exercise",
      session: target,
      draft: { rowId: null, exerciseId: e.id, name: e.name, sets: 3, reps: isCopy ? "10" : "10", loadKg: null, rpe: null, restS: 90, consigne: null },
    });
  };

  const library = (
    <ExerciseLibrary
      exercises={exercises}
      onAdd={addFromLibrary}
      disabled={!target}
      addedIds={target ? target.exercises.map((x) => x.exerciseId) : []}
      title={target ? `Ajouter à la séance ${target.label}` : "Bibliothèque d’exercices"}
      className="max-h-[calc(100dvh-8rem)]"
    />
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {isCopy && data.weeks > 1 && (
          <nav aria-label="Semaines" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {Array.from({ length: data.weeks }, (_, i) => i + 1).map((w) => {
              const current = w === week;
              const doneAll = data.sessions.filter((s) => s.week === w).every((s) => s.status === "done");
              return (
                <Link
                  key={w}
                  href={`${basePath}?semaine=${w}`}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold tabular-nums transition-colors ${
                    current ? "bg-olive-fonce text-white" : "bg-separateur text-texte hover:bg-olive-pale"
                  }`}
                >
                  Semaine {w}
                  {doneAll && <span className={current ? "text-white/80" : "text-texte-2"}>· faite</span>}
                </Link>
              );
            })}
          </nav>
        )}

        {sessions.length === 0 ? (
          <div className="liste-groupee flex flex-col items-start gap-1 p-6">
            <strong>Pas encore de séance</strong>
            <span className="text-texte-2">Ajoutez une première séance, puis ses exercices depuis la bibliothèque.</span>
          </div>
        ) : (
          sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              isCopy={isCopy}
              selected={target?.id === s.id}
              onAdd={() => openLibraryFor(s)}
              onRename={() => setModal({ kind: "session", session: s })}
              onDelete={() => setModal({ kind: "delete-session", session: s })}
              onEdit={(x) =>
                setModal({
                  kind: "exercise",
                  session: s,
                  draft: { rowId: x.id, exerciseId: x.exerciseId, name: x.name, sets: x.sets, reps: x.reps, loadKg: x.loadKg, rpe: x.rpe, restS: x.restS, consigne: x.consigne },
                })
              }
              onRemove={(x) => setModal({ kind: "delete-exercise", session: s, exercise: x })}
            />
          ))
        )}

        <div>
          <button type="button" className="btn-secondaire bg-carte shadow-legere" onClick={() => setModal({ kind: "session", session: null })} aria-haspopup="dialog">
            <span aria-hidden>+</span> Ajouter une séance
          </button>
        </div>
      </div>

      <aside ref={libraryRef} aria-label="Bibliothèque d’exercices" className="hidden lg:sticky lg:top-8 lg:block">
        <div className="rounded-[20px] bg-carte p-4 shadow-legere">{library}</div>
      </aside>

      <Dialog open={modal != null} onClose={close} labelledBy={`${uid}-modal`} wide={modal?.kind === "library"}>
        <div id={`${uid}-modal`} className="sr-only">
          {modal?.kind === "library" ? "Bibliothèque d’exercices" : "Modifier le programme"}
        </div>
        {modal?.kind === "exercise" && <ExerciseForm key={modal.draft.rowId ?? modal.draft.exerciseId} {...common} sessionId={modal.session.id} sessionTitle={sessionTitle(modal.session)} draft={modal.draft} />}
        {modal?.kind === "delete-exercise" && (
          <DeleteExerciseForm {...common} sessionId={modal.session.id} sessionTitle={sessionTitle(modal.session)} rowId={modal.exercise.id} name={modal.exercise.name} />
        )}
        {modal?.kind === "session" && <SessionForm {...common} sessionId={modal.session?.id ?? null} currentName={modal.session?.name ?? ""} week={isCopy ? week : null} />}
        {modal?.kind === "delete-session" && <DeleteSessionForm {...common} sessionId={modal.session.id} title={sessionTitle(modal.session)} />}
        {modal?.kind === "library" && (
          <div className="flex max-h-[88dvh] flex-col gap-3 p-5">
            <div className="flex justify-end">
              <button type="button" className="btn-secondaire" onClick={close}>
                Fermer
              </button>
            </div>
            {library}
          </div>
        )}
      </Dialog>

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        {toast && (
          <p key={toast.at} className="pointer-events-auto flex items-center gap-3 rounded-full bg-olive-fonce px-5 py-3 font-semibold text-white shadow-flottante">
            {toast.text}
            <button type="button" onClick={() => setToast(null)} className="-mr-2 inline-flex min-h-11 items-center rounded-full px-3 text-white/80 hover:text-white">
              OK
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session: s,
  isCopy,
  selected,
  onAdd,
  onRename,
  onDelete,
  onEdit,
  onRemove,
}: {
  session: EditorSession;
  isCopy: boolean;
  selected: boolean;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
  onEdit: (x: EditorExercise) => void;
  onRemove: (x: EditorExercise) => void;
}) {
  const locked = isCopy && s.status !== "planned";
  const ghost = "inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-olive-fonce hover:bg-olive-pale";
  const cols = "md:grid md:grid-cols-[minmax(0,2.4fr)_0.8fr_1fr_0.9fr_1fr_0.7fr_auto] md:items-center md:gap-3";
  return (
    <section aria-label={`Séance ${s.label} — ${s.name}`} className={`liste-groupee ${selected && !locked ? "ring-2 ring-olive" : ""}`}>
      <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <h3 className="text-[19px] font-semibold">
            Séance {s.label} — {s.name}
          </h3>
          {isCopy && s.date && (
            <p className="text-legende tabular-nums text-texte-2">
              {fmtDate(s.date)}
              {s.status === "done" ? " · faite" : s.status === "skipped" ? " · non faite" : ""}
            </p>
          )}
        </div>
        {!locked && (
          <div className="flex gap-1">
            <button type="button" className={ghost} onClick={onRename} aria-haspopup="dialog" aria-label={`Renommer la séance ${s.label}`}>
              Renommer
            </button>
            <button type="button" className={ghost} onClick={onDelete} aria-haspopup="dialog" aria-label={`Supprimer la séance ${s.label}`}>
              Supprimer
            </button>
          </div>
        )}
      </header>

      {s.exercises.length > 0 && (
        <div className={`hidden px-6 pb-2 text-legende font-semibold text-texte-2 ${cols}`} aria-hidden>
          <span>Exercice</span>
          <span>Séries</span>
          <span>Répétitions</span>
          <span>Repos</span>
          <span>Charge</span>
          <span>RPE</span>
          <span className="w-[200px]" />
        </div>
      )}
      {s.exercises.length === 0 ? (
        <p className="px-5 py-4 text-texte-2 md:px-6">Aucun exercice dans cette séance. Ajoutez-en un pour que le coaché sache quoi faire.</p>
      ) : (
        s.exercises.map((x) => (
          <div key={x.id} className={`px-5 py-4 md:px-6 ${cols}`}>
            <div className="min-w-0">
              <p className="font-semibold">{x.name}</p>
              {x.consigne && <p className="text-legende text-texte-2">{x.consigne}</p>}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums md:contents">
              <Cell label="Séries">{x.sets}</Cell>
              <Cell label="Répétitions">{x.reps || "—"}</Cell>
              <Cell label="Repos">{fmtRest(x.restS)}</Cell>
              <Cell label="Charge">{x.loadKg == null ? <span className="text-texte-2">Poids du corps</span> : <strong>{fmtNum(x.loadKg)} kg</strong>}</Cell>
              <Cell label="RPE visé">{x.rpe == null ? <span className="text-texte-2">—</span> : fmtNum(x.rpe)}</Cell>
            </dl>
            {!locked ? (
              <div className="mt-2 flex gap-1 md:mt-0 md:w-[200px] md:justify-end">
                <button type="button" className={ghost} onClick={() => onEdit(x)} aria-haspopup="dialog" aria-label={`Modifier ${x.name}`}>
                  Modifier
                </button>
                <button type="button" className={ghost} onClick={() => onRemove(x)} aria-haspopup="dialog" aria-label={`Retirer ${x.name}`}>
                  Retirer
                </button>
              </div>
            ) : (
              <span className="hidden md:block md:w-[200px]" />
            )}
          </div>
        ))
      )}
      {!locked && (
        <div className="px-5 py-4 md:px-6">
          <button type="button" className="btn-secondaire min-h-11 border border-bordure bg-carte text-[15px]" onClick={onAdd}>
            <span aria-hidden>+</span> Ajouter un exercice
          </button>
        </div>
      )}
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-legende text-texte-2 md:sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
