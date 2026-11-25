"use server";

import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/database.types";
import { connexionsSupabase } from "./data";
import { COACH_KEYS, COACHE_KEYS, type CoacheProvider } from "./providers";

/**
 * Server Actions des connexions simulées (US35). Aucune API tierce n'est appelée.
 *
 * Connecter (coachée) : statut `connected`, `last_sync_at = now()`, puis données d'exemple
 *   - Withings → 6 pesées hebdomadaires sur 6 semaines dans `weight_logs` (source 'withings') ;
 *   - Garmin   → 5 activités dans `activities` (source 'garmin') ;
 *   - Strava   → 3 activités (source 'strava'), visibles par la coachée seule.
 *   Une reconnexion remplace les données d'exemple de la même source (pas de doublon).
 * Déconnecter (coachée) : statut `disconnected`.
 *   - Withings / Garmin : les données importées sont CONSERVÉES (historique du suivi, comme une vraie appli) ;
 *   - Strava : les activités importées sont SUPPRIMÉES (les règles de l'API Strava imposent l'effacement
 *     des données à la révocation de l'accès).
 * Toutes les écritures passent par la RLS : integrations_self, weight_logs_self_write, activities_self_write.
 */

export type ConnexionState = { status: "idle" | "ok" | "error"; message?: string };

const LABELS: Record<string, string> = {
  withings: "Withings",
  garmin: "Garmin",
  strava: "Strava",
  apple_sante: "Apple Santé",
  health_connect: "Health Connect",
  whoop: "Whoop",
  google_agenda: "Google Agenda",
  outlook: "Outlook",
  ics: "Le lien ICS",
  paiement: "Le paiement en ligne",
  notifications: "Les notifications",
};

function todayParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function context() {
  const supabase = await connexionsSupabase();
  if (!supabase) return { error: "Supabase n’est pas configuré." } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré. Reconnecte-toi." } as const;
  return { supabase, user } as const;
}

