/**
 * US09 — Synthèse automatique du questionnaire de bilan (intake_forms.answers).
 * Fonctions pures (aucun accès base) : utilisées par la page pour l'affichage et par les Server Actions
 * pour enregistrer intake_forms.summary et préparer la conversion (US11).
 */

export type IntakeAnswers = {
  objectif?: string;
  disponibilites?: string;
  niveau?: string;
  experience?: string;
  douleurs?: string;
  alimentation?: string;
  sommeil?: string;
};

/** US10 — Tests physiques saisis pendant le bilan (intake_forms.tests). */
export type PhysicalTests = {
  poids_kg?: number | null;
  pompes_max?: number | null;
  gainage_s?: number | null;
  squats_1min?: number | null;
  souplesse_cm?: number | null;
  saved_at?: string;
};

export type TemplateOption = {
  id: string;
  name: string;
  goal: string;
  level: string | null;
  weeks: number;
  sessions_per_week: number;
};

export type Recommendation = { id: string; name: string; reason: string };

export type Summary = {
  version: 1;
  objectif: string | null;
  disponibilites: string | null;
  niveau: string | null;
  niveau_label: string | null;
  experience: string | null;
  alimentation: string | null;
  sommeil: string | null;
  vigilance: string[];
  adaptations: string[];
  modele_conseille: Recommendation | null;
  generated_at: string;
};

export const LEVEL_LABEL: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", confirme: "Confirmé" };

const NONE = new Set(["aucune", "aucun", "non", "rien", "ras", "neant", "pas de douleur", "-"]);

