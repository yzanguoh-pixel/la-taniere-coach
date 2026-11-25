"use server";

import { revalidatePath } from "next/cache";
import { coachSupabase } from "@/lib/coach/supabase";
import { firstName } from "@/lib/coach/format";
import { isObjective, objectiveFromGoal, parseMeals, personalize } from "./rules";

/** Server Actions nutrition de l'espace coach. Écritures via la RLS existante (politiques *_coach_all / *_coach_write). */

export type NutritionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valeurs saisies, renvoyées pour reremplir le formulaire après une erreur. */
  values?: Record<string, string>;
  /** Change à chaque envoi : sert de clé pour remonter le formulaire avec les bonnes valeurs. */
  stamp?: number;
  href?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireCoach() {
  const supabase = await coachSupabase();
  if (!supabase) return { error: "Supabase n’est pas configuré." } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnecte-toi." } as const;
  return { supabase, user } as const;
}

function revalidateNutrition(clientId?: string) {
  revalidatePath("/coach/nutrition");
  if (clientId) revalidatePath(`/coach/coaches/${clientId}/nutrition`);
  revalidatePath("/app/nutrition");
}

/* ------------------------------------------------------------------ US25 objectifs par type de jour */

const FIELDS = [
  { key: "kcal", label: "Les calories", min: 800, max: 6000, unit: "kcal" },
  { key: "protein_g", label: "Les protéines", min: 0, max: 400, unit: "g" },
  { key: "carbs_g", label: "Les glucides", min: 0, max: 900, unit: "g" },
  { key: "fat_g", label: "Les lipides", min: 0, max: 300, unit: "g" },
] as const;
const DAY_TYPES = ["training", "rest"] as const;

export async function saveGoals(_prev: NutritionState, formData: FormData): Promise<NutritionState> {
  const stamp = Date.now();
  const clientId = String(formData.get("clientId") ?? "");
  if (!UUID.test(clientId)) return { status: "error", message: "Coaché introuvable.", stamp };

  const values: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};
  const rows: { client_id: string; day_type: "training" | "rest"; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];

  for (const dt of DAY_TYPES) {
    const row = { client_id: clientId, day_type: dt, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    for (const f of FIELDS) {
      const name = `${dt}.${f.key}`;
      const raw = String(formData.get(name) ?? "").trim().replace(/\s/g, "").replace(",", ".");
      values[name] = raw;
      if (raw === "") {
        fieldErrors[name] = `${f.label} sont obligatoires.`;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) fieldErrors[name] = "Saisis un nombre entier.";
      else if (n < f.min || n > f.max) fieldErrors[name] = `Entre ${f.min.toLocaleString("fr-FR")} et ${f.max.toLocaleString("fr-FR")} ${f.unit}.`;
      else row[f.key] = n;
    }
    rows.push(row);
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Corrige les champs signalés.", fieldErrors, values, stamp };
  }

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error, values, stamp };
  const { error } = await auth.supabase.from("nutrition_goals").upsert(rows, { onConflict: "client_id,day_type" }).select("id");
  if (error) return { status: "error", message: "Enregistrement impossible : " + error.message, values, stamp };

  revalidateNutrition(clientId);
  return { status: "ok", message: "Objectifs enregistrés. Ils s’affichent dans l’espace Nutrition du coaché.", values, stamp };
}

/* ------------------------------------------------------------------ US26 commentaire sur une entrée du journal */

