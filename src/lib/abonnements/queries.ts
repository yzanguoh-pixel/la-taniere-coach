import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { ProgSession } from "@/lib/progression/compute";
import { PRICE_PLACEHOLDER } from "./format";

/** Lectures des abonnements et factures. La RLS limite le coach à ses coachés et le coaché à ses propres lignes. */

export type Supabase = SupabaseClient<Database>;

export async function abonnementsSupabase(): Promise<Supabase | null> {
  return (await createSupabaseServerClient()) as unknown as Supabase | null;
}

export type SubscriptionRow = {
  id: string;
  clientId: string;
  fullName: string;
  initials: string;
  planName: string;
  priceEur: number | null;
  period: string;
  startsOn: string;
  renewsOn: string;
  status: string;
  /** Séances encadrées par semaine incluses dans la formule. */
  coachedPerWeek: number;
  /** Rythme total du coaché (clients.sessions_per_week) ; la différence se fait en autonomie. */
  sessionsPerWeek: number | null;
};

export type InvoiceRow = {
  id: string;
  subscriptionId: string;
  clientId: string;
  fullName: string;
  number: string;
  amountEur: number | null;
  issuedOn: string;
  status: string;
};

type Who = { full_name: string; initials: string | null } | null;
const who = (c: { profiles: Who } | null) => ({
  fullName: c?.profiles?.full_name ?? "Coaché",
  initials: c?.profiles?.initials ?? "?",
});
const num = (v: number | string | null) => (v === null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Valeur affichée tant que les tarifs ne sont pas fixés (app_config.prix_formules, « [PRIX] » par défaut). */
export async function getPricePlaceholder(supabase: Supabase): Promise<string> {
  const { data } = await supabase.from("app_config").select("value").eq("key", "prix_formules").maybeSingle();
  return data?.value?.trim() || PRICE_PLACEHOLDER;
}

/** Abonnements de tous les coachés visibles, triés par échéance. */
export async function listSubscriptions(supabase: Supabase): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, client_id, plan_name, price_eur, period, starts_on, renews_on, status, coached_per_week, clients(sessions_per_week, profiles!clients_profile_id_fkey(full_name, initials))")
    .order("renews_on", { ascending: true });
  if (error) throw new Error(`Lecture des abonnements impossible : ${error.message}`);
  return (data ?? []).map((s) => ({
    id: s.id,
    clientId: s.client_id,
    ...who(s.clients as unknown as { profiles: Who } | null),
    planName: s.plan_name,
    priceEur: num(s.price_eur),
    period: s.period,
    startsOn: s.starts_on,
    renewsOn: s.renews_on,
    status: s.status,
    coachedPerWeek: s.coached_per_week ?? 1,
    sessionsPerWeek: (s.clients as unknown as { sessions_per_week: number | null } | null)?.sessions_per_week ?? null,
  }));
}

/** Factures visibles, de la plus récente à la plus ancienne (filtrables par coaché). */
export async function listInvoices(supabase: Supabase, clientId?: string): Promise<InvoiceRow[]> {
  let q = supabase
    .from("invoices")
    .select("id, subscription_id, client_id, number, amount_eur, issued_on, status, created_at, clients(profiles!clients_profile_id_fkey(full_name, initials))")
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw new Error(`Lecture des factures impossible : ${error.message}`);
  return (data ?? []).map((f) => ({
    id: f.id,
    subscriptionId: f.subscription_id,
    clientId: f.client_id,
    fullName: who(f.clients as unknown as { profiles: Who } | null).fullName,
    number: f.number,
    amountEur: num(f.amount_eur),
    issuedOn: f.issued_on,
    status: f.status,
  }));
}

/** Derniers rappels envoyés, par abonnement (messages événement de type « rappel_abonnement »). */
export async function lastReminders(supabase: Supabase): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("messages")
    .select("payload, created_at")
    .eq("kind", "event")
    .eq("payload->>type", "rappel_abonnement")
    .order("created_at", { ascending: false })
    .limit(200);
  const out = new Map<string, string>();
  for (const m of data ?? []) {
    const p = m.payload as { subscription_id?: string } | null;
    if (p?.subscription_id && !out.has(p.subscription_id)) out.set(p.subscription_id, m.created_at);
  }
  return out;
}