async function setStatus(provider: string, status: "connected" | "disconnected", scopes: Json) {
  const ctx = await context();
  if ("error" in ctx) return ctx;
  const now = new Date().toISOString();
  const { error } = await ctx.supabase.from("integrations").upsert(
    {
      user_id: ctx.user.id,
      provider,
      status,
      connected_at: status === "connected" ? now : null,
      last_sync_at: status === "connected" ? now : null,
      shared_scopes: scopes,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) return { error: "La connexion n’a pas pu être mise à jour. Réessaie." } as const;
  return ctx;
}

const SCOPES: Record<CoacheProvider, Json> = {
  withings: { donnees: ["poids"], visible_coach: true },
  garmin: { donnees: ["activites"], visible_coach: true },
  strava: { donnees: ["activites"], visible_coach: false },
  apple_sante: { donnees: [], visible_coach: false },
  health_connect: { donnees: [], visible_coach: false },
  whoop: { donnees: [], visible_coach: false },
};

/* ---------------------------------------------------------------- coachée */

export async function connectDevice(provider: string): Promise<ConnexionState> {
  if (!COACHE_KEYS.includes(provider as CoacheProvider)) return { status: "error", message: "Service inconnu." };
  const p = provider as CoacheProvider;
  const ctx = await setStatus(p, "connected", SCOPES[p]);
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { supabase, user } = ctx;

  let imported = "";
  if (p === "withings" || p === "garmin" || p === "strava") {
    const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
    if (!client) return { status: "error", message: "Ton dossier coaché est introuvable." };
    const today = todayParis();

    if (p === "withings") {
      const weights = [62.8, 62.6, 62.5, 62.3, 62.1, 61.9];
      await supabase.from("weight_logs").delete().eq("client_id", client.id).eq("source", "withings");
      const { error } = await supabase.from("weight_logs").insert(
        weights.map((w, i) => ({ client_id: client.id, date: addDays(today, -1 - 7 * (weights.length - 1 - i)), weight_kg: w, source: "withings" })),
      );
      if (error) return { status: "error", message: "Withings est connecté, mais l’import des pesées a échoué. Réessaie." };
      imported = " 6 pesées importées.";
    } else {
      const samples =
        p === "garmin"
          ? [
              { d: -1, type: "Course à pied", duration_min: 42, distance_km: 7.4, kcal: 410 },
              { d: -3, type: "Vélo", duration_min: 75, distance_km: 28.5, kcal: 620 },
              { d: -5, type: "Natation", duration_min: 35, distance_km: 1.5, kcal: 330 },
              { d: -8, type: "Course à pied", duration_min: 55, distance_km: 9.8, kcal: 540 },
              { d: -11, type: "Marche", duration_min: 60, distance_km: 5.2, kcal: 240 },
            ]
          : [
              { d: -2, type: "Trail", duration_min: 88, distance_km: 13.6, kcal: 890 },
              { d: -6, type: "Course à pied", duration_min: 38, distance_km: 6.5, kcal: 360 },
              { d: -9, type: "Sortie longue", duration_min: 110, distance_km: 18.2, kcal: 1120 },
            ];
      await supabase.from("activities").delete().eq("client_id", client.id).eq("source", p);
      const { error } = await supabase
        .from("activities")
        .insert(samples.map(({ d, ...a }) => ({ ...a, client_id: client.id, date: addDays(today, d), source: p })));
      if (error) return { status: "error", message: `${LABELS[p]} est connecté, mais l’import des activités a échoué. Réessaie.` };
      imported = p === "garmin" ? " 5 activités importées." : " 3 sorties importées, visibles par toi seule.";
    }
  }

  revalidatePath("/app/connexions");
  revalidatePath("/app/progression");
  revalidatePath("/coach/connexions");
  return { status: "ok", message: `${LABELS[p]} est connecté.${imported}` };
}

export async function disconnectDevice(provider: string): Promise<ConnexionState> {
  if (!COACHE_KEYS.includes(provider as CoacheProvider)) return { status: "error", message: "Service inconnu." };
  const p = provider as CoacheProvider;
  const ctx = await setStatus(p, "disconnected", SCOPES[p]);
  if ("error" in ctx) return { status: "error", message: ctx.error };

  let note = "";
  if (p === "strava") {
    const { data: client } = await ctx.supabase.from("clients").select("id").eq("profile_id", ctx.user.id).maybeSingle();
    if (client) {
      const { error } = await ctx.supabase.from("activities").delete().eq("client_id", client.id).eq("source", "strava");
      if (error) return { status: "error", message: "Strava est déconnecté, mais tes sorties n’ont pas pu être supprimées. Réessaie." };
    }
    note = " Tes sorties Strava ont été supprimées.";
  } else if (p === "withings" || p === "garmin") {
    note = " Les données déjà importées restent dans ton historique.";
  }

  revalidatePath("/app/connexions");
  revalidatePath("/app/progression");
  revalidatePath("/coach/connexions");
  return { status: "ok", message: `${LABELS[p]} est déconnecté.${note}` };
}

/** Relance une synchronisation simulée : met à jour l'heure de synchronisation. */
export async function syncNow(provider: string): Promise<ConnexionState> {
  if (![...COACHE_KEYS, ...COACH_KEYS].includes(provider as never)) return { status: "error", message: "Service inconnu." };
  const ctx = await context();
  if ("error" in ctx) return { status: "error", message: ctx.error };
  const { data, error } = await ctx.supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .eq("provider", provider)
    .eq("status", "connected")
    .select("id");
  if (error || !data?.length) return { status: "error", message: "Synchronisation impossible : le service n’est pas connecté." };
  revalidatePath("/app/connexions");
  revalidatePath("/coach/connexions");
  return { status: "ok", message: `${LABELS[provider]} : synchronisation terminée.` };
}

/* ---------------------------------------------------------------- coach */

export async function connectCoachService(provider: string): Promise<ConnexionState> {
  if (!COACH_KEYS.includes(provider as never)) return { status: "error", message: "Service inconnu." };
  const ctx = await setStatus(provider, "connected", { simule: true });
  if ("error" in ctx) return { status: "error", message: ctx.error };
  revalidatePath("/coach/connexions");
  return { status: "ok", message: `${LABELS[provider]} : connexion simulée active.` };
}

export async function disconnectCoachService(provider: string): Promise<ConnexionState> {
  if (!COACH_KEYS.includes(provider as never)) return { status: "error", message: "Service inconnu." };
  const ctx = await setStatus(provider, "disconnected", { simule: true });
  if ("error" in ctx) return { status: "error", message: ctx.error };
  revalidatePath("/coach/connexions");
  return { status: "ok", message: `${LABELS[provider]} : déconnecté.` };
}
