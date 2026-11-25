import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { ExerciseLite } from "@/components/programmes/library/ExerciseLibrary";

/** Lectures « bibliothèque » de l'espace coach (exercices, modèles, annuaire des coachés). Tout passe par la RLS. */

export type Supabase = SupabaseClient<Database>;

export async function librarySupabase(): Promise<Supabase | null> {
  const client = await createSupabaseServerClient();
  return client as unknown as Supabase | null;
}

/** PostgREST renvoie un objet pour une relation n-1 ; on accepte aussi un tableau par prudence. */
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

// ------------------------------------------------------------------ exercices (US12)

/** Catalogue complet, trié par catégorie puis nom. Lecture ouverte à tout compte connecté. */
export async function getExerciseLibrary(supabase: Supabase): Promise<ExerciseLite[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name_fr, aliases, category, muscles, equipment")
    .order("category", { ascending: true })
    .order("name_fr", { ascending: true });
  if (error) throw new Error("Impossible de charger la bibliothèque d’exercices : " + error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    name: e.name_fr,
    aliases: e.aliases ?? [],
    category: e.category,
    muscles: e.muscles ?? [],
    equipment: e.equipment ?? null,
  }));
}

// ------------------------------------------------------------------ modèles (US13)

export type Level = "debutant" | "intermediaire" | "confirme";
export const levelLabel: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", confirme: "Confirmé" };

export type TemplateCard = {
  id: string;
  name: string;
  goal: string;
  level: Level | null;
  weeks: number;
  sessionsPerWeek: number;
  description: string | null;
  sessions: { label: string; name: string }[];
};

export async function getTemplates(supabase: Supabase): Promise<TemplateCard[]> {
  const { data, error } = await supabase
    .from("program_templates")
    .select("id, name, goal, level, weeks, sessions_per_week, description, template_sessions(label, name, position)")
    .order("name", { ascending: true });
  if (error) throw new Error("Impossible de charger les modèles : " + error.message);
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    goal: t.goal,
    level: (t.level as Level | null) ?? null,
    weeks: t.weeks,
    sessionsPerWeek: t.sessions_per_week,
    description: t.description,
    sessions: [...((t.template_sessions as { label: string; name: string; position: number }[] | null) ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ label: s.label, name: s.name })),
  }));
}

export type ClientChoice = { id: string; fullName: string; initials: string; goal: string | null; program: string | null };

/** Coachés actifs proposés dans « Personnaliser pour… » (avec leur programme en cours, pour prévenir un remplacement). */
export async function getClientChoices(supabase: Supabase): Promise<ClientChoice[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, goal, profiles!clients_profile_id_fkey(full_name, initials), client_programs(name, active, created_at)")
    .eq("status", "actif")
    .eq("client_programs.active", true)
    .order("created_at", { referencedTable: "client_programs", ascending: false });
  if (error) throw new Error("Impossible de charger les coachés : " + error.message);
  return (data ?? [])
    .map((c) => {
      const p = one(c.profiles as unknown as { full_name: string; initials: string } | null);
      const progs = (c.client_programs as { name: string }[] | null) ?? [];
      return { id: c.id, fullName: p?.full_name ?? "Coaché", initials: p?.initials ?? "?", goal: c.goal, program: progs[0]?.name ?? null };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

// ------------------------------------------------------------------ annuaire des coachés (C2)

export type ClientRow = {
  id: string;
  fullName: string;
  initials: string;
  goal: string | null;
  archived: boolean;
  program: string | null;
  toRenew: boolean;
  renewsOn: string | null;
  lastFeedback: { rpe: number; createdAt: string; handled: boolean } | null;
};

/** Abonnement « à renouveler » : statut posé par le coach ou la facturation (a_renouveler, en_retard). */
const RENEW_STATUSES = new Set(["a_renouveler", "en_retard"]);

export async function getClientDirectory(supabase: Supabase): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, goal, status, profiles!clients_profile_id_fkey(full_name, initials), client_programs(name, active, created_at), session_feedback(rpe, created_at, handled_at), subscriptions(status, renews_on)",
    )
    .eq("client_programs.active", true)
    .order("created_at", { referencedTable: "client_programs", ascending: false })
    .order("created_at", { referencedTable: "session_feedback", ascending: false })
    .limit(1, { referencedTable: "session_feedback" });
  if (error) throw new Error("Impossible de charger les coachés : " + error.message);
  return (data ?? [])
    .map((c) => {
      const p = one(c.profiles as unknown as { full_name: string; initials: string } | null);
      const progs = (c.client_programs as { name: string }[] | null) ?? [];
      const fb = ((c.session_feedback as { rpe: number; created_at: string; handled_at: string | null }[] | null) ?? [])[0];
      const subs = ((c.subscriptions as { status: string; renews_on: string }[] | null) ?? []).filter((s) => s.status !== "resilie");
      const renew = subs.filter((s) => RENEW_STATUSES.has(s.status)).sort((a, b) => a.renews_on.localeCompare(b.renews_on))[0];
      return {
        id: c.id,
        fullName: p?.full_name ?? "Coaché",
        initials: p?.initials ?? "?",
        goal: c.goal,
        archived: c.status === "archive",
        program: progs[0]?.name ?? null,
        toRenew: !!renew,
        renewsOn: renew?.renews_on ?? null,
        lastFeedback: fb ? { rpe: fb.rpe, createdAt: fb.created_at, handled: fb.handled_at != null } : null,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}
