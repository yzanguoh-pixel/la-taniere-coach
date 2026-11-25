import "server-only";
import type { Supabase } from "@/lib/coach/supabase";
import { todayIso } from "@/lib/coach/format";
import { addDays, isIsoDate, parseAdaptations, parseMeals, type DayType, type PlanMeal } from "./rules";

/** Lectures nutrition de l'espace coach. Toutes passent par la RLS : Karim ne lit que ses coachés. */

type ProfileName = { full_name: string; initials: string };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const num = (v: unknown): number => (v == null ? 0 : Number(v));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
export type Goals = Partial<Record<DayType, Macros>>;

export type LogEntry = {
  id: string;
  date: string;
  meal: string;
  name: string;
  quantity: number;
  unit: "g" | "portion";
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  coachComment: string | null;
  createdAt: string;
};

export type WeekDay = { date: string; kcal: number; target: number | null; dayType: DayType; entries: number };
export type ClientPlan = { id: string; name: string; kcal: number; adaptations: string[]; meals: PlanMeal[]; createdAt: string };
export type WeightPoint = { date: string; kg: number; source: string };

export type ClientNutrition = {
  id: string;
  fullName: string;
  initials: string;
  goal: string | null;
  weightKg: number | null;
  exclusions: string[];
  goals: Goals;
  today: string;
  day: string;
  dayType: DayType;
  week: WeekDay[];
  entries: LogEntry[];
  plan: ClientPlan | null;
  weights: WeightPoint[];
};

const ENTRY_SELECT = "id, date, meal, label, quantity, kcal, protein_g, carbs_g, fat_g, coach_comment, created_at, recipe_id, foods(name), recipes(name)";

type RawEntry = {
  id: string;
  date: string;
  meal: string;
  label: string | null;
  quantity: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  coach_comment: string | null;
  created_at: string;
  recipe_id: string | null;
  foods: { name: string } | { name: string }[] | null;
  recipes: { name: string } | { name: string }[] | null;
};

function toEntry(r: RawEntry): LogEntry {
  const food = one(r.foods);
  const recipe = one(r.recipes);
  return {
    id: r.id,
    date: r.date,
    meal: r.meal,
    name: recipe?.name ?? food?.name ?? r.label ?? "Aliment",
    quantity: num(r.quantity),
    unit: r.recipe_id ? "portion" : "g",
    kcal: num(r.kcal),
    protein_g: num(r.protein_g),
    carbs_g: num(r.carbs_g),
    fat_g: num(r.fat_g),
    coachComment: r.coach_comment,
    createdAt: r.created_at,
  };
}

function toGoals(rows: { day_type: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[]): Goals {
  const g: Goals = {};
  for (const r of rows) {
    if (r.day_type === "training" || r.day_type === "rest") g[r.day_type] = { kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g };
  }
  return g;
}

/** Une séance prévue ou faite ce jour-là → jour d'entraînement ; sinon jour de repos. */
const dayTypeOf = (date: string, trainingDates: Set<string>): DayType => (trainingDates.has(date) ? "training" : "rest");

/** Fiche nutrition d'un coaché (US25/US26). `requestedDay` : jour du journal affiché (dans les 7 derniers jours). */
export async function getClientNutrition(supabase: Supabase, clientId: string, requestedDay?: string): Promise<ClientNutrition | null> {
  if (!UUID.test(clientId)) return null;
  const { data: c, error } = await supabase
    .from("clients")
    .select("id, goal, weight_kg, food_exclusions, profiles!clients_profile_id_fkey(full_name, initials)")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger la fiche nutrition : " + error.message);
  if (!c) return null;
  const profile = one(c.profiles as unknown as ProfileName | ProfileName[] | null);

  const today = todayIso();
  const start = addDays(today, -6);
  const [goalsRes, weekRes, sessionsRes, planRes, weightsRes] = await Promise.all([
    supabase.from("nutrition_goals").select("day_type, kcal, protein_g, carbs_g, fat_g").eq("client_id", clientId),
    supabase.from("food_log_entries").select(ENTRY_SELECT).eq("client_id", clientId).gte("date", start).lte("date", today).order("created_at", { ascending: true }),
    supabase.from("client_sessions").select("date").eq("client_id", clientId).in("status", ["planned", "done"]).gte("date", start).lte("date", today),
    supabase.from("client_meal_plans").select("id, name, kcal_target, adaptations, meals, created_at").eq("client_id", clientId).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("weight_logs").select("date, weight_kg, source").eq("client_id", clientId).order("date", { ascending: true }).limit(90),
  ]);
  for (const r of [goalsRes, weekRes, sessionsRes, planRes, weightsRes]) {
    if (r.error) throw new Error("Impossible de charger la nutrition : " + r.error.message);
  }

  const goals = toGoals(goalsRes.data ?? []);
  const trainingDates = new Set((sessionsRes.data ?? []).map((s) => s.date as string));
  const all = ((weekRes.data ?? []) as unknown as RawEntry[]).map(toEntry);

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const dayEntries = all.filter((e) => e.date === date);
    const dayType = dayTypeOf(date, trainingDates);
    return { date, kcal: dayEntries.reduce((s, e) => s + e.kcal, 0), target: goals[dayType]?.kcal ?? null, dayType, entries: dayEntries.length };
  });

  // Jour affiché : celui demandé s'il est dans la semaine, sinon aujourd'hui, ou à défaut le dernier jour renseigné.
  let day = today;
  if (isIsoDate(requestedDay) && requestedDay >= start && requestedDay <= today) day = requestedDay;
  else if (!week[6].entries) day = [...week].reverse().find((d) => d.entries > 0)?.date ?? today;

  const p = planRes.data;
  const plan: ClientPlan | null = p
    ? { id: p.id, name: p.name, kcal: p.kcal_target, adaptations: parseAdaptations(p.adaptations), meals: parseMeals(p.meals), createdAt: p.created_at }
    : null;

  return {
    id: c.id,
    fullName: profile?.full_name ?? "Coaché",
    initials: profile?.initials ?? "?",
    goal: c.goal ?? null,
    weightKg: c.weight_kg == null ? null : Number(c.weight_kg),
    exclusions: c.food_exclusions ?? [],
    goals,
    today,
    day,
    dayType: dayTypeOf(day, trainingDates),
    week,
    entries: all.filter((e) => e.date === day),
    plan,
    weights: (weightsRes.data ?? []).map((w) => ({ date: w.date, kg: Number(w.weight_kg), source: w.source })),
  };
}