export async function saveComment(_prev: NutritionState, formData: FormData): Promise<NutritionState> {
  const stamp = Date.now();
  const clientId = String(formData.get("clientId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const remove = formData.get("intent") === "remove";
  const comment = String(formData.get("comment") ?? "").trim();
  if (!UUID.test(clientId) || !UUID.test(entryId)) return { status: "error", message: "Entrée introuvable.", stamp };
  if (!remove) {
    if (!comment) return { status: "error", fieldErrors: { comment: "Écris ton commentaire avant de l’enregistrer." }, values: { comment }, stamp };
    if (comment.length > 500) return { status: "error", fieldErrors: { comment: `500 caractères au maximum (actuellement ${comment.length}).` }, values: { comment }, stamp };
  }

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error, values: { comment }, stamp };
  const { data, error } = await auth.supabase
    .from("food_log_entries")
    .update({ coach_comment: remove ? null : comment })
    .eq("id", entryId)
    .eq("client_id", clientId)
    .select("id");
  if (error) return { status: "error", message: "Enregistrement impossible : " + error.message, values: { comment }, stamp };
  if (!data?.length) return { status: "error", message: "Cette entrée n’existe plus ou n’appartient pas à un de tes coachés.", stamp };

  revalidateNutrition(clientId);
  return { status: "ok", message: remove ? "Commentaire retiré." : "Commentaire enregistré, visible par le coaché.", values: { comment: remove ? "" : comment }, stamp };
}

/* ------------------------------------------------------------------ US27 « Personnaliser pour… » */

export async function personalizePlan(_prev: NutritionState, formData: FormData): Promise<NutritionState> {
  const stamp = Date.now();
  const templateId = String(formData.get("templateId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const objectiveRaw = String(formData.get("objective") ?? "");
  const values = { clientId, objective: objectiveRaw };
  const fieldErrors: Record<string, string> = {};
  if (!UUID.test(templateId)) return { status: "error", message: "Plan type introuvable.", stamp };
  if (!UUID.test(clientId)) fieldErrors.clientId = "Choisis le coaché pour qui personnaliser ce plan.";
  if (objectiveRaw && objectiveRaw !== "auto" && !isObjective(objectiveRaw)) fieldErrors.objective = "Objectif invalide.";
  if (Object.keys(fieldErrors).length) return { status: "error", fieldErrors, values, stamp };

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error, values, stamp };
  const { supabase, user } = auth;

  const [tplRes, clientRes] = await Promise.all([
    supabase.from("meal_plan_templates").select("id, name, kcal_target, meals").eq("id", templateId).eq("coach_id", user.id).maybeSingle(),
    supabase.from("clients").select("id, goal, weight_kg, food_exclusions, profiles!clients_profile_id_fkey(full_name)").eq("id", clientId).eq("coach_id", user.id).maybeSingle(),
  ]);
  if (tplRes.error || clientRes.error) return { status: "error", message: "Lecture impossible : " + (tplRes.error ?? clientRes.error)?.message, values, stamp };
  const tpl = tplRes.data;
  const client = clientRes.data;
  if (!tpl) return { status: "error", message: "Ce plan type n’existe plus.", values, stamp };
  if (!client) return { status: "error", fieldErrors: { clientId: "Ce coaché n’existe pas ou n’est pas suivi par toi." }, values, stamp };

  const profile = Array.isArray(client.profiles) ? client.profiles[0] : client.profiles;
  const name = firstName((profile as { full_name?: string } | null)?.full_name ?? "Coaché");
  const objective = isObjective(objectiveRaw) ? objectiveRaw : objectiveFromGoal(client.goal);
  const result = personalize({
    templateKcal: tpl.kcal_target,
    meals: parseMeals(tpl.meals),
    weightKg: client.weight_kg == null ? null : Number(client.weight_kg),
    objective,
    exclusions: client.food_exclusions ?? [],
  });

  const { data: created, error: insertError } = await supabase
    .from("client_meal_plans")
    .insert({ client_id: client.id, template_id: tpl.id, name: `${tpl.name} — ${name}`, adaptations: result.adaptations, kcal_target: result.kcal, meals: result.meals, active: true })
    .select("id")
    .single();
  if (insertError || !created) return { status: "error", message: "Création impossible : " + (insertError?.message ?? "erreur inconnue"), values, stamp };

  // Un seul plan actif par coaché : les précédents restent en historique, désactivés.
  const { error: offError } = await supabase.from("client_meal_plans").update({ active: false }).eq("client_id", client.id).eq("active", true).neq("id", created.id);
  if (offError) return { status: "error", message: "Plan créé, mais l’ancien plan n’a pas pu être désactivé : " + offError.message, values, stamp };

  revalidateNutrition(client.id);
  return {
    status: "ok",
    message: `Plan « ${tpl.name} » personnalisé pour ${name} : ${result.kcal.toLocaleString("fr-FR")} kcal, ${result.adaptations.length} adaptation${result.adaptations.length > 1 ? "s" : ""}.`,
    href: `/coach/coaches/${client.id}/nutrition`,
    stamp,
  };
}