type RawSession = {
  id: string;
  date: string;
  status: ProgSession["status"];
  session_exercises: {
    exercise_id: string;
    exercises: { name_fr: string; category: string | null } | null;
    sets: { load_kg: number | string | null; reps: number | null; done: boolean }[];
  }[];
};

/** Séances et objectifs d'un coaché, au format de compute.ts (« Ma progression »). */
export async function getClientProgress(supabase: Supabase, clientId: string): Promise<{ sessions: ProgSession[]; targets: Record<string, unknown> }> {
  const [{ data: client }, { data }] = await Promise.all([
    supabase.from("clients").select("targets").eq("id", clientId).maybeSingle(),
    supabase
      .from("client_sessions")
      .select("id, date, status, session_exercises ( exercise_id, exercises ( name_fr, category ), sets ( load_kg, reps, done ) )")
      .eq("client_id", clientId)
      .order("date", { ascending: true }),
  ]);
  const sessions: ProgSession[] = ((data ?? []) as unknown as RawSession[]).map((s) => ({
    id: s.id,
    date: s.date,
    status: s.status,
    exercises: (s.session_exercises ?? []).map((se) => ({
      exerciseId: se.exercise_id,
      name: se.exercises?.name_fr ?? "Exercice",
      category: se.exercises?.category ?? null,
      sets: (se.sets ?? []).map((x) => ({ load_kg: num(x.load_kg), reps: x.reps, done: x.done })),
    })),
  }));
  const t = client?.targets;
  const targets = t && typeof t === "object" && !Array.isArray(t) ? (t as Record<string, unknown>) : {};
  return { sessions, targets };
}

export type MyProfile = {
  fullName: string;
  initials: string;
  email: string | null;
  coachName: string | null;
  client: {
    id: string;
    goal: string | null;
    level: string | null;
    sessionsPerWeek: number | null;
    weightKg: number | null;
    heightCm: number | null;
    injuries: string | null;
    foodExclusions: string[];
    since: string;
  } | null;
  subscription: SubscriptionRow | null;
  invoices: InvoiceRow[];
  pricePlaceholder: string;
};

/** Profil du coaché connecté : infos, abonnement en cours et factures (RLS : ses lignes uniquement). */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await abonnementsSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: client }, pricePlaceholder] = await Promise.all([
    supabase.from("profiles").select("full_name, initials, email, coach_id").eq("id", user.id).maybeSingle(),
    supabase
      .from("clients")
      .select("id, goal, level, sessions_per_week, weight_kg, height_cm, injuries, food_exclusions, since")
      .eq("profile_id", user.id)
      .maybeSingle(),
    getPricePlaceholder(supabase),
  ]);
  if (!profile) return null;

  let coachName: string | null = null;
  if (profile.coach_id) {
    const { data: coach } = await supabase.from("profiles").select("full_name").eq("id", profile.coach_id).maybeSingle();
    coachName = coach?.full_name ?? null;
  }

  let subscription: SubscriptionRow | null = null;
  let invoices: InvoiceRow[] = [];
  if (client) {
    const subs = (await listSubscriptions(supabase)).filter((s) => s.clientId === client.id);
    subscription = subs.find((s) => s.status !== "resilie") ?? subs[0] ?? null;
    invoices = await listInvoices(supabase, client.id);
  }

  return {
    fullName: profile.full_name,
    initials: profile.initials ?? "",
    email: profile.email ?? null,
    coachName,
    client: client
      ? {
          id: client.id,
          goal: client.goal,
          level: client.level,
          sessionsPerWeek: client.sessions_per_week,
          weightKg: num(client.weight_kg),
          heightCm: num(client.height_cm),
          injuries: client.injuries,
          foodExclusions: client.food_exclusions ?? [],
          since: client.since,
        }
      : null,
    subscription,
    invoices,
    pricePlaceholder,
  };
}
