"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { todayIso } from "@/lib/coache/format";
import { getActivePlan, getDayType, getNutritionMe, getShopping } from "./data";
import { MEAL_AU, foodMacros, isJournalDate, isMeal, missingFromList, readPlanMeals, recipeMacros } from "./format";

/** Écritures nutrition du coaché (Server Actions). La RLS limite chaque écriture aux lignes du coaché connecté. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: number | string | null | undefined) => (v == null || v === "" ? 0 : Number(v) || 0);

function parseQuantity(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : NaN;
}

/* ---------------------------------------------------------------- ajouter un aliment ou une recette */

export type AddEntryState = {
  errors?: { item?: string; meal?: string; quantity?: string; form?: string };
};

export async function addFoodEntry(_prev: AddEntryState, formData: FormData): Promise<AddEntryState> {
  const me = await getNutritionMe();
  if (!me) return { errors: { form: "Ta session a expiré. Reconnecte-toi." } };

  const kind = String(formData.get("kind") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const meal = String(formData.get("meal") ?? "");
  const quantity = parseQuantity(formData.get("quantity"));
  const today = todayIso();
  const rawDate = String(formData.get("date") ?? "");
  const date = isJournalDate(rawDate, today) ? rawDate : today;

  const errors: NonNullable<AddEntryState["errors"]> = {};
  const isRecipe = kind === "recipe";
  if ((kind !== "food" && kind !== "recipe") || !UUID.test(itemId)) errors.item = isRecipe ? "Choisis une recette." : "Choisis un aliment dans la liste.";
  if (!isMeal(meal)) errors.meal = "Choisis le repas.";
  if (isRecipe) {
    if (quantity === null || Number.isNaN(quantity) || quantity < 0.25 || quantity > 20) errors.quantity = "Indique un nombre de portions entre 0,25 et 20.";
  } else if (quantity === null || Number.isNaN(quantity) || quantity < 1 || quantity > 3000) {
    errors.quantity = "Indique une quantité entre 1 et 3 000 g.";
  }
  if (Object.keys(errors).length) return { errors };

  // Les apports sont recalculés ici depuis la base : on ne fait pas confiance aux valeurs affichées côté navigateur.
  let name = "";
  let values;
  if (isRecipe) {
    const { data: r } = await me.supabase.from("recipes").select("id, name, kcal_per_serving, protein_g, carbs_g, fat_g").eq("id", itemId).maybeSingle();
    if (!r) return { errors: { item: "Cette recette n’existe plus. Choisis-en une autre." } };
    name = r.name;
    values = recipeMacros({ kcal: num(r.kcal_per_serving), protein: num(r.protein_g), carbs: num(r.carbs_g), fat: num(r.fat_g) }, quantity!);
  } else {
    const { data: f } = await me.supabase.from("foods").select("id, name, kcal, protein_g, carbs_g, fat_g").eq("id", itemId).maybeSingle();
    if (!f) return { errors: { item: "Cet aliment n’existe plus. Choisis-en un autre." } };
    name = f.name;
    values = foodMacros({ kcal: num(f.kcal), protein: num(f.protein_g), carbs: num(f.carbs_g), fat: num(f.fat_g) }, quantity!);
  }

  const { error } = await me.supabase.from("food_log_entries").insert({
    client_id: me.clientId,
    date,
    meal,
    food_id: isRecipe ? null : itemId,
    recipe_id: isRecipe ? itemId : null,
    quantity: Math.round(quantity! * 10) / 10,
    kcal: values.kcal,
    protein_g: values.protein,
    carbs_g: values.carbs,
    fat_g: values.fat,
  });
  if (error) {
    console.error("addFoodEntry", error);
    return { errors: { form: "L’aliment n’a pas pu être ajouté. Réessaie." } };
  }

  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  const qty = isRecipe
    ? `${quantity!.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${quantity! > 1 ? "portions" : "portion"}`
    : `${quantity!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} g`;
  const kcal = Math.round(values.kcal).toLocaleString("fr-FR");
  const q = new URLSearchParams({ date, ajout: `Ajouté ${MEAL_AU[meal as keyof typeof MEAL_AU]} : ${name}, ${qty} (${kcal} kcal).` });
  redirect(`/app/nutrition?${q.toString()}`);
}

/* ---------------------------------------------------------------- compléments du jour */

export async function toggleSupplement(supplementId: string, date: string, taken: boolean): Promise<{ ok: boolean }> {
  if (!UUID.test(supplementId) || typeof taken !== "boolean") return { ok: false };
  const me = await getNutritionMe();
  if (!me) return { ok: false };
  if (!isJournalDate(date, todayIso())) return { ok: false };

  // Le complément doit appartenir au coaché (la RLS ne laisse lire que les siens).
  const { data: sup } = await me.supabase.from("supplements").select("id").eq("id", supplementId).eq("client_id", me.clientId).maybeSingle();
  if (!sup) return { ok: false };

  // Écriture idempotente : cocher deux fois ne crée pas de doublon (contrainte unique supplement_id + date).
  const { error } = taken
    ? await me.supabase.from("supplement_intakes").insert({ supplement_id: supplementId, client_id: me.clientId, date })
    : await me.supabase.from("supplement_intakes").delete().eq("supplement_id", supplementId).eq("client_id", me.clientId).eq("date", date);
  if (error && error.code !== "23505") {
    console.error("toggleSupplement", error);
    return { ok: false };
  }
  revalidatePath("/app/nutrition");
  return { ok: true };
}

/* ---------------------------------------------------------------- liste de courses */

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<{ ok: boolean }> {
  if (!UUID.test(itemId) || typeof checked !== "boolean") return { ok: false };
  const me = await getNutritionMe();
  if (!me) return { ok: false };
  const { data, error } = await me.supabase.from("shopping_items").update({ checked }).eq("id", itemId).eq("client_id", me.clientId).select("id");
  if (error || !data?.length) return { ok: false };
  revalidatePath("/app/nutrition/plan");
  return { ok: true };
}

export type GenerateState = { message?: string; error?: string };

/** Ajoute à la liste les aliments du plan (pour le type de jour affiché) qui n'y sont pas encore. */
export async function generateShoppingFromPlan(dayParam: string): Promise<GenerateState> {
  const me = await getNutritionMe();
  if (!me) return { error: "Ta session a expiré. Reconnecte-toi." };
  const plan = await getActivePlan(me);
  if (!plan) return { error: "Aucun plan alimentaire actif : demande-le à ton coach." };

  const dayType = dayParam === "entrainement" ? "training" : dayParam === "repos" ? "rest" : await getDayType(me, todayIso());
  const existing = await getShopping(me);
  const missing = missingFromList(
    readPlanMeals(plan.meals, dayType),
    existing.map((e) => e.name),
  );
  if (!missing.length) return { message: "Tout le plan est déjà dans ta liste." };

  const { error } = await me.supabase
    .from("shopping_items")
    .insert(missing.map((m) => ({ client_id: me.clientId, name: m.name, quantity: m.quantity, checked: false })));
  if (error) {
    console.error("generateShoppingFromPlan", error);
    return { error: "La liste n’a pas pu être complétée. Réessaie." };
  }
  revalidatePath("/app/nutrition/plan");
  return { message: missing.length === 1 ? "1 article ajouté à ta liste." : `${missing.length} articles ajoutés à ta liste.` };
}
