"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Marque un bilan comme lu (seule écriture permise au coaché : le trigger progress_reports_guard refuse le reste). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markReportRead(reportId: string): Promise<{ ok: boolean }> {
  if (!UUID.test(reportId)) return { ok: false };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("progress_reports")
    .update({ read_at: new Date().toISOString() })
    .eq("id", reportId)
    .is("read_at", null); // une seule fois : ne réécrit pas la date de première lecture
  if (error) return { ok: false };
  revalidatePath("/app/progression");
  return { ok: true };
}
