"use server";

import { refresh } from "next/cache";
import { addTextMessage, getMyClientId, markThreadRead } from "@/lib/messages/thread";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages/format";

export type SendMessageState = {
  status: "idle" | "error" | "success";
  error?: string;
  /** Texte saisi, renvoyé en cas d'erreur pour ne pas le perdre. */
  value?: string;
  /** Change à chaque envoi réussi (pour vider le champ côté client). */
  sentAt?: number;
};

/** Server Action : le coaché connecté écrit à son coach. */
export async function sendMessageAction(_prev: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const raw = formData.get("message");
  const value = typeof raw === "string" ? raw : "";
  const text = value.trim();
  if (!text) return { status: "error", error: "Écris ton message avant de l’envoyer.", value };
  if (text.length > MESSAGE_MAX_LENGTH) {
    return { status: "error", error: `Ton message est trop long (${MESSAGE_MAX_LENGTH} caractères au plus).`, value };
  }

  const clientId = await getMyClientId();
  if (!clientId) return { status: "error", error: "Ta session a expiré. Reconnecte-toi pour envoyer ton message.", value };

  const result = await addTextMessage(clientId, text);
  if (!result.ok) return { status: "error", error: result.error, value };

  refresh();
  return { status: "success", sentAt: Date.now() };
}

/** Server Action : marque comme lus les messages du coach dans le fil du coaché connecté. */
export async function markThreadReadAction(): Promise<void> {
  const clientId = await getMyClientId();
  if (!clientId) return;
  await markThreadRead(clientId);
}
