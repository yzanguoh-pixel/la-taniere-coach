import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/database.types";

/**
 * Fil de messages coach / coaché (table public.messages), un fil par coaché.
 * Fonctions serveur réutilisables : la RLS s'applique (client Supabase lié aux cookies de l'utilisateur).
 *  - coaché : lit son fil, écrit avec sender = 'coache' ;
 *  - coach : lit et écrit dans les fils de ses coachés, avec sender = 'coach'.
 */

export type MessageSender = "coach" | "coache" | "systeme";
export type MessageKind = "text" | "event";

export type ThreadMessage = {
  id: string;
  clientId: string;
  sender: MessageSender;
  senderId: string | null;
  body: string;
  kind: MessageKind;
  payload: Json | null;
  readAt: string | null;
  createdAt: string;
};

export type MessageResult = { ok: true; message: ThreadMessage } | { ok: false; error: string };

type MessageRow = Tables<"messages">;

const COLUMNS = "id, client_id, sender, sender_id, body, kind, payload, read_at, created_at";

/** Nombre maximal de messages chargés (les plus récents). */
export const THREAD_LIMIT = 200;

function toThreadMessage(row: MessageRow): ThreadMessage {
  return {
    id: row.id,
    clientId: row.client_id,
    sender: row.sender as MessageSender,
    senderId: row.sender_id,
    body: row.body,
    kind: row.kind === "event" ? "event" : "text",
    payload: row.payload,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Fil d'un coaché, du plus ancien au plus récent (au plus THREAD_LIMIT messages, les derniers).
 * Lève une erreur si la lecture échoue ; renvoie [] si Supabase n'est pas configuré.
 */
export async function listThread(clientId: string): Promise<ThreadMessage[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select(COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(THREAD_LIMIT);
  if (error) throw new Error(`Lecture du fil impossible : ${error.message}`);
  return (data ?? []).map(toThreadMessage).reverse();
}

/** Expéditeur déduit du rôle de l'utilisateur connecté (la RLS n'accepte que ces combinaisons). */
async function currentSender(): Promise<{ sender: "coach" | "coache"; senderId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "La base de données n’est pas configurée." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ta session a expiré. Reconnecte-toi." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "coach") return { sender: "coach", senderId: user.id };
  if (profile?.role === "coache") return { sender: "coache", senderId: user.id };
  return { error: "Profil introuvable." };
}

async function insertMessage(clientId: string, body: string, kind: MessageKind, payload: Json | null): Promise<MessageResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Le message est vide." };
  const who = await currentSender();
  if ("error" in who) return { ok: false, error: who.error };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "La base de données n’est pas configurée." };
  const { data, error } = await supabase
    .from("messages")
    .insert({ client_id: clientId, sender: who.sender, sender_id: who.senderId, body: text, kind, payload })
    .select(COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: "Le message n’a pas pu être enregistré. Réessaie." };
  return { ok: true, message: toThreadMessage(data) };
}

/**
 * Ajoute un message « événement » (pastille centrée dans le fil) au fil du coaché.
 * L'expéditeur suit le rôle connecté : 'coach' (ex. « Programme mis à jour : Squat barre 60 → 62,5 kg »)
 * ou 'coache' (ex. « Retour envoyé : Séance A — RPE 6 »).
 * Ne lève pas d'erreur : renvoie { ok: false, error } en cas d'échec.
 *
 * Payloads conseillés :
 *  - retour : { type: 'retour', session_id, rpe }
 *  - ajustement : { type: 'ajustement', exercise_id, before_kg, after_kg, feedback_id }
 */
export async function addEventMessage(clientId: string, body: string, payload: Json | null = null): Promise<MessageResult> {
  return insertMessage(clientId, body, "event", payload);
}

/** Ajoute un message texte au fil du coaché (expéditeur selon le rôle connecté). */
export async function addTextMessage(clientId: string, body: string): Promise<MessageResult> {
  return insertMessage(clientId, body, "text", null);
}

/** Identifiant client (table clients) du coaché connecté, ou null. */
export async function getMyClientId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_client_id");
  if (error || !data) return null;
  return data;
}

/** Prénom du coach du coaché connecté (« Karim »), ou « ton coach » à défaut. */
export async function getMyCoachFirstName(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return "ton coach";
  const { data: coachId } = await supabase.rpc("my_coach_id");
  if (!coachId) return "ton coach";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", coachId).maybeSingle();
  const first = data?.full_name?.trim().split(/\s+/)[0];
  return first || "ton coach";
}

/**
 * Marque comme lus les messages reçus dans un fil : côté coaché, ceux du coach ; côté coach, ceux du coaché.
 * Sans effet si rien n'est à marquer. Ne lève pas d'erreur.
 */
export async function markThreadRead(clientId: string): Promise<void> {
  const who = await currentSender();
  if ("error" in who) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const from = who.sender === "coache" ? "coach" : "coache";
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("sender", from)
    .is("read_at", null);
}
