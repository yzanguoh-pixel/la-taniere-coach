"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResetState = { status: "idle" | "ok" | "error"; message?: string };

/** US43 : remet les données de démonstration dans leur état initial (reset_demo, réservé au coach). */
export async function resetDemo(): Promise<ResetState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "error", message: "Base de données indisponible." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: "Ta session a expiré. Reconnecte-toi." };
  const { error } = await supabase.rpc("reset_demo");
  if (error) {
    return {
      status: "error",
      message: error.code === "42501" ? "Seul le coach peut réinitialiser la démo." : "La réinitialisation a échoué. Réessaie.",
    };
  }
  revalidatePath("/", "layout");
  return { status: "ok", message: "Démo réinitialisée : toutes les données sont revenues à leur état de départ." };
}