export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Lecture tolérante du JSON du questionnaire. */
export function readAnswers(raw: unknown): IntakeAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: IntakeAnswers = {};
  for (const k of ["objectif", "disponibilites", "niveau", "experience", "douleurs", "alimentation", "sommeil"] as const) {
    const v = text(o[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** Lecture tolérante du JSON des tests. */
export function readTests(raw: unknown): PhysicalTests | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const t: PhysicalTests = {
    poids_kg: num(o.poids_kg),
    pompes_max: num(o.pompes_max),
    gainage_s: num(o.gainage_s),
    squats_1min: num(o.squats_1min),
    souplesse_cm: num(o.souplesse_cm),
    saved_at: typeof o.saved_at === "string" ? o.saved_at : undefined,
  };
  return hasAnyTest(t) ? t : null;
}

export function hasAnyTest(t: PhysicalTests | null | undefined): boolean {
  return !!t && [t.poids_kg, t.pompes_max, t.gainage_s, t.squats_1min, t.souplesse_cm].some((v) => v != null);
}

/** Douleur réellement signalée (« Aucune » → null). */
export function painOf(a: IntakeAnswers): string | null {
  const p = a.douleurs?.trim();
  if (!p || NONE.has(normalize(p))) return null;
  return p;
}

/** « 6 h par nuit », « 7 h 30 », « 6h30 » → heures décimales ; illisible → null. */
export function sleepHours(s: string | null | undefined): number | null {
  const m = /(\d{1,2})(?:[.,](\d))?\s*h(?:\s*(\d{1,2}))?/i.exec(s ?? "");
  if (!m) return null;
  const h = Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) + (m[3] ? Number(m[3]) / 60 : 0);
  return Number.isFinite(h) ? h : null;
}

const SHORT_SLEEP_H = 7;

const isBack = (p: string) => /lomba|dos\b|colonne|hernie|sciati|lumbago|cervical/.test(normalize(p));

/** Points de vigilance affichés en orange. */
export function vigilanceOf(a: IntakeAnswers): string[] {
  const out: string[] = [];
  const pain = painOf(a);
  if (pain) out.push(/douleur|mal/i.test(pain) ? pain : `Douleur : ${pain}`);
  const h = sleepHours(a.sommeil);
  if (h != null && h < SHORT_SLEEP_H) out.push(`Sommeil court : ${a.sommeil}`);
  return out;
}

/** Adaptations déduites du questionnaire et des tests : deviennent les pastilles du programme personnalisé. */
export function adaptationsOf(a: IntakeAnswers, tests: PhysicalTests | null): string[] {
  const out: string[] = [];
  const pain = painOf(a);
  if (pain) {
    const p = normalize(pain);
    let matched = false;
    if (isBack(pain)) {
      out.push("Dos : pas de charge lourde sur la colonne");
      matched = true;
    }
    if (/genou/.test(p)) {
      out.push("Genou : pas de saut ni de flexion profonde chargée");
      matched = true;
    }
    if (/epaule/.test(p)) {
      out.push("Épaule : pas de charge au-dessus de la tête");
      matched = true;
    }
    if (/cheville/.test(p)) {
      out.push("Cheville : pas de saut, appuis progressifs");
      matched = true;
    }
    if (!matched) out.push(`Douleur à surveiller : ${pain}`);
  }
  const h = sleepHours(a.sommeil);
  if (h != null && h < SHORT_SLEEP_H) out.push("Sommeil court : volume modéré, RPE 7 maximum");
  if (hasAnyTest(tests)) out.push("Charges calées sur son bilan");
  return out;
}

/**
 * « Modèle conseillé » par règles simples selon l'objectif, le niveau et la vigilance.
 * Ex. « Perdre 5 kg et renforcer le dos » + débutant : « Mobilité et dos » si douleur au dos, sinon « HIIT + renforcement ».
 */
export function recommendTemplate(a: IntakeAnswers, templates: TemplateOption[]): Recommendation | null {
  if (!templates.length) return null;
  const obj = normalize(a.objectif);
  const level = a.niveau && LEVEL_LABEL[a.niveau] ? a.niveau : null;
  const beginner = level === "debutant" || level == null;
  const pain = painOf(a);
  const backPain = !!pain && isBack(pain);

  let wanted: string[] = [];
  let reason = "";
  if (/hyrox/.test(obj)) {
    wanted = ["Hyrox"];
    reason = "Objectif Hyrox : stations et course.";
  } else if (/trail|course|courir|semi|marathon|running|\d+\s*km/.test(obj)) {
    wanted = ["Course semi-marathon"];
    reason = "Objectif course à pied : préparation progressive en endurance.";
  } else if (/perdre|poids|mincir|maigrir|seche|affiner|\bkg\b|kilo/.test(obj)) {
    if (backPain) {
      wanted = ["Mobilité et dos", "Full body débutant"];
      reason = `Objectif de perte de poids, mais douleur au dos signalée : on commence par la mobilité et le gainage, sans charge lourde sur la colonne.`;
    } else {
      wanted = ["HIIT + renforcement"];
      reason = `Objectif de perte de poids${beginner ? ", niveau débutant" : ""} : circuits courts et renforcement.`;
    }
  } else if (/muscle|masse|hypertroph|volume/.test(obj)) {
    wanted = beginner ? ["Full body débutant", "Hypertrophie haut / bas"] : ["Hypertrophie haut / bas"];
    reason = beginner ? "Prise de muscle en partant des bases : apprentissage des mouvements." : "Prise de muscle : volume modéré, RPE 7 à 9.";
  } else if (/force|squat|souleve|developpe|charge/.test(obj)) {
    wanted = beginner ? ["Full body débutant", "Force bas du corps"] : ["Force bas du corps"];
    reason = beginner ? "Objectif de force, niveau débutant : apprentissage des mouvements de base d’abord." : "Objectif de force : progression linéaire sur le bas du corps.";
  } else if (/dos|mobilite|souplesse|posture/.test(obj) || backPain) {
    wanted = ["Mobilité et dos"];
    reason = "Mobilité, gainage et dos : pas de charge lourde sur la colonne.";
  } else {
    wanted = ["Full body débutant"];
    reason = "Remise en forme générale : apprentissage des mouvements de base.";
  }
  if (backPain && !wanted.includes("Mobilité et dos") && beginner) {
    reason += " Douleur au dos : adapter les exercices chargés.";
  }

  const byName = new Map(templates.map((t) => [normalize(t.name), t]));
  for (const name of wanted) {
    const t = byName.get(normalize(name));
    if (t) return { id: t.id, name: t.name, reason };
  }
  // Repli : un modèle du bon niveau, sinon le premier.
  const fallback = templates.find((t) => t.level === (level ?? "debutant")) ?? templates[0];
  return { id: fallback.id, name: fallback.name, reason: `${reason} Modèle le plus proche disponible.` };
}

export function buildSummary(raw: unknown, templates: TemplateOption[], tests: PhysicalTests | null, now = new Date()): Summary {
  const a = readAnswers(raw);
  return {
    version: 1,
    objectif: a.objectif ?? null,
    disponibilites: a.disponibilites ?? null,
    niveau: a.niveau ?? null,
    niveau_label: a.niveau ? (LEVEL_LABEL[a.niveau] ?? a.niveau) : null,
    experience: a.experience ?? null,
    alimentation: a.alimentation ?? null,
    sommeil: a.sommeil ?? null,
    vigilance: vigilanceOf(a),
    adaptations: adaptationsOf(a, tests),
    modele_conseille: recommendTemplate(a, templates),
    generated_at: now.toISOString(),
  };
}

/** « jeudi 26 novembre à 18 h 00 » (heure de Paris). */
export function fmtBookingDate(iso: string | null): string {
  if (!iso) return "Date à fixer";
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d).replace(":", " h ");
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${time}`;
}

export function fmtSavedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
