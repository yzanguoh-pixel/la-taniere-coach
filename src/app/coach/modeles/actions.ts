"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { librarySupabase } from "@/lib/programmes/templates";
// Écrite par l'agent éditeur : assignTemplate(templateId, clientId): Promise<{ id } | { error }>
//   → crée la copie personnalisée (client_programs + séances + séries) et renvoie l'id du nouveau client_program.
import { assignTemplate } from "@/lib/programmes/assign";

export type PersonnaliserState = { error?: string; fieldError?: string; templateId?: string };

const UUID = /^[0-9a-f-]{36}$/i;

/** US13 — « Personnaliser pour… » : copie le modèle pour le coaché choisi puis ouvre l'éditeur de sa copie. */
export async function personnaliserModele(_prev: PersonnaliserState, formData: FormData): Promise<PersonnaliserState> {
  const templateId = String(formData.get("templateId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  if (!UUID.test(templateId)) return { error: "Modèle introuvable. Rechargez la page.", templateId };
  if (!UUID.test(clientId)) return { fieldError: "Choisissez le coaché qui recevra la copie.", templateId };

  const supabase = await librarySupabase();
  if (!supabase) return { error: "Service indisponible : la base de données n’est pas configurée.", templateId };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Votre session a expiré. Reconnectez-vous.", templateId };

  // La RLS ne renvoie que mes coachés : un id étranger donne « introuvable ».
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).eq("status", "actif").maybeSingle();
  if (!client) return { fieldError: "Ce coaché n’existe pas ou n’est plus actif.", templateId };

  let programId: string;
  try {
    const res = await assignTemplate(templateId, clientId);
    if ("error" in res) return { error: res.error, templateId };
    programId = res.id;
  } catch {
    return { error: "La copie n’a pas pu être créée. Réessayez.", templateId };
  }

  revalidatePath("/coach/coaches");
  revalidatePath(`/coach/coaches/${clientId}`);
  redirect(`/coach/programmes/${programId}`);
}
