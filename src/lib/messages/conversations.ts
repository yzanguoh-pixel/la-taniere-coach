import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MessageKind, MessageSender } from "@/lib/messages/thread";

/**
 * Messagerie côté coach : une conversation par coaché actif.
 * La RLS (messages_coach_all, clients du coach) limite tout aux coachés du coach connecté.
 */

export type Conversation = {
  clientId: string;
  fullName: string;
  initials: string;
  /** Dernier message du fil (texte ou événement), null si le fil est vide. */
  last: { body: string; sender: MessageSender; kind: MessageKind; createdAt: string } | null;
  /** Messages du coaché non lus par le coach (sender = 'coache', read_at null). */
  unread: number;
};

type ProfileName = { full_name: string; initials: string };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/** Conversations triées par dernier message (les plus récentes d'abord), puis les coachés sans message, par nom. */
export async function listConversations(): Promise<Conversation[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, profiles!clients_profile_id_fkey(full_name, initials)")
    .eq("status", "actif");
  if (error) throw new Error(`Lecture des coachés impossible : ${error.message}`);
  const rows = (clients ?? []) as { id: string; profiles: ProfileName | ProfileName[] | null }[];
  if (!rows.length) return [];
  const ids = rows.map((c) => c.id);

  const [lasts, unreadRes] = await Promise.all([
    Promise.all(
      ids.map((id) =>
        supabase
          .from("messages")
          .select("body, sender, kind, created_at")
          .eq("client_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    ),
    supabase.from("messages").select("client_id").in("client_id", ids).eq("sender", "coache").is("read_at", null),
  ]);

  const unread = new Map<string, number>();
  for (const r of (unreadRes.data ?? []) as { client_id: string }[]) unread.set(r.client_id, (unread.get(r.client_id) ?? 0) + 1);

  const list: Conversation[] = rows.map((c, i) => {
    const p = one(c.profiles);
    const m = lasts[i].data as { body: string; sender: string; kind: string; created_at: string } | null;
    return {
      clientId: c.id,
      fullName: p?.full_name ?? "Coaché",
      initials: p?.initials ?? "?",
      last: m ? { body: m.body, sender: m.sender as MessageSender, kind: m.kind === "event" ? "event" : "text", createdAt: m.created_at } : null,
      unread: unread.get(c.id) ?? 0,
    };
  });

  return list.sort((a, b) => {
    if (a.last && b.last) return b.last.createdAt.localeCompare(a.last.createdAt);
    if (a.last) return -1;
    if (b.last) return 1;
    return a.fullName.localeCompare(b.fullName, "fr");
  });
}

/** Nom et initiales d'un coaché du coach connecté ; null si l'identifiant ne correspond à aucun de ses coachés. */
export async function getConversationPeer(clientId: string): Promise<{ clientId: string; fullName: string; initials: string } | null> {
  if (!isUuid(clientId)) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("clients").select("id, profiles!clients_profile_id_fkey(full_name, initials)").eq("id", clientId).maybeSingle();
  if (!data) return null;
  const row = data as { id: string; profiles: ProfileName | ProfileName[] | null };
  const p = one(row.profiles);
  return { clientId: row.id, fullName: p?.full_name ?? "Coaché", initials: p?.initials ?? "?" };
}
