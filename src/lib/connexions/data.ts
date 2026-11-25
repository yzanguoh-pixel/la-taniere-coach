import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { COACH_KEYS, COACH_VISIBLE_DEVICES, COACHE_KEYS, type CoachProvider, type CoacheProvider } from "./providers";

/**
 * Lectures des connexions simulées (US35).
 * Règle Strava : une activité `source = 'strava'` n'est JAMAIS renvoyée côté coach.
 * Double barrière : filtre applicatif ici (forCoach) + RLS de la migration 0019 (le coach ne peut ni lire
 * ni écrire une ligne Strava, même en appelant l'API directement).
 */

export type Supabase = SupabaseClient<Database>;

export async function connexionsSupabase(): Promise<Supabase | null> {
  return (await createSupabaseServerClient()) as unknown as Supabase | null;
}

export type WeightLog = { id: string; date: string; weightKg: number; source: string };
export type Activity = {
  id: string;
  date: string;
  type: string;
  durationMin: number | null;
  distanceKm: number | null;
  kcal: number | null;
  source: string;
  /** Vrai pour Strava : visible par la coachée seule. */
  private: boolean;
};

const num = (v: number | string | null): number | null => (v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Pesées d'un coaché (toutes sources : manuel, withings…), de la plus ancienne à la plus récente. */
export async function listWeights(clientId: string): Promise<WeightLog[]> {
  const supabase = await connexionsSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("weight_logs")
    .select("id, date, weight_kg, source")
    .eq("client_id", clientId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((w) => ({ id: w.id, date: w.date, weightKg: Number(w.weight_kg), source: w.source }));
}

/**
 * Activités d'un coaché, de la plus récente à la plus ancienne.
 * `forCoach: true` exclut TOUJOURS Strava (règles Strava), quelle que soit la RLS en place.
 */
export async function listActivities(clientId: string, opts: { forCoach: boolean; limit?: number }): Promise<Activity[]> {
  const supabase = await connexionsSupabase();
  if (!supabase) return [];
  let q = supabase
    .from("activities")
    .select("id, date, type, duration_min, distance_km, kcal, source")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.forCoach) q = q.neq("source", "strava");
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return data
    .filter((a) => !(opts.forCoach && a.source === "strava"))
    .map((a) => ({
      id: a.id,
      date: a.date,
      type: a.type,
      durationMin: a.duration_min,
      distanceKm: num(a.distance_km),
      kcal: a.kcal,
      source: a.source,
      private: a.source === "strava",
    }));
}

/* ---------------------------------------------------------------- écran coaché */

export type IntegrationState = { status: "connected" | "disconnected"; connectedAt: string | null; lastSyncAt: string | null };

export type CoacheConnexions =
  | { state: "indisponible" }
  | {
      state: "ok";
      clientId: string;
      integrations: Record<CoacheProvider, IntegrationState>;
      counts: { withings: number; garmin: number; strava: number };
      stravaActivities: Activity[];
    };

const EMPTY: IntegrationState = { status: "disconnected", connectedAt: null, lastSyncAt: null };

export async function getCoacheConnexions(): Promise<CoacheConnexions> {
  const supabase = await connexionsSupabase();
  if (!supabase) return { state: "indisponible" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "indisponible" };
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
  if (!client) return { state: "indisponible" };

  const [{ data: rows }, { data: weights }, activities] = await Promise.all([
    supabase.from("integrations").select("provider, status, connected_at, last_sync_at").eq("user_id", user.id).in("provider", COACHE_KEYS),
    supabase.from("weight_logs").select("id").eq("client_id", client.id).eq("source", "withings"),
    listActivities(client.id, { forCoach: false }),
  ]);

  const integrations = Object.fromEntries(COACHE_KEYS.map((k) => [k, EMPTY])) as Record<CoacheProvider, IntegrationState>;
  for (const r of rows ?? []) {
    integrations[r.provider as CoacheProvider] = {
      status: r.status === "connected" ? "connected" : "disconnected",
      connectedAt: r.connected_at,
      lastSyncAt: r.last_sync_at,
    };
  }
  const strava = activities.filter((a) => a.source === "strava");
  return {
    state: "ok",
    clientId: client.id,
    integrations,
    counts: { withings: weights?.length ?? 0, garmin: activities.filter((a) => a.source === "garmin").length, strava: strava.length },
    stravaActivities: strava,
  };
}

/* ---------------------------------------------------------------- écran coach */

export type CoachedDevices = {
  clientId: string;
  name: string;
  devices: Record<(typeof COACH_VISIBLE_DEVICES)[number], IntegrationState>;
};

export type CoachConnexions =
  | { state: "indisponible" }
  | { state: "ok"; integrations: Record<CoachProvider, IntegrationState>; coached: CoachedDevices[] };

export async function getCoachConnexions(): Promise<CoachConnexions> {
  const supabase = await connexionsSupabase();
  if (!supabase) return { state: "indisponible" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "indisponible" };

  const [{ data: own }, { data: clients }] = await Promise.all([
    supabase.from("integrations").select("provider, status, connected_at, last_sync_at").eq("user_id", user.id).in("provider", COACH_KEYS),
    supabase.from("clients").select("id, profile_id, profiles!clients_profile_id_fkey ( full_name )").eq("coach_id", user.id),
  ]);

  const integrations = Object.fromEntries(COACH_KEYS.map((k) => [k, EMPTY])) as Record<CoachProvider, IntegrationState>;
  for (const r of own ?? []) {
    integrations[r.provider as CoachProvider] = {
      status: r.status === "connected" ? "connected" : "disconnected",
      connectedAt: r.connected_at,
      lastSyncAt: r.last_sync_at,
    };
  }

  type RawClient = { id: string; profile_id: string | null; profiles: { full_name: string | null } | null };
  const list = (clients ?? []) as unknown as RawClient[];
  const profileIds = list.map((c) => c.profile_id).filter((x): x is string => !!x);

  // Jamais Strava : on ne demande que Withings et Garmin (et la RLS integrations_coach_read exclut Strava).
  const { data: devices } = profileIds.length
    ? await supabase
        .from("integrations")
        .select("user_id, provider, status, connected_at, last_sync_at")
        .in("user_id", profileIds)
        .in("provider", [...COACH_VISIBLE_DEVICES])
    : { data: [] as { user_id: string; provider: string; status: string; connected_at: string | null; last_sync_at: string | null }[] };

  const coached: CoachedDevices[] = list
    .filter((c) => c.profile_id)
    .map((c) => {
      const mine = (devices ?? []).filter((d) => d.user_id === c.profile_id);
      const state = (p: string): IntegrationState => {
        const d = mine.find((x) => x.provider === p);
        return d ? { status: d.status === "connected" ? "connected" : "disconnected", connectedAt: d.connected_at, lastSyncAt: d.last_sync_at } : EMPTY;
      };
      return { clientId: c.id, name: c.profiles?.full_name ?? "Coaché", devices: { withings: state("withings"), garmin: state("garmin") } };
    })
    .sort((a, b) => Number(b.devices.withings.status === "connected" || b.devices.garmin.status === "connected") - Number(a.devices.withings.status === "connected" || a.devices.garmin.status === "connected") || a.name.localeCompare(b.name, "fr"));

  return { state: "ok", integrations, coached };
}
