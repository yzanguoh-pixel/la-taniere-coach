"use server";

import { refresh, revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import type { EditorState } from "@/components/programmes/editor/types";

/**
 * US14 — Server Actions de l'éditeur de programme.
 * Deux cibles :
 *  - mode « copie » : la copie personnalisée d'un coaché (client_programs → client_sessions → session_exercises → sets).
 *    Une modification s'applique à la séance choisie et, si « semaines suivantes » est coché, aux séances de même
 *    lettre (A, B, C) des semaines suivantes encore à faire. Les séances faites ne sont jamais réécrites.
 *    Option « Mettre aussi à jour le modèle » : la même modification est reportée sur le modèle d'origine
 *    (séance de même lettre, exercice de même identifiant), si le modèle appartient au coach.
 *  - mode « modele » : le modèle lui-même (program_templates → template_sessions → template_exercises).
 *    Les copies déjà envoyées ne changent pas.
 * Toutes les écritures passent par la RLS existante (coach_owns_client, is_coach) : aucune migration.
 */

type Supabase = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const fail = (message: string, fieldErrors?: Record<string, string>): EditorState => ({ status: "error", message, fieldErrors });

// ------------------------------------------------------------------ contexte

type CopyCtx = {
  mode: "copie";
  supabase: Supabase;
  userId: string;
  programId: string;
  clientId: string;
  templateId: string | null;
  canUpdateTemplate: boolean;
  adaptations: string[];
  startDate: string;
  firstName: string;
};
type TemplateCtx = { mode: "modele"; supabase: Supabase; userId: string; templateId: string };
type Ctx = CopyCtx | TemplateCtx;

async function loadCtx(fd: FormData): Promise<Ctx | { error: string }> {
  const mode = str(fd, "mode");
  const ownerId = str(fd, "ownerId");
  if ((mode !== "copie" && mode !== "modele") || !UUID.test(ownerId)) return { error: "Programme introuvable." };
  const supabase = (await createSupabaseServerClient()) as unknown as Supabase | null;
  if (!supabase) return { error: "La base de données n’est pas configurée." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée : reconnectez-vous." };

  if (mode === "modele") {
    const { data: t } = await supabase.from("program_templates").select("id, coach_id").eq("id", ownerId).maybeSingle();
    if (!t || t.coach_id !== user.id) return { error: "Ce modèle ne vous appartient pas." };
    return { mode, supabase, userId: user.id, templateId: t.id };
  }
  const { data: p } = await supabase
    .from("client_programs")
    .select("id, client_id, template_id, adaptations, start_date, clients(coach_id, profiles!clients_profile_id_fkey(full_name)), program_templates(coach_id)")
    .eq("id", ownerId)
    .maybeSingle();
  const client = one(p?.clients as unknown as { coach_id: string; profiles: { full_name: string } | { full_name: string }[] | null } | null);
  if (!p || !client || client.coach_id !== user.id) return { error: "Ce programme n’appartient pas à l’un de vos coachés." };
  const tpl = one(p.program_templates as unknown as { coach_id: string } | null);
  const fullName = one(client.profiles)?.full_name ?? "le coaché";
  return {
    mode,
    supabase,
    userId: user.id,
    programId: p.id,
    clientId: p.client_id,
    templateId: p.template_id,
    canUpdateTemplate: !!tpl && tpl.coach_id === user.id,
    adaptations: Array.isArray(p.adaptations) ? (p.adaptations as unknown[]).map(String) : [],
    startDate: p.start_date,
    firstName: fullName.split(" ")[0] ?? fullName,
  };
}

function done(ctx: Ctx, message: string): EditorState {
  if (ctx.mode === "copie") {
    revalidatePath(`/coach/programmes/${ctx.programId}`);
    revalidatePath(`/coach/coaches/${ctx.clientId}`);
    revalidatePath("/app");
  } else {
    revalidatePath(`/coach/programmes/modele/${ctx.templateId}`);
    revalidatePath("/coach/modeles");
  }
  refresh();
  return { status: "ok", message, savedAt: Date.now() };
}

async function setAdaptations(ctx: CopyCtx, update: (list: string[]) => string[]) {
  const next = update([...ctx.adaptations]);
  if (JSON.stringify(next) === JSON.stringify(ctx.adaptations)) return;
  await ctx.supabase.from("client_programs").update({ adaptations: next as Json }).eq("id", ctx.programId);
}
const withPill = (list: string[], pill: string, replacePrefix?: string) => {
  const kept = replacePrefix ? list.filter((t) => !t.startsWith(replacePrefix)) : list.filter((t) => t !== pill);
  return [...kept, pill];
};

// ------------------------------------------------------------------ validation

type ExerciseValues = { sets: number; reps: string; repsNum: number | null; loadKg: number | null; rpe: number | null; restS: number | null; consigne: string | null };

function parseNum(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function validateExercise(fd: FormData, mode: "copie" | "modele"): { values: ExerciseValues } | { fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const setsRaw = str(fd, "sets");
  const sets = Number(setsRaw);
  if (!setsRaw) e.sets = "Indiquez le nombre de séries.";
  else if (!/^\d+$/.test(setsRaw) || sets < 1 || sets > 20) e.sets = "Saisissez un nombre entier de 1 à 20, par exemple 4.";

  const reps = str(fd, "reps");
  let repsNum: number | null = null;
  if (!reps) e.reps = "Les répétitions sont obligatoires.";
  else if (mode === "copie") {
    if (!/^\d+$/.test(reps) || Number(reps) < 1 || Number(reps) > 200) e.reps = "Saisissez un nombre entier de répétitions (ou de secondes), par exemple 8.";
    else repsNum = Number(reps);
  } else {
    if (reps.length > 40) e.reps = "40 caractères au plus, par exemple « 10 par jambe » ou « 45 s ».";
    const m = /^\s*(\d+)/.exec(reps);
    repsNum = m ? Number(m[1]) : null;
  }

  const loadKg = parseNum(str(fd, "load"));
  if (loadKg != null && (Number.isNaN(loadKg) || loadKg < 0 || loadKg > 500)) e.load = "Saisissez une charge en kg entre 0 et 500, par exemple 62,5.";
  else if (loadKg != null && Math.abs(loadKg * 2 - Math.round(loadKg * 2)) > 1e-9) e.load = "La charge se règle par pas de 0,5 kg, par exemple 62,5.";

  const rpe = parseNum(str(fd, "rpe"));
  if (rpe != null && (Number.isNaN(rpe) || rpe < 1 || rpe > 10 || Math.abs(rpe * 2 - Math.round(rpe * 2)) > 1e-9)) e.rpe = "Le RPE va de 1 à 10, par pas de 0,5.";

  const restRaw = str(fd, "rest");
  const restS = restRaw === "" ? null : Number(restRaw);
  if (restS != null && (!/^\d+$/.test(restRaw) || restS > 900)) e.rest = "Saisissez un repos en secondes (0 à 900), par exemple 90.";

  const consigne = str(fd, "consigne");
  if (consigne.length > 300) e.consigne = "300 caractères au plus.";

  if (Object.keys(e).length) return { fieldErrors: e };
  return { values: { sets, reps, repsNum, loadKg, rpe, restS, consigne: consigne || null } };
}

// ------------------------------------------------------------------ copie : séances visées

type SessionLite = { id: string; label: string; name: string; week: number; status: string; date: string };

async function copyTargets(ctx: CopyCtx, sessionId: string, following: boolean): Promise<{ origin: SessionLite; targets: SessionLite[] } | { error: string }> {
  if (!UUID.test(sessionId)) return { error: "Séance introuvable." };
  const { data: origin } = await ctx.supabase
    .from("client_sessions")
    .select("id, label, name, week, status, date")
    .eq("id", sessionId)
    .eq("client_program_id", ctx.programId)
    .maybeSingle();
  if (!origin) return { error: "Séance introuvable." };
  if (origin.status !== "planned") return { error: "Cette séance est déjà faite : elle ne peut plus être modifiée." };
  if (!following) return { origin, targets: [origin] };
  const { data: list } = await ctx.supabase
    .from("client_sessions")
    .select("id, label, name, week, status, date")
    .eq("client_program_id", ctx.programId)
    .eq("label", origin.label)
    .eq("status", "planned")
    .gte("week", origin.week)
    .order("week", { ascending: true });
  return { origin, targets: list?.length ? list : [origin] };
}

type SeLite = { id: string; client_session_id: string; exercise_id: string; position: number };

/** Rang d'un exercice parmi les occurrences du même exercice dans sa séance (0 en général). */
const occurrence = (list: SeLite[], row: SeLite) =>
  list.filter((x) => x.client_session_id === row.client_session_id && x.exercise_id === row.exercise_id).sort((a, b) => a.position - b.position).findIndex((x) => x.id === row.id);
const nth = (list: SeLite[], sessionId: string, exerciseId: string, k: number) =>
  list.filter((x) => x.client_session_id === sessionId && x.exercise_id === exerciseId).sort((a, b) => a.position - b.position)[k] ?? null;

function setRowsFor(seId: string, clientId: string, v: ExerciseValues): Tables["sets"]["Insert"][] {
  return Array.from({ length: v.sets }, (_, i) => ({
    session_exercise_id: seId,
    client_id: clientId,
    set_number: i + 1,
    target_reps: v.repsNum,
    target_load_kg: v.loadKg,
    target_rpe: v.rpe,
  }));
}

// ------------------------------------------------------------------ modèle : report

async function templateSessionByLabel(ctx: CopyCtx, label: string) {
  if (!ctx.templateId) return null;
  const { data } = await ctx.supabase.from("template_sessions").select("id").eq("template_id", ctx.templateId).eq("label", label).maybeSingle();
  return data;
}

async function templateRepsText(supabase: Supabase, teId: string | null, v: ExerciseValues): Promise<string> {
  if (!teId) return v.reps;
  const { data } = await supabase.from("template_exercises").select("reps").eq("id", teId).maybeSingle();
  const m = data ? /^\s*(\d+)/.exec(data.reps) : null;
  // Garde « 10 par jambe » ou « 45 s » si le nombre n'a pas changé.
  return m && Number(m[1]) === v.repsNum ? data!.reps : v.reps;
}

async function exerciseName(supabase: Supabase, exerciseId: string): Promise<string | null> {
  const { data } = await supabase.from("exercises").select("name_fr").eq("id", exerciseId).maybeSingle();
  return data?.name_fr ?? null;
}

// ================================================================== exercices

/** Ajoute (rowId vide) ou modifie un exercice. */
export async function saveExerciseAction(_prev: EditorState, fd: FormData): Promise<EditorState> {
  const ctx = await loadCtx(fd);
  if ("error" in ctx) return fail(ctx.error);
  const checked = validateExercise(fd, ctx.mode);
  if ("fieldErrors" in checked) return fail("Vérifiez les champs signalés.", checked.fieldErrors);
  const v = checked.values;
  const sessionId = str(fd, "sessionId");
  const rowId = str(fd, "rowId");
  const exerciseId = str(fd, "exerciseId");
  if (!UUID.test(exerciseId)) return fail("Choisissez un exercice dans la bibliothèque.");
  const name = await exerciseName(ctx.supabase, exerciseId);
  if (!name) return fail("Exercice introuvable dans la bibliothèque.");
  const { supabase } = ctx;

  // ---------- modèle
  if (ctx.mode === "modele") {
    const { data: ts } = await supabase.from("template_sessions").select("id").eq("id", sessionId).eq("template_id", ctx.templateId).maybeSingle();
    if (!ts) return fail("Séance introuvable.");
    const row = { sets: v.sets, reps: v.reps, load_kg: v.loadKg, target_rpe: v.rpe, rest_s: v.restS, consigne: v.consigne };
    if (rowId) {
      const { data, error } = await supabase.from("template_exercises").update(row).eq("id", rowId).eq("template_session_id", ts.id).select("id");
      if (error || !data?.length) return fail("L’exercice n’a pas pu être enregistré. Réessayez.");
    } else {
      const { data: last } = await supabase.from("template_exercises").select("position").eq("template_session_id", ts.id).order("position", { ascending: false }).limit(1);
      const { error } = await supabase.from("template_exercises").insert({ ...row, template_session_id: ts.id, exercise_id: exerciseId, position: (last?.[0]?.position ?? -1) + 1 });
      if (error) return fail("L’exercice n’a pas pu être ajouté. Réessayez.");
    }
    return done(ctx, rowId ? `${name} enregistré dans le modèle` : `${name} ajouté au modèle`);
  }

  // ---------- copie
  const following = str(fd, "following") === "1";
  const alsoTemplate = str(fd, "scope") === "modele";
  if (alsoTemplate && !ctx.canUpdateTemplate) return fail("Le modèle d’origine n’est plus modifiable depuis cette copie.", { scope: "Choisissez « Seulement pour " + ctx.firstName + " »." });
  const t = await copyTargets(ctx, sessionId, following);
  if ("error" in t) return fail(t.error);
  const ids = t.targets.map((s) => s.id);
  const { data: seAll } = await supabase.from("session_exercises").select("id, client_session_id, exercise_id, position").in("client_session_id", ids);
  const ses = (seAll ?? []) as SeLite[];

  let before: number | null = null;
  if (rowId) {
    const origin = ses.find((x) => x.id === rowId && x.client_session_id === t.origin.id);
    if (!origin) return fail("Exercice introuvable dans cette séance.");
    const k = occurrence(ses, origin);
    const matched = t.targets.map((s) => nth(ses, s.id, origin.exercise_id, k)).filter((x): x is SeLite => !!x);
    const { data: oldSets } = await supabase.from("sets").select("target_load_kg").eq("session_exercise_id", origin.id);
    const loads = (oldSets ?? []).map((z) => z.target_load_kg).filter((x): x is number => x != null).map(Number);
    before = loads.length ? Math.max(...loads) : null;
    const mIds = matched.map((x) => x.id);
    const { error: uErr } = await supabase.from("session_exercises").update({ consigne: v.consigne, rest_s: v.restS }).in("id", mIds).eq("client_id", ctx.clientId);
    if (uErr) return fail("L’exercice n’a pas pu être enregistré. Réessayez.");
    const { error: dErr } = await supabase.from("sets").delete().in("session_exercise_id", mIds).eq("done", false);
    if (dErr) return fail("L’exercice n’a pas pu être enregistré. Réessayez.");
    const { error: iErr } = await supabase.from("sets").insert(mIds.flatMap((id) => setRowsFor(id, ctx.clientId, v)));
    if (iErr) return fail("Les séries n’ont pas pu être enregistrées. Réessayez.");
  } else {
    const rows: Tables["session_exercises"]["Insert"][] = [];
    const sets: Tables["sets"]["Insert"][] = [];
    for (const s of t.targets) {
      const pos = Math.max(-1, ...ses.filter((x) => x.client_session_id === s.id).map((x) => x.position)) + 1;
      const id = crypto.randomUUID();
      rows.push({ id, client_session_id: s.id, client_id: ctx.clientId, exercise_id: exerciseId, position: pos, consigne: v.consigne, rest_s: v.restS });
      sets.push(...setRowsFor(id, ctx.clientId, v));
    }
    const { error: eErr } = await supabase.from("session_exercises").insert(rows);
    if (eErr) return fail("L’exercice n’a pas pu être ajouté. Réessayez.");
    const { error: sErr } = await supabase.from("sets").insert(sets);
    if (sErr) {
      await supabase.from("session_exercises").delete().in("id", rows.map((r) => r.id!));
      return fail("L’exercice n’a pas pu être ajouté. Réessayez.");
    }
  }

  if (alsoTemplate) {
    const ts = await templateSessionByLabel(ctx, t.origin.label);
    if (ts) {
      const { data: tes } = await supabase.from("template_exercises").select("id, exercise_id, position").eq("template_session_id", ts.id).order("position");
      const origin = rowId ? ses.find((x) => x.id === rowId) : null;
      const k = origin ? occurrence(ses, origin) : -1;
      const te = origin ? ((tes ?? []).filter((x) => x.exercise_id === origin.exercise_id)[k] ?? null) : null;
      const reps = await templateRepsText(supabase, te?.id ?? null, v);
      const row = { sets: v.sets, reps, load_kg: v.loadKg, target_rpe: v.rpe, rest_s: v.restS, consigne: v.consigne };
      if (te) await supabase.from("template_exercises").update(row).eq("id", te.id);
      else await supabase.from("template_exercises").insert({ ...row, template_session_id: ts.id, exercise_id: exerciseId, position: Math.max(-1, ...(tes ?? []).map((x) => x.position)) + 1 });
    }
  } else if (rowId) {
    const loadChanged = before !== v.loadKg;
    await setAdaptations(ctx, (l) => (loadChanged && v.loadKg != null ? withPill(l, `Charge ajustée : ${name} ${fmt(v.loadKg)} kg`, `Charge ajustée : ${name} `) : withPill(l, "Ajustée à la main")));
  } else {
    await setAdaptations(ctx, (l) => withPill(l, `Ajouté : ${name}`));
  }

  const scope = `${following && t.targets.length > 1 ? ` sur ${t.targets.length} séances` : ""}${alsoTemplate ? " (copie et modèle)" : ` pour ${ctx.firstName}`}`;
  return done(ctx, (rowId ? `${name} enregistré` : `${name} ajouté`) + scope);
}

/** Retire un exercice. */
export async function deleteExerciseAction(_prev: EditorState, fd: FormData): Promise<EditorState> {
  const ctx = await loadCtx(fd);
  if ("error" in ctx) return fail(ctx.error);
  const sessionId = str(fd, "sessionId");
  const rowId = str(fd, "rowId");
  if (!UUID.test(rowId)) return fail("Exercice introuvable.");
  const { supabase } = ctx;

  if (ctx.mode === "modele") {
    const { data: ts } = await supabase.from("template_sessions").select("id").eq("id", sessionId).eq("template_id", ctx.templateId).maybeSingle();
    if (!ts) return fail("Séance introuvable.");
    const { data, error } = await supabase.from("template_exercises").delete().eq("id", rowId).eq("template_session_id", ts.id).select("exercise_id");
    if (error || !data?.length) return fail("L’exercice n’a pas pu être retiré. Réessayez.");
    return done(ctx, `${(await exerciseName(supabase, data[0].exercise_id)) ?? "Exercice"} retiré du modèle`);
  }

  const following = str(fd, "following") === "1";
  const alsoTemplate = str(fd, "scope") === "modele" && ctx.canUpdateTemplate;
  const t = await copyTargets(ctx, sessionId, following);
  if ("error" in t) return fail(t.error);
  const { data: seAll } = await supabase.from("session_exercises").select("id, client_session_id, exercise_id, position").in("client_session_id", t.targets.map((s) => s.id));
  const ses = (seAll ?? []) as SeLite[];
  const origin = ses.find((x) => x.id === rowId && x.client_session_id === t.origin.id);
  if (!origin) return fail("Exercice introuvable dans cette séance.");
  const k = occurrence(ses, origin);
  const mIds = t.targets.map((s) => nth(ses, s.id, origin.exercise_id, k)?.id).filter((x): x is string => !!x);
  const { error } = await supabase.from("session_exercises").delete().in("id", mIds).eq("client_id", ctx.clientId);
  if (error) return fail("L’exercice n’a pas pu être retiré. Réessayez.");
  const name = (await exerciseName(supabase, origin.exercise_id)) ?? "Exercice";

  if (alsoTemplate) {
    const ts = await templateSessionByLabel(ctx, t.origin.label);
    if (ts) {
      const { data: tes } = await supabase.from("template_exercises").select("id, exercise_id, position").eq("template_session_id", ts.id).eq("exercise_id", origin.exercise_id).order("position");
      const te = tes?.[k];
      if (te) await supabase.from("template_exercises").delete().eq("id", te.id);
    }
  } else {
    await setAdaptations(ctx, (l) => withPill(l.filter((x) => x !== `Ajouté : ${name}`), `Retiré : ${name}`));
  }
  return done(ctx, `${name} retiré${mIds.length > 1 ? ` de ${mIds.length} séances` : ""}${alsoTemplate ? " (copie et modèle)" : ` pour ${ctx.firstName}`}`);
}

// ================================================================== séances

/** Renomme (sessionId) ou ajoute (sessionId vide) une séance. */
export async function saveSessionAction(_prev: EditorState, fd: FormData): Promise<EditorState> {
  const ctx = await loadCtx(fd);
  if ("error" in ctx) return fail(ctx.error);
  const name = str(fd, "name");
  if (!name) return fail("Vérifiez les champs signalés.", { name: "Donnez un nom à la séance, par exemple « Haut du corps »." });
  if (name.length > 60) return fail("Vérifiez les champs signalés.", { name: "60 caractères au plus." });
  const sessionId = str(fd, "sessionId");
  const { supabase } = ctx;

  if (ctx.mode === "modele") {
    if (sessionId) {
      const { data, error } = await supabase.from("template_sessions").update({ name }).eq("id", sessionId).eq("template_id", ctx.templateId).select("id");
      if (error || !data?.length) return fail("La séance n’a pas pu être renommée. Réessayez.");
      return done(ctx, "Séance renommée");
    }
    const { data: all } = await supabase.from("template_sessions").select("label, position").eq("template_id", ctx.templateId);
    const label = nextLabel((all ?? []).map((x) => x.label));
    const { error } = await supabase.from("template_sessions").insert({ template_id: ctx.templateId, label, name, position: Math.max(-1, ...(all ?? []).map((x) => x.position)) + 1 });
    if (error) return fail("La séance n’a pas pu être ajoutée. Réessayez.");
    return done(ctx, `Séance ${label} ajoutée au modèle`);
  }

  const following = str(fd, "following") === "1";
  const alsoTemplate = str(fd, "scope") === "modele" && ctx.canUpdateTemplate;
  if (sessionId) {
    const t = await copyTargets(ctx, sessionId, following);
    if ("error" in t) return fail(t.error);
    const { error } = await supabase.from("client_sessions").update({ name }).in("id", t.targets.map((s) => s.id)).eq("client_id", ctx.clientId);
    if (error) return fail("La séance n’a pas pu être renommée. Réessayez.");
    if (alsoTemplate && ctx.templateId) await supabase.from("template_sessions").update({ name }).eq("template_id", ctx.templateId).eq("label", t.origin.label);
    else await setAdaptations(ctx, (l) => withPill(l, "Ajustée à la main"));
    return done(ctx, `Séance ${t.origin.label} renommée${alsoTemplate ? " (copie et modèle)" : ` pour ${ctx.firstName}`}`);
  }

  // Ajout : nouvelle lettre, dans la semaine affichée (et les suivantes si demandé).
  const week = Number(str(fd, "week"));
  const { data: all } = await supabase.from("client_sessions").select("label, week, date").eq("client_program_id", ctx.programId);
  const list = all ?? [];
  const maxWeek = Math.max(1, ...list.map((x) => x.week));
  if (!Number.isInteger(week) || week < 1 || week > maxWeek) return fail("Semaine introuvable.");
  const label = nextLabel(list.map((x) => x.label));
  const rows: Tables["client_sessions"]["Insert"][] = [];
  for (let w = week; w <= (following ? maxWeek : week); w++) {
    const weekStart = addDays(ctx.startDate, (w - 1) * 7);
    const last = list.filter((x) => x.week === w).map((x) => x.date).sort().at(-1);
    const date = last ? minIso(addDays(last, 1), addDays(weekStart, 6)) : weekStart;
    rows.push({ client_program_id: ctx.programId, client_id: ctx.clientId, label, name, week: w, date, status: "planned" });
  }
  const { error } = await supabase.from("client_sessions").insert(rows);
  if (error) return fail("La séance n’a pas pu être ajoutée. Réessayez.");
  if (alsoTemplate && ctx.templateId) {
    const { data: tss } = await supabase.from("template_sessions").select("label, position").eq("template_id", ctx.templateId);
    if (!(tss ?? []).some((x) => x.label === label)) {
      await supabase.from("template_sessions").insert({ template_id: ctx.templateId, label, name, position: Math.max(-1, ...(tss ?? []).map((x) => x.position)) + 1 });
    }
  } else {
    await setAdaptations(ctx, (l) => withPill(l, `Séance ajoutée : ${name}`));
  }
  return done(ctx, `Séance ${label} ajoutée${rows.length > 1 ? ` sur ${rows.length} semaines` : ""}${alsoTemplate ? " (copie et modèle)" : ` pour ${ctx.firstName}`}`);
}

/** Supprime une séance (et ses exercices). */
export async function deleteSessionAction(_prev: EditorState, fd: FormData): Promise<EditorState> {
  const ctx = await loadCtx(fd);
  if ("error" in ctx) return fail(ctx.error);
  const sessionId = str(fd, "sessionId");
  const { supabase } = ctx;
  if (ctx.mode === "modele") {
    const { data, error } = await supabase.from("template_sessions").delete().eq("id", sessionId).eq("template_id", ctx.templateId).select("label");
    if (error || !data?.length) return fail("La séance n’a pas pu être supprimée. Réessayez.");
    return done(ctx, `Séance ${data[0].label} supprimée du modèle`);
  }
  const following = str(fd, "following") === "1";
  const alsoTemplate = str(fd, "scope") === "modele" && ctx.canUpdateTemplate;
  const t = await copyTargets(ctx, sessionId, following);
  if ("error" in t) return fail(t.error);
  const { error } = await supabase.from("client_sessions").delete().in("id", t.targets.map((s) => s.id)).eq("client_id", ctx.clientId).eq("status", "planned");
  if (error) return fail("La séance n’a pas pu être supprimée. Réessayez.");
  if (alsoTemplate && ctx.templateId) await supabase.from("template_sessions").delete().eq("template_id", ctx.templateId).eq("label", t.origin.label);
  else await setAdaptations(ctx, (l) => withPill(l, `Séance retirée : ${t.origin.name}`));
  return done(ctx, `Séance ${t.origin.label} supprimée${t.targets.length > 1 ? ` sur ${t.targets.length} semaines` : ""}${alsoTemplate ? " (copie et modèle)" : ` pour ${ctx.firstName}`}`);
}

// ------------------------------------------------------------------ utilitaires de dates et de lettres

function nextLabel(labels: string[]): string {
  const codes = labels.filter((l) => /^[A-Z]$/.test(l)).map((l) => l.charCodeAt(0));
  const next = codes.length ? Math.max(...codes) + 1 : 65;
  return next <= 90 ? String.fromCharCode(next) : `S${labels.length + 1}`;
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const minIso = (a: string, b: string) => (a < b ? a : b);
