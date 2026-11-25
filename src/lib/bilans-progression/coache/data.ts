import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseReportData, type ParsedReport } from "./parse";

/** Lecture des bilans de progression du coaché connecté. La RLS limite à ses propres bilans ; on filtre aussi par client_id. */

export type ReportSummary = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  sentAt: string;
  readAt: string | null;
};

export type ReportList = { state: "indisponible" } | { state: "ok"; coachFirstName: string; reports: ReportSummary[] };

export type ReportDetail =
  | { state: "indisponible" }
  | { state: "introuvable" }
  | { state: "ok"; coachFirstName: string; report: ReportSummary & { coachNote: string | null; parsed: ParsedReport } };

const firstWord = (s: string | null | undefined, fallback: string) => (s ?? "").trim().split(/\s+/)[0] || fallback;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function context() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
  if (!client) return null;
  return { supabase, clientId: client.id };
}

async function coachName(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, coachId: string | null) {
  if (!coachId) return "ton coach";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
  return firstWord(data?.full_name, "ton coach");
}

const SUMMARY = "id, coach_id, title, period_start, period_end, sent_at, read_at";

export async function listMyReports(): Promise<ReportList> {
  const ctx = await context();
  if (!ctx) return { state: "indisponible" };
  const { data, error } = await ctx.supabase
    .from("progress_reports")
    .select(SUMMARY)
    .eq("client_id", ctx.clientId)
    .order("sent_at", { ascending: false })
    .limit(50);
  if (error) return { state: "indisponible" };
  const rows = data ?? [];
  return {
    state: "ok",
    coachFirstName: await coachName(ctx.supabase, rows[0]?.coach_id ?? null),
    reports: rows.map((r) => ({ id: r.id, title: r.title, periodStart: r.period_start, periodEnd: r.period_end, sentAt: r.sent_at, readAt: r.read_at })),
  };
}

export async function getMyReport(id: string): Promise<ReportDetail> {
  if (!UUID.test(id)) return { state: "introuvable" };
  const ctx = await context();
  if (!ctx) return { state: "indisponible" };
  const { data: r, error } = await ctx.supabase
    .from("progress_reports")
    .select(`${SUMMARY}, coach_note, data`)
    .eq("id", id)
    .eq("client_id", ctx.clientId)
    .maybeSingle();
  if (error) return { state: "indisponible" };
  if (!r) return { state: "introuvable" };
  return {
    state: "ok",
    coachFirstName: await coachName(ctx.supabase, r.coach_id),
    report: {
      id: r.id,
      title: r.title,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      sentAt: r.sent_at,
      readAt: r.read_at,
      coachNote: r.coach_note?.trim() ? r.coach_note.trim() : null,
      parsed: parseReportData(r.data),
    },
  };
}