/* ------------------------------------------------------------------ espace Nutrition (US27) */

export type OverviewRow = {
  id: string;
  fullName: string;
  initials: string;
  goal: string | null;
  weightKg: number | null;
  exclusions: string[];
  dayType: DayType;
  kcalToday: number;
  target: number | null;
  last: { meal: string; name: string; date: string; createdAt: string; kcal: number } | null;
  planName: string | null;
};

export type Template = { id: string; name: string; goal: string; kcal: number; description: string | null; meals: PlanMeal[] };
export type Recipe = { id: string; name: string; servings: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number; tags: string[]; ingredients: { aliment: string; quantite: string }[] };

export async function getNutritionOverview(supabase: Supabase): Promise<{ today: string; rows: OverviewRow[] }> {
  const today = todayIso();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, goal, weight_kg, food_exclusions, profiles!clients_profile_id_fkey(full_name, initials)")
    .eq("status", "actif");
  if (error) throw new Error("Impossible de charger les coachés : " + error.message);
  const ids = (clients ?? []).map((c) => c.id);
  if (!ids.length) return { today, rows: [] };

  const since = addDays(today, -30);
  const [goalsRes, entriesRes, sessionsRes, plansRes] = await Promise.all([
    supabase.from("nutrition_goals").select("client_id, day_type, kcal, protein_g, carbs_g, fat_g").in("client_id", ids),
    supabase
      .from("food_log_entries")
      .select("client_id, date, meal, label, kcal, created_at, foods(name), recipes(name)")
      .in("client_id", ids)
      .gte("date", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("client_sessions").select("client_id").in("client_id", ids).in("status", ["planned", "done"]).eq("date", today),
    supabase.from("client_meal_plans").select("client_id, name, created_at").in("client_id", ids).eq("active", true).order("created_at", { ascending: false }),
  ]);
  for (const r of [goalsRes, entriesRes, sessionsRes, plansRes]) {
    if (r.error) throw new Error("Impossible de charger la nutrition : " + r.error.message);
  }
  const training = new Set((sessionsRes.data ?? []).map((s) => s.client_id));

  const rows: OverviewRow[] = (clients ?? []).map((c) => {
    const profile = one(c.profiles as unknown as ProfileName | ProfileName[] | null);
    const goals = toGoals((goalsRes.data ?? []).filter((g) => g.client_id === c.id));
    const dayType: DayType = training.has(c.id) ? "training" : "rest";
    const mine = (entriesRes.data ?? []).filter((e) => e.client_id === c.id);
    const lastRaw = mine[0];
    const lastFood = lastRaw ? one(lastRaw.foods as unknown as { name: string } | { name: string }[] | null) : null;
    const lastRecipe = lastRaw ? one(lastRaw.recipes as unknown as { name: string } | { name: string }[] | null) : null;
    return {
      id: c.id,
      fullName: profile?.full_name ?? "Coaché",
      initials: profile?.initials ?? "?",
      goal: c.goal ?? null,
      weightKg: c.weight_kg == null ? null : Number(c.weight_kg),
      exclusions: c.food_exclusions ?? [],
      dayType,
      kcalToday: mine.filter((e) => e.date === today).reduce((s, e) => s + num(e.kcal), 0),
      target: goals[dayType]?.kcal ?? null,
      last: lastRaw
        ? { meal: lastRaw.meal, name: lastRecipe?.name ?? lastFood?.name ?? lastRaw.label ?? "Aliment", date: lastRaw.date, createdAt: lastRaw.created_at, kcal: num(lastRaw.kcal) }
        : null,
      planName: (plansRes.data ?? []).find((p) => p.client_id === c.id)?.name ?? null,
    };
  });
  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
  return { today, rows };
}

/** Plans types du coach connecté (la lecture est ouverte : on filtre sur coach_id). */
export async function listTemplates(supabase: Supabase, coachId: string): Promise<Template[]> {
  const { data, error } = await supabase
    .from("meal_plan_templates")
    .select("id, name, goal, kcal_target, description, meals")
    .eq("coach_id", coachId)
    .order("name");
  if (error) throw new Error("Impossible de charger les plans types : " + error.message);
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, goal: t.goal, kcal: t.kcal_target, description: t.description, meals: parseMeals(t.meals) }));
}

export async function listRecipes(supabase: Supabase, coachId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, tags, ingredients")
    .eq("coach_id", coachId)
    .order("name");
  if (error) throw new Error("Impossible de charger les recettes : " + error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    servings: r.servings,
    kcal: r.kcal_per_serving,
    protein_g: num(r.protein_g),
    carbs_g: num(r.carbs_g),
    fat_g: num(r.fat_g),
    tags: r.tags ?? [],
    ingredients: Array.isArray(r.ingredients)
      ? (r.ingredients as unknown[]).map((i) => {
          const o = (i ?? {}) as Record<string, unknown>;
          return { aliment: String(o.aliment ?? ""), quantite: String(o.quantite ?? "") };
        }).filter((i) => i.aliment)
      : [],
  }));
}
