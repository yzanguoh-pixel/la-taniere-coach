"use server";

import { refresh } from "next/cache";
import { addTextMessage, markThreadRead } from "@/lib/messages/thread";
import { isUuid } from "@/lib/messages/conversations";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages/format";
import type { SendMessageState } from "@/lib/messages/actions";

/**
 * Server Action (à lier avec .bind(null, clientId)) : le coach écrit dans le fil d'un coaché.
 * L'expéditeur est déduit du rôle connecté ; la RLS refuse tout fil qui n'est pas celui d'un de ses coachés.
 */
export async function sendCoachMessageAction(clientId: string, _prev: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const raw = formData.get("message");
  const value = typeof raw === "string" ? raw : "";
  const text = value.trim();
  if (!text) return { status: "error", error: "Écris ton message avant de l’envoyer.", value };
  if (text.length > MESSAGE_MAX_LENGTH) {
    return { status: "error", error: `Ton message est trop long (${MESSAGE_MAX_LENGTH} caractères au plus).`, value };
  }
  if (!isUuid(clientId)) return { status: "error", error: "Conversation introuvable.", value };

  const result = await addTextMessage(clientId, text);
  if (!result.ok) return { status: "error", error: result.error, value };

  refresh();
  return { status: "success", sentAt: Date.now() };
}

/** Server Action (à lier avec .bind(null, clientId)) : marque comme lus les messages du coaché dans ce fil. */
export async function markCoachThreadReadAction(clientId: string): Promise<void> {
  if (!isUuid(clientId)) return;
  await markThreadRead(clientId);
}
