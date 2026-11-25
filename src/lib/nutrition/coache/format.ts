/** Nutrition côté coaché : fonctions pures (serveur et client). */

export const MEALS = ["petit_dejeuner", "dejeuner", "collation", "diner"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABELS: Record<Meal, string> = {
  petit_dejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  collation: "Collation",
  diner: "Dîner",
};
/** « au petit-déjeuner », pour les confirmations. */
export const MEAL_AU: Record<Meal, string> = {
  petit_dejeuner: "au petit-déjeuner",
  dejeuner: "au déjeuner",
  collation: "à la collation",
  diner: "au dîner",
};
export const isMeal = (v: unknown): v is Meal => typeof v === "string" && (MEALS as readonly string[]).includes(v);

export type DayType = "training" | "rest";
export const DAY_TYPE_LABELS: Record<DayType, string> = { training: "Jour d’entraînement", rest: "Jour de repos" };
/** Paramètre d'URL du plan : ?jour=entrainement | repos. */
export const DAY_PARAM: Record<DayType, string> = { training: "entrainement", rest: "repos" };
export const dayTypeFromParam = (v: unknown): DayType | null => (v === "entrainement" ? "training" : v === "repos" ? "rest" : null);

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Apports d'un aliment (valeurs pour 100 g) pour une quantité en grammes. */
export function foodMacros(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return { kcal: round1(per100.kcal * k), protein: round1(per100.protein * k), carbs: round1(per100.carbs * k), fat: round1(per100.fat * k) };
}

/** Apports d'une recette (valeurs par portion) pour un nombre de portions. */
export function recipeMacros(perServing: Macros, portions: number): Macros {
  return {
    kcal: round1(perServing.kcal * portions),
    protein: round1(perServing.protein * portions),
    carbs: round1(perServing.carbs * portions),
    fat: round1(perServing.fat * portions),
  };
}

/** 1276 → « 1 276 » ; 6,8 → « 6,8 ». */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Minuscules, sans accents ni ligatures, espaces réduits : pour chercher « creme » et trouver « Crème ». */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vrai si chaque mot de la recherche apparaît dans le nom (sans accents, dans n'importe quel ordre). */
export function matches(name: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const n = normalize(name);
  return q.split(" ").every((w) => n.includes(w));
}

/* ---------------------------------------------------------------- dates */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Le journal accepte les 60 derniers jours, jamais le futur. */
export const JOURNAL_DAYS_BACK = 60;
export function isJournalDate(v: unknown, today: string): v is string {
  return isIsoDate(v) && v <= today && v >= shiftIso(today, -JOURNAL_DAYS_BACK);
}

/** Repas proposé par défaut selon l'heure de Paris. */
export function mealForHour(hour: number, minute = 0): Meal {
  const t = hour * 60 + minute;
  if (t < 10 * 60 + 30) return "petit_dejeuner";
  if (t < 15 * 60) return "dejeuner";
  if (t < 18 * 60 + 30) return "collation";
  return "diner";
}

/* ---------------------------------------------------------------- plan et liste de courses */

export type PlanItem = { text: string; name: string; quantity: string | null };
export type PlanMeal = { label: string; meal: Meal | null; items: PlanItem[] };

const QTY = /^(.*?)\s+((?:x\s?\d+(?:[.,]\d+)?)|(?:\d+(?:[.,]\d+)?\s?(?:g|kg|mg|ml|cl|dl|l|pots?|tranches?|portions?)))$/i;

/** « Fromage blanc 3 % 200 g » → nom « Fromage blanc 3 % », quantité « 200 g » ; « Œufs x2 » → « Œufs », « x2 ». */
export function parsePlanItem(text: string): PlanItem {
  const t = text.trim().replace(/\s+/g, " ");
  const m = QTY.exec(t);
  if (m && m[1].trim()) return { text: t, name: m[1].trim(), quantity: m[2].replace(/\s+/g, " ") };
  return { text: t, name: t, quantity: null };
}

/** Clé de comparaison : sans accents, mots au singulier (« Blancs de poulet » = « Blanc de poulet »). */
export function itemKey(name: string): string {
  return normalize(name)
    .split(" ")
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}

/** Deux articles désignent le même produit si l'un contient l'autre (« Skyr » ⊂ « Skyr nature »). */
export function sameProduct(a: string, b: string): boolean {
  const ka = itemKey(a);
  const kb = itemKey(b);
  if (!ka || !kb) return false;
  const wa = ` ${ka} `;
  const wb = ` ${kb} `;
  return wa.includes(wb) || wb.includes(wa);
}

/** Repas du schéma correspondant à un libellé de plan (« Petit-déjeuner » → petit_dejeuner). */
export function mealFromLabel(label: string): Meal | null {
  const n = normalize(label);
  if (n.startsWith("petit")) return "petit_dejeuner";
  if (n.startsWith("dejeuner")) return "dejeuner";
  if (n.startsWith("collation") || n.startsWith("gouter")) return "collation";
  if (n.startsWith("diner")) return "diner";
  return null;
}

type RawItem = string | { aliment?: unknown; nom?: unknown; name?: unknown; quantite?: unknown; quantity?: unknown };
type RawMeal = { repas?: unknown; meal?: unknown; name?: unknown; contenu?: unknown; items?: unknown; jour?: unknown; day_type?: unknown };

function toItem(raw: RawItem): PlanItem | null {
  if (typeof raw === "string") return raw.trim() ? parsePlanItem(raw) : null;
  if (raw && typeof raw === "object") {
    const name = String(raw.aliment ?? raw.nom ?? raw.name ?? "").trim();
    if (!name) return null;
    const q = raw.quantite ?? raw.quantity;
    const quantity = q == null || q === "" ? null : String(q);
    return { text: quantity ? `${name} ${quantity}` : name, name, quantity };
  }
  return null;
}

function dayOf(raw: RawMeal): DayType | null {
  const v = normalize(String(raw.jour ?? raw.day_type ?? ""));
  if (v === "training" || v.startsWith("entrainement")) return "training";
  if (v === "rest" || v.startsWith("repos")) return "rest";
  return null;
}

/**
 * Lit le champ jsonb `meals` d'un plan. Formats acceptés :
 *  - `[{ repas, contenu: ["Riz basmati 200 g", …] }]` (seed) ;
 *  - repas marqués `jour: "entrainement" | "repos"` (ou `day_type`) : on garde ceux du type de jour et ceux sans marque ;
 *  - objet `{ training: [...], rest: [...] }`.
 */
export function readPlanMeals(meals: unknown, dayType: DayType): PlanMeal[] {
  let list: unknown = meals;
  if (meals && typeof meals === "object" && !Array.isArray(meals)) {
    const o = meals as Record<string, unknown>;
    list = o[dayType] ?? o[DAY_PARAM[dayType]] ?? [];
  }
  if (!Array.isArray(list)) return [];
  return (list as RawMeal[])
    .filter((m) => m && typeof m === "object")
    .filter((m) => {
      const d = dayOf(m);
      return d === null || d === dayType;
    })
    .map((m) => {
      const label = String(m.repas ?? m.meal ?? m.name ?? "Repas");
      const rawItems = Array.isArray(m.contenu) ? m.contenu : Array.isArray(m.items) ? m.items : [];
      return {
        label: isMeal(label) ? MEAL_LABELS[label] : label,
        meal: isMeal(label) ? label : mealFromLabel(label),
        items: (rawItems as RawItem[]).map(toItem).filter((x): x is PlanItem => x !== null),
      };
    });
}

/** Articles du plan absents de la liste (comparaison souple, sans doublon dans le plan). */
export function missingFromList(plan: PlanMeal[], existing: string[]): PlanItem[] {
  const out: PlanItem[] = [];
  for (const meal of plan) {
    for (const item of meal.items) {
      if (existing.some((e) => sameProduct(e, item.name))) continue;
      if (out.some((o) => sameProduct(o.name, item.name))) continue;
      out.push(item);
    }
  }
  return out;
}

/** Étiquette d'une recette correspondant à un repas (« petit-déjeuner », « déjeuner »…). */
export function recipeFitsMeal(tags: string[], meal: Meal): boolean {
  const target = normalize(MEAL_LABELS[meal]);
  return tags.some((t) => normalize(t) === target);
}
