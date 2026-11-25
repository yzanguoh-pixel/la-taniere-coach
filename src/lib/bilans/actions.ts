"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { bilansSupabase, getBilan, UUID } from "./data";
import { adaptationsOf, buildSummary, readAnswers, type PhysicalTests } from "./synthese";

/** Server Actions de l'écran Bilan (US09, US10, US11). Écritures via la RLS (intake_coach_all) ou la fonction convert_prospect. */

export type BilanState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function requireCoach() {
  const supabase = await bilansSupabase();
  if (!supabase) return { error: "La base de données n’est pas configurée." } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnecte-toi." } as const;
  return { supabase, user } as const;
}

function revalidateBilan(bookingId: string) {
  revalidatePath(`/coach/bilans/${bookingId}`);
  revalidatePath("/coach/agenda");
}

/** US09 — Enregistre la synthèse (recalculée côté serveur à partir des réponses, des tests et des modèles). */
export async function saveSummary(_prev: BilanState, formData: FormData): Promise<BilanState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!UUID.test(bookingId)) return { status: "error", message: "Bilan introuvable." };
  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const bilan = await getBilan(auth.supabase, bookingId, auth.user.id);
  if (!bilan || !bilan.intakeId) return { status: "error", message: "Questionnaire introuvable." };
  if (!bilan.answers) return { status: "error", message: "Le questionnaire n’a pas encore été rempli." };

  const summary = buildSummary(bilan.answers, bilan.templates, bilan.tests);
  const { error } = await auth.supabase
    .from("intake_forms")
    .update({ summary: summary as unknown as Json })
    .eq("id", bilan.intakeId);
  if (error) return { status: "error", message: "La synthèse n’a pas pu être enregistrée. Réessaie." };
  revalidateBilan(bookingId);
  return { status: "ok", message: "Synthèse enregistrée." };
}

/** Bornes des tests physiques (US10). */
const TEST_FIELDS: { key: keyof Omit<PhysicalTests, "saved_at">; label: string; min: number; max: number; decimals: boolean }[] = [
  { key: "poids_kg", label: "Le poids", min: 30, max: 250, decimals: true },
  { key: "pompes_max", label: "Le nombre de pompes", min: 0, max: 150, decimals: false },
  { key: "gainage_s", label: "Le gainage", min: 0, max: 600, decimals: false },
  { key: "squats_1min", label: "Le nombre de squats", min: 0, max: 120, decimals: false },
  { key: "souplesse_cm", label: "La souplesse", min: -40, max: 40, decimals: false },
];

/** US10 — Enregistre les tests physiques saisis pendant le bilan. */
export async function saveTests(_prev: BilanState, formData: FormData): Promise<BilanState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!UUID.test(bookingId)) return { status: "error", message: "Bilan introuvable." };

  const fieldErrors: Record<string, string> = {};
  const tests: PhysicalTests = {};
  for (const f of TEST_FIELDS) {
    const raw = String(formData.get(f.key) ?? "")
      .trim()
      .replace(",", ".")
      .replace(/^−/, "-");
    if (!raw) {
      tests[f.key] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      fieldErrors[f.key] = "Saisis un nombre.";
    } else if (!f.decimals && !Number.isInteger(n)) {
      fieldErrors[f.key] = "Saisis un nombre entier.";
    } else if (n < f.min || n > f.max) {
      fieldErrors[f.key] = `${f.label} doit être entre ${String(f.min).replace("-", "−")} et ${f.max}.`;
    } else {
      tests[f.key] = f.decimals ? Math.round(n * 10) / 10 : n;
    }
  }
  if (Object.keys(fieldErrors).length) return { status: "error", fieldErrors, message: "Corrige les champs signalés." };
  if (TEST_FIELDS.every((f) => tests[f.key] == null)) {
    return { status: "error", message: "Saisis au moins un test avant d’enregistrer." };
  }

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const bilan = await getBilan(auth.supabase, bookingId, auth.user.id);
  if (!bilan || !bilan.intakeId) return { status: "error", message: "Questionnaire introuvable." };
  if (bilan.convertedClientId) return { status: "error", message: "Ce prospect est déjà converti : les tests ne sont plus modifiables ici." };

  const { error } = await auth.supabase
    .from("intake_forms")
    .update({ tests: { ...tests, saved_at: new Date().toISOString() } as unknown as Json })
    .eq("id", bilan.intakeId);
  if (error) return { status: "error", message: "Les tests n’ont pas pu être enregistrés. Réessaie." };
  revalidateBilan(bookingId);
  return { status: "ok", message: "Tests enregistrés." };
}

type RpcClient = {
  rpc: (fn: "convert_prospect", args: { p_booking_id: string; p_template_id: string; p_adaptations: Json }) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * US11 — « Convertir en coachée » : enregistre la synthèse, appelle convert_prospect (compte, profil, client,
 * copie du modèle avec adaptations, booking « converti »), puis redirige vers l'éditeur du programme.
 */
export async function convertProspect(_prev: BilanState, formData: FormData): Promise<BilanState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!UUID.test(bookingId)) return { status: "error", message: "Bilan introuvable." };
  if (!UUID.test(templateId)) return { status: "error", fieldErrors: { templateId: "Choisis un modèle de départ." } };

  const auth = await requireCoach();
  if ("error" in auth) return { status: "error", message: auth.error };
  const bilan = await getBilan(auth.supabase, bookingId, auth.user.id);
  if (!bilan || !bilan.intakeId) return { status: "error", message: "Bilan introuvable." };
  if (bilan.convertedClientId || bilan.status === "converti") return { status: "error", message: "Ce prospect a déjà été converti." };
  if (bilan.status === "annule") return { status: "error", message: "Ce bilan a été annulé." };
  if (!bilan.templates.some((t) => t.id === templateId)) return { status: "error", fieldErrors: { templateId: "Ce modèle n’est pas dans ta bibliothèque." } };

  // Adaptations : uniquement celles déduites côté serveur et cochées par le coach.
  const allowed = adaptationsOf(readAnswers(bilan.answers), bilan.tests);
  const chosen = new Set(formData.getAll("adaptation").map(String));
  const adaptations = allowed.filter((a) => chosen.has(a));

  // La synthèse est figée au moment de la conversion.
  const summary = buildSummary(bilan.answers, bilan.templates, bilan.tests);
  await auth.supabase
    .from("intake_forms")
    .update({ summary: summary as unknown as Json })
    .eq("id", bilan.intakeId);

  const { data, error } = await (auth.supabase as unknown as RpcClient).rpc("convert_prospect", {
    p_booking_id: bookingId,
    p_template_id: templateId,
    p_adaptations: adaptations,
  });
  if (error || typeof data !== "string") {
    const known = error?.message && /déjà|introuvable|annulé|existe|séance|Réservé/.test(error.message) ? error.message : null;
    return { status: "error", message: known ?? "La conversion a échoué : rien n’a été créé. Réessaie." };
  }

  revalidateBilan(bookingId);
  revalidatePath("/coach");
  revalidatePath("/coach/coaches");
  revalidatePath(`/coach/programmes/${data}`);
  redirect(`/coach/programmes/${data}`);
}
