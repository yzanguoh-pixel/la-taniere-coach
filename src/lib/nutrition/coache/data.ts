import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { todayIso } from "@/lib/coache/format";
import { MEALS, ZERO, addMacros, isJournalDate, readPlanMeals, shiftIso, type DayType, type Macros, type Meal, type PlanMeal } from "./format";

/** Lectures nutrition de l'espace coaché. La RLS limite le coaché à ses lignes ; on filtre aussi par client_id. */

export type Supabase = SupabaseClient<Database>;

export type NutritionMe = { supabase: Supabase; userId: string; clientId: string; coachFirstName: string };

const firstWord = (s: string | null | undefined, fallback: string) => (s ?? "").trim().split(/\s+/)[0] || fallback;
const n = (v: number | string | null | undefined) => (v == null || v === "" ? 0 : Number(v) || 0);

/** Client typé + fiche coaché de l'utilisateur connecté. */
export async function getNutritionMe(): Promise<NutritionMe | null> {
  const supabase = (await createSupabaseServerClient()) as unknown as Supabase | null;
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("coach_id").eq("id", user.id).maybeSingle(),
  ]);
  if (!client) return null;
  let coachFirstName = "ton coach";
  if (profile?.coach_id) {
    const { data: coach } = await supabase.from("profiles").select("full_name").eq("id", profile.coach_id).maybeSingle();
    coachFirstName = firstWord(coach?.full_name, coachFirstName);
  }
  return { supabase, userId: user.id, clientId: client.id, coachFirstName };
}

/** Jour d'entraînement si une séance (non sautée) du programme actif tombe ce jour-là. */
export async function getDayType(me: NutritionMe, date: string): Promise<DayType> {
  const { count } = await me.supabase
    .from("client_sessions")
    .select("id, client_programs!inner ( active )", { count: "exact", head: true })
    .eq("client_id", me.clientId)
    .eq("date", date)
    .neq("status", "skipped")
    .eq("client_programs.active", true);
  return count ? "training" : "rest";
}

export type Goals = Record<DayType, Macros | null>;

export async function getGoals(me: NutritionMe): Promise<Goals> {
  const { data } = await me.supabase.from("nutrition_goals").select("day_type, kcal, protein_g, carbs_g, fat_g").eq("client_id", me.clientId);
  const goals: Goals = { training: null, rest: null };
  for (const g of data ?? []) {
    if (g.day_type === "training" || g.day_type === "rest") {
      goals[g.day_type] = { kcal: n(g.kcal), protein: n(g.protein_g), carbs: n(g.carbs_g), fat: n(g.fat_g) };
    }
  }
  return goals;
}

/* ---------------------------------------------------------------- journal */

export type JournalEntry = {
  id: string;
  name: string;
  quantityLabel: string;
  macros: Macros;
  coachComment: string | null;
};
export type JournalMeal = { meal: Meal; entries: JournalEntry[]; total: Macros };
export type Supplement = { id: string; name: string; dose: string | null; timing: string | null; taken: boolean };

export type Journal = {
  date: string;
  today: string;
  /** Vrai si on affiche le dernier jour noté car rien n'est encore noté aujourd'hui. */
  fallback: boolean;
  dayType: DayType;
  goal: Macros | null;
  total: Macros;
  meals: JournalMeal[];
  supplements: Supplement[];
  coachFirstName: string;
};

type RawEntry = {
  id: string;
  meal: string;
  quantity: number | string;
  kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  label: string | null;
  coach_comment: string | null;
  created_at: string;
  foods: { name: string; brand: string | null } | null;
  recipes: { name: string } | null;
};

function quantityLabel(e: RawEntry): string {
  const q = n(e.quantity);
  const s = q.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (e.recipes) return `${s} ${q > 1 ? "portions" : "portion"}`;
  if (e.foods) return `${s} g`;
  return "";
}

/**
 * Journal d'un jour. Sans date demandée : aujourd'hui, ou le dernier jour noté de la semaine écoulée
 * si rien n'est encore noté aujourd'hui (l'écran l'indique).
 */
