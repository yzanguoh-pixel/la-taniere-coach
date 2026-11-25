/**
 * Règles nutrition de l'espace coach (pures, testables, utilisables côté client comme serveur).
 *
 * Personnalisation d'un plan type (« Personnaliser pour… ») :
 * 1. Calories = poids du coaché (kg) × facteur selon l'objectif, arrondi à 50 kcal :
 *      perte de poids / sèche  → 28 kcal/kg
 *      maintien / équilibre    → 31 kcal/kg
 *      prise (muscle, force)   → 35 kcal/kg
 *    L'objectif est déduit du texte `clients.goal` (modifiable dans le formulaire).
 *    Sans poids connu, on garde les calories du plan type.
 * 2. Aliments exclus (`clients.food_exclusions`) : toute ligne du plan contenant le terme exclu,
 *    ou un aliment de sa famille (ex. « poisson » → saumon, cabillaud, thon), est retirée.
 * 3. Chaque adaptation devient une pastille (`client_meal_plans.adaptations`, tableau de textes).
 */

export type Objective = "perte" | "maintien" | "prise";

export const KCAL_PER_KG: Record<Objective, number> = { perte: 28, maintien: 31, prise: 35 };

export const objectiveLabel: Record<Objective, string> = {
  perte: "Perte de poids",
  maintien: "Maintien",
  prise: "Prise (muscle, force)",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe");

/** Objectif nutritionnel déduit du texte libre de l'objectif du coaché. */
export function objectiveFromGoal(goal: string | null | undefined): Objective {
  const g = norm(goal ?? "");
  if (/perte|perdre|seche|mincir|affiner/.test(g)) return "perte";
  if (/prise|masse|muscle|force|hypertroph|grossir/.test(g)) return "prise";
  return "maintien";
}

export function isObjective(v: unknown): v is Objective {
  return v === "perte" || v === "maintien" || v === "prise";
}

/** Calories cibles : poids × facteur, arrondi à 50 kcal. */
export function kcalFor(weightKg: number, objective: Objective): number {
  return Math.round((weightKg * KCAL_PER_KG[objective]) / 50) * 50;
}

/** Familles d'aliments : une exclusion « poisson » retire aussi le saumon, etc. */
const FAMILIES: Record<string, string[]> = {
  poisson: ["poisson", "saumon", "cabillaud", "thon", "sardine", "maquereau", "colin", "truite", "merlu"],
  "fruits de mer": ["crevette", "moule", "fruits de mer", "calamar", "crabe"],
  lactose: ["lait", "skyr", "fromage", "yaourt", "feta", "creme", "mozzarella", "beurre doux"],
  porc: ["porc", "jambon", "lardon", "bacon", "saucisse", "chorizo"],
  viande: ["poulet", "dinde", "boeuf", "porc", "jambon", "veau", "agneau", "escalope", "steak"],
  gluten: ["pain", "pates", "ble", "tortilla", "muesli", "granola", "semoule", "flocons d'avoine"],
  oeuf: ["oeuf"],
  "fruits a coque": ["amande", "noix", "noisette", "cajou", "pistache", "cacahuete"],
  arachide: ["cacahuete", "arachide"],
  soja: ["soja", "tofu", "tempeh"],
};

/** Termes recherchés pour une exclusion (le terme lui-même, sans « s » final, et sa famille). */
export function termsFor(exclusion: string): string[] {
  const e = norm(exclusion).trim();
  if (!e) return [];
  const singular = e.replace(/s$/, "");
  const family = FAMILIES[e] ?? FAMILIES[singular] ?? [];
  return Array.from(new Set([singular, ...family]));
}

/** Vrai si une ligne de plan contient un mot exclu (recherche en début de mot, sans accents). */
export function matchesExclusion(item: string, exclusion: string): boolean {
  const text = " " + norm(item).replace(/[^a-z0-9' ]/g, " ");
  return termsFor(exclusion).some((t) => text.includes(" " + t));
}

export type PlanMeal = { repas: string; contenu: string[] };

/** Lecture tolérante du JSON `meals` ([{repas, contenu:[…]}]). */
export function parseMeals(raw: unknown): PlanMeal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const repas = typeof o.repas === "string" ? o.repas : typeof o.meal === "string" ? o.meal : "Repas";
      const list = Array.isArray(o.contenu) ? o.contenu : Array.isArray(o.items) ? o.items : [];
      return { repas, contenu: list.filter((x): x is string => typeof x === "string") };
    })
    .filter((m) => m.repas);
}

export function parseAdaptations(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

export type PersonalizeInput = {
  templateKcal: number;
  meals: PlanMeal[];
  weightKg: number | null;
  objective: Objective;
  exclusions: string[];
};

export type PersonalizeResult = { kcal: number; meals: PlanMeal[]; adaptations: string[] };

/** Copie personnalisée d'un plan type : calories recalculées, aliments exclus retirés, une pastille par adaptation. */
export function personalize({ templateKcal, meals, weightKg, objective, exclusions }: PersonalizeInput): PersonalizeResult {
  const adaptations: string[] = [];
  let kcal = templateKcal;
  if (weightKg != null && weightKg > 0) {
    kcal = kcalFor(weightKg, objective);
    adaptations.push(
      `Calories calculées pour ${weightKg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg : ${fmtInt(kcal)} kcal (${objectiveLabel[objective].toLowerCase()}, ${KCAL_PER_KG[objective]} kcal/kg)`,
    );
  } else {
    adaptations.push(`Poids inconnu : calories du plan type conservées (${fmtInt(kcal)} kcal)`);
  }

  let out = meals.map((m) => ({ repas: m.repas, contenu: [...m.contenu] }));
  for (const ex of exclusions.map((x) => x.trim()).filter(Boolean)) {
    const removed: string[] = [];
    out = out.map((m) => ({
      repas: m.repas,
      contenu: m.contenu.filter((item) => {
        const hit = matchesExclusion(item, ex);
        if (hit) removed.push(item);
        return !hit;
      }),
    }));
    const label = ex.charAt(0).toUpperCase() + ex.slice(1);
    adaptations.push(removed.length ? `Sans ${ex} : ${removed.join(", ")} retiré${removed.length > 1 ? "s" : ""}` : `${label} exclu : rien à retirer`);
  }
  return { kcal, meals: out, adaptations };
}

/* ------------------------------------------------------------------ affichage */

export const MEALS = ["petit_dejeuner", "dejeuner", "collation", "diner"] as const;
export const mealLabel: Record<string, string> = {
  petit_dejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};

export const dayTypeLabel = { training: "Jour d’entraînement", rest: "Jour de repos" } as const;
export type DayType = keyof typeof dayTypeLabel;

/** 2100 → « 2 100 ». */
export const fmtKcal = (n: number) => Math.round(n).toLocaleString("fr-FR");

/** Ajoute n jours à une date AAAA-MM-JJ. */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
