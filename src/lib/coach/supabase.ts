import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Supabase = SupabaseClient<Database>;

/** Client serveur typé avec le schéma généré (le client partagé n'est pas encore générique). */
export async function coachSupabase(): Promise<Supabase | null> {
  const client = await createSupabaseServerClient();
  return client as unknown as Supabase | null;
}