export async function getJournal(requested: string | undefined): Promise<Journal | null> {
  const me = await getNutritionMe();
  if (!me) return null;
  const today = todayIso();
  let date = isJournalDate(requested, today) ? requested : today;
  let fallback = false;

  if (!isJournalDate(requested, today)) {
    const { count } = await me.supabase.from("food_log_entries").select("id", { count: "exact", head: true }).eq("client_id", me.clientId).eq("date", today);
    if (!count) {
      const { data: last } = await me.supabase
        .from("food_log_entries")
        .select("date")
        .eq("client_id", me.clientId)
        .lt("date", today)
        .gte("date", shiftIso(today, -7))
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.date) {
        date = last.date;
        fallback = true;
      }
    }
  }

  const [dayType, goals, entriesRes, supRes, intakeRes] = await Promise.all([
    getDayType(me, date),
    getGoals(me),
    me.supabase
      .from("food_log_entries")
      .select("id, meal, quantity, kcal, protein_g, carbs_g, fat_g, label, coach_comment, created_at, foods ( name, brand ), recipes ( name )")
      .eq("client_id", me.clientId)
      .eq("date", date)
      .order("created_at", { ascending: true }),
    me.supabase.from("supplements").select("id, name, dose, timing").eq("client_id", me.clientId).eq("active", true).order("created_at", { ascending: true }),
    me.supabase.from("supplement_intakes").select("supplement_id").eq("client_id", me.clientId).eq("date", date),
  ]);

  const raw = (entriesRes.data ?? []) as unknown as RawEntry[];
  const meals: JournalMeal[] = MEALS.map((meal) => {
    const entries = raw
      .filter((e) => e.meal === meal)
      .map((e) => ({
        id: e.id,
        name: e.recipes?.name ?? (e.foods ? [e.foods.name, e.foods.brand].filter(Boolean).join(" · ") : null) ?? e.label ?? "Aliment",
        quantityLabel: quantityLabel(e),
        macros: { kcal: n(e.kcal), protein: n(e.protein_g), carbs: n(e.carbs_g), fat: n(e.fat_g) },
        coachComment: e.coach_comment?.trim() || null,
      }));
    return { meal, entries, total: entries.reduce((t, e) => addMacros(t, e.macros), ZERO) };
  });
  const taken = new Set((intakeRes.data ?? []).map((i) => i.supplement_id));

  return {
    date,
    today,
    fallback,
    dayType,
    goal: goals[dayType] ?? goals.training ?? goals.rest,
    total: meals.reduce((t, m) => addMacros(t, m.total), ZERO),
    meals,
    supplements: (supRes.data ?? []).map((s) => ({ id: s.id, name: s.name, dose: s.dose, timing: s.timing, taken: taken.has(s.id) })),
    coachFirstName: me.coachFirstName,
  };
}

/* ---------------------------------------------------------------- ajout d'un aliment */

export type CatalogFood = { id: string; name: string; brand: string | null; category: string | null; per100: Macros };
export type CatalogRecipe = { id: string; name: string; servings: number; tags: string[]; perServing: Macros };

export async function getCatalog(): Promise<{ foods: CatalogFood[]; recipes: CatalogRecipe[] } | null> {
  const me = await getNutritionMe();
  if (!me) return null;
  const [foods, recipes] = await Promise.all([
    me.supabase.from("foods").select("id, name, brand, category, kcal, protein_g, carbs_g, fat_g").order("name").limit(2000),
    me.supabase.from("recipes").select("id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, tags").order("name").limit(500),
  ]);
  return {
    foods: (foods.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      brand: f.brand,
      category: f.category,
      per100: { kcal: n(f.kcal), protein: n(f.protein_g), carbs: n(f.carbs_g), fat: n(f.fat_g) },
    })),
    recipes: (recipes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      servings: r.servings,
      tags: r.tags ?? [],
      perServing: { kcal: n(r.kcal_per_serving), protein: n(r.protein_g), carbs: n(r.carbs_g), fat: n(r.fat_g) },
    })),
  };
}

/* ---------------------------------------------------------------- plan du jour */

export type PlanRecipe = CatalogRecipe & { ingredients: { name: string; quantity: string }[] };
export type ShoppingItem = { id: string; name: string; quantity: string | null; checked: boolean };

export type PlanData = {
  today: string;
  todayType: DayType;
  dayType: DayType;
  goals: Goals;
  plan: { id: string; name: string; adaptations: string[]; kcalTarget: number; meals: PlanMeal[] } | null;
  recipes: PlanRecipe[];
  shopping: ShoppingItem[];
  coachFirstName: string;
};

export async function getActivePlan(me: NutritionMe) {
  const { data } = await me.supabase
    .from("client_meal_plans")
    .select("id, name, adaptations, kcal_target, meals")
    .eq("client_id", me.clientId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getShopping(me: NutritionMe): Promise<ShoppingItem[]> {
  const { data } = await me.supabase
    .from("shopping_items")
    .select("id, name, quantity, checked, created_at")
    .eq("client_id", me.clientId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, quantity: s.quantity, checked: s.checked }));
}

export async function getPlanData(requested: DayType | null): Promise<PlanData | null> {
  const me = await getNutritionMe();
  if (!me) return null;
  const today = todayIso();
  const [todayType, goals, plan, shopping, recipesRes] = await Promise.all([
    getDayType(me, today),
    getGoals(me),
    getActivePlan(me),
    getShopping(me),
    me.supabase.from("recipes").select("id, name, servings, kcal_per_serving, protein_g, carbs_g, fat_g, tags, ingredients").order("name").limit(500),
  ]);
  const dayType = requested ?? todayType;
  const recipes: PlanRecipe[] = (recipesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    servings: r.servings,
    tags: r.tags ?? [],
    perServing: { kcal: n(r.kcal_per_serving), protein: n(r.protein_g), carbs: n(r.carbs_g), fat: n(r.fat_g) },
    ingredients: Array.isArray(r.ingredients)
      ? (r.ingredients as { aliment?: unknown; quantite?: unknown }[])
          .filter((i) => i && typeof i === "object" && i.aliment)
          .map((i) => ({ name: String(i.aliment), quantity: i.quantite == null ? "" : String(i.quantite) }))
      : [],
  }));
  return {
    today,
    todayType,
    dayType,
    goals,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          adaptations: Array.isArray(plan.adaptations) ? (plan.adaptations as unknown[]).map(String) : [],
          kcalTarget: plan.kcal_target,
          meals: readPlanMeals(plan.meals, dayType),
        }
      : null,
    recipes,
    shopping,
    coachFirstName: me.coachFirstName,
  };
}
