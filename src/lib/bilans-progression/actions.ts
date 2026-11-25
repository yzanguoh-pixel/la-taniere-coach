"use server";

import { revalidatePath } from "next/cache";
import { todayParis } from "@/lib/progression/compute";
import { addEventMessage } from "@/lib/messages/thread";
import type { Json } from "@/lib/database.types";
import { buildProgressReport, defaultPeriod, isIsoDate, reportTitle, type Period } from "./compute";
import { dueClients, listClientsWithLastReport, loadReportInput, requireCoach, UUID } from "./data";

/** Server Actions des bilans de progression (espace coach). Écritures soumises à la RLS progress_reports_coach_all. */

export type SendOptions = { periodStart?: string; periodEnd?: string; coachNote?: string; nextFocus?: string };
export type SendResult = { ok: true; reportId: string; title: string; firstName: string } | { ok: false; error: string; field?: "coachNote" | "nextFocus" | "period" };

const NOTE_MAX = 2000;
const FOCUS_MAX = 200;
const MAX_PERIOD_DAYS = 92;

function periodFrom(opts: SendOptions, today: string): Period | { error: string } {
  if (!opts.periodStart && !opts.periodEnd) return defaultPeriod(today);
  const start = opts.periodStart ?? "";
  const end = opts.periodEnd ?? "";
  if (!isIsoDate(start) || !isIsoDate(end)) return { error: "Les dates de la période sont invalides." };
  if (end < start) return { error: "La fin de la période doit suivre son début." };
  if (end > today) return { error: "La période ne peut pas dépasser aujourd’hui." };
  if ((Date.parse(end) - Date.parse(start)) / 864e5 + 1 > MAX_PERIOD_DAYS) return { error: "La période ne peut pas dépasser 3 mois." };
  return { start, end };
}

function revalidateAll(clientId?: string) {
  revalidatePath("/coach/bilans-progression");
  if (clientId) {
    revalidatePath(`/coach/bilans-progression/${clientId}`);
    revalidatePath(`/coach/coaches/${clientId}`);
  }
  revalidatePath("/app/progression");
  revalidatePath("/app/messages");
}

/** Calcule le bilan d'un coaché, l'enregistre puis le signale dans son fil de messages. */
export async function sendProgressReport(clientId: string, opts: SendOptions = {}): Promise<SendResult> {
  const result = await sendOne(clientId, opts);
  if (result.ok) revalidateAll(clientId);
  return result;
}

async function sendOne(clientId: string, opts: SendOptions): Promise<SendResult> {
  if (!UUID.test(clientId)) return { ok: false, error: "Coaché introuvable." };
  const coachNote = (opts.coachNote ?? "").trim();
  if (coachNote.length > NOTE_MAX) return { ok: false, field: "coachNote", error: `Le mot du coach dépasse ${NOTE_MAX} caractères.` };
  const focus = opts.nextFocus === undefined ? undefined : opts.nextFocus.trim();
  if (focus && focus.length > FOCUS_MAX) return { ok: false, field: "nextFocus", error: `Le prochain objectif dépasse ${FOCUS_MAX} caractères.` };

  const auth = await requireCoach();
  if ("error" in auth) return { ok: false, error: auth.error };
  const period = periodFrom(opts, todayParis());
  if ("error" in period) return { ok: false, field: "period", error: period.error };

  const loaded = await loadReportInput(auth.supabase, clientId, period);
  if (!loaded) return { ok: false, error: "Coaché introuvable." };

  const data = buildProgressReport(loaded.input, period);
  if (focus !== undefined) data.nextFocus = focus || null;
  const title = reportTitle(period);

  const { data: row, error } = await auth.supabase
    .from("progress_reports")
    .insert({
      client_id: clientId,
      coach_id: auth.coachId,
      period_start: period.start,
      period_end: period.end,
      title,
      data: data as unknown as Json,
      coach_note: coachNote || null,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "Le bilan n’a pas pu être envoyé. Réessaie." };

  // Le bilan est enregistré : un échec du message ne doit pas faire croire qu'il n'est pas parti.
  await addEventMessage(clientId, `Nouveau bilan de progression : ${title}`, { type: "bilan_progression", report_id: row.id });

  return { ok: true, reportId: row.id, title, firstName: loaded.client.firstName };
}

/** Envoie un bilan (période par défaut) à chaque coaché actif sans bilan depuis 28 jours. */
export async function sendAllProgressReports(): Promise<{ ok: true; sent: number; failed: string[] } | { ok: false; error: string }> {
  const auth = await requireCoach();
  if ("error" in auth) return { ok: false, error: auth.error };
  const rows = dueClients(await listClientsWithLastReport(auth.supabase, auth.coachId), new Date());
  let sent = 0;
  const failed: string[] = [];
  for (const r of rows) {
    const res = await sendOne(r.id, {});
    if (res.ok) sent += 1;
    else failed.push(r.firstName);
  }
  if (sent) revalidateAll();
  for (const r of rows) revalidatePath(`/coach/bilans-progression/${r.id}`);
  return { ok: true, sent, failed };
}

// ---------------------------------------------------------------- variantes formulaire (useActionState)

export type ReportFormState = { status: "idle" | "ok" | "error"; message?: string; errors?: { coachNote?: string; nextFocus?: string; form?: string } };

export async function sendReportForm(clientId: string, _prev: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const res = await sendProgressReport(clientId, {
    coachNote: String(formData.get("coachNote") ?? ""),
    nextFocus: String(formData.get("nextFocus") ?? ""),
  });
  if (!res.ok) return { status: "error", errors: res.field === "coachNote" || res.field === "nextFocus" ? { [res.field]: res.error } : { form: res.error } };
  return { status: "ok", message: `Bilan envoyé à ${res.firstName}. À retrouver dans sa Progression.` };
}

export async function sendAllForm(): Promise<ReportFormState> {
  const res = await sendAllProgressReports();
  if (!res.ok) return { status: "error", errors: { form: res.error } };
  const base = res.sent === 0 ? "Aucun bilan à envoyer : chaque coaché en a reçu un depuis moins de 28 jours." : `${res.sent} bilan${res.sent > 1 ? "s" : ""} envoyé${res.sent > 1 ? "s" : ""}.`;
  const fail = res.failed.length ? ` Échec pour ${res.failed.join(", ")} : réessaie depuis sa ligne.` : "";
  return { status: res.failed.length && !res.sent ? "error" : "ok", message: base + fail, errors: res.failed.length && !res.sent ? { form: base + fail } : undefined };
}
