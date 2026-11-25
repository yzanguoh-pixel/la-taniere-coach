import { listConversations, type Conversation } from "@/lib/messages/conversations";
import { relativeTime } from "@/lib/coach/format";
import { ConversationList, type ConversationItem } from "@/components/messages/ConversationList";

function previewOf(c: Conversation): string | null {
  if (!c.last) return null;
  const body = c.last.body.replace(/\s+/g, " ").trim();
  return c.last.kind === "text" && c.last.sender === "coach" ? `Toi : ${body}` : body;
}

/** Liste des conversations (serveur) : données Supabase mises en forme pour ConversationList. */
export async function ConversationsPanel({ activeId }: { activeId?: string }) {
  let list: Conversation[];
  try {
    list = await listConversations();
  } catch {
    return <p className="liste-groupee p-5 text-[15px] text-texte-2">Les conversations n’ont pas pu être chargées. Recharge la page.</p>;
  }
  if (!list.length) return <p className="liste-groupee p-5 text-[15px] text-texte-2">Aucun coaché actif pour l’instant.</p>;
  const now = new Date();
  const items: ConversationItem[] = list.map((c) => ({
    clientId: c.clientId,
    fullName: c.fullName,
    initials: c.initials,
    preview: previewOf(c),
    when: c.last ? relativeTime(c.last.createdAt, now) : null,
    at: c.last?.createdAt ?? null,
    unread: c.unread,
  }));
  return <ConversationList items={items} activeId={activeId} />;
}

export function ConversationsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des conversations" className="flex flex-col gap-4">
      <div className="h-11 rounded-full bg-separateur" />
      <div className="liste-groupee">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="size-11 rounded-full bg-olive-pale" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3.5 w-2/5 rounded bg-separateur" />
              <span className="h-3.5 w-4/5 rounded bg-separateur" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
