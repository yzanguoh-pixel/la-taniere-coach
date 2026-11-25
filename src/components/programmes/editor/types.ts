/** Modèle de données commun à l'éditeur (copie d'un coaché ou modèle). Pur : utilisable côté serveur et client. */

export type EditorMode = "copie" | "modele";

export type EditorExercise = {
  /** session_exercises.id (copie) ou template_exercises.id (modèle). */
  id: string;
  exerciseId: string;
  name: string;
  position: number;
  sets: number;
  /** Texte en mode modèle (« 10 par jambe »), nombre en mode copie. */
  reps: string;
  loadKg: number | null;
  rpe: number | null;
  restS: number | null;
  consigne: string | null;
};

export type EditorSession = {
  /** client_sessions.id (copie) ou template_sessions.id (modèle). */
  id: string;
  label: string;
  name: string;
  week: number | null;
  date: string | null;
  status: "planned" | "done" | "skipped" | null;
  exercises: EditorExercise[];
};

export type EditorData = {
  mode: EditorMode;
  /** client_programs.id (copie) ou program_templates.id (modèle). */
  id: string;
  name: string;
  templateId: string | null;
  templateName: string | null;
  /** Le modèle d'origine appartient-il au coach connecté (option « Mettre aussi à jour le modèle ») ? */
  canUpdateTemplate: boolean;
  clientId: string | null;
  clientFullName: string | null;
  clientFirstName: string | null;
  adaptations: string[];
  weeks: number;
  startDate: string | null;
  goal: string | null;
  sessions: EditorSession[];
};

export type EditorState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Change à chaque enregistrement réussi (pour fermer le formulaire côté client). */
  savedAt?: number;
};

export const initialEditorState: EditorState = { status: "idle" };

/** 62.5 → « 62,5 ». */
export const fmtNum = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** 150 → « 2 min 30 », 90 → « 90 s », 120 → « 2 min ». */
export function fmtRest(s: number | null): string {
  if (s == null) return "—";
  if (s < 120) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${String(r).padStart(2, "0")}` : `${m} min`;
}
