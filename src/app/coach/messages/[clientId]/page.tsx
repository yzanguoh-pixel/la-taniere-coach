import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getConversationPeer } from "@/lib/messages/conversations";
import { listThread, type ThreadMessage } from "@/lib/messages/thread";
import { markCoachThreadReadAction, sendCoachMessageAction } from "@/lib/messages/coach-actions";
import { MessageThread } from "@/components/messages/MessageThread";
import { ComposeForm } from "@/components/messages/ComposeForm";
import { ConversationsPanel, ConversationsSkeleton } from "../_parts/ConversationsPanel";

export const metadata: Metadata = { title: "Conversation" };

type Props = { params: Promise<{ clientId: string }> };

/** Fil complet avec un coaché : messages et événements, saisie fixe en bas, liste à gauche sur ordinateur. */
export default function Page({ params }: Props) {
  return (
    <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside aria-label="Conversations" className="hidden lg:sticky lg:top-8 lg:block lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:p-1">
        <Suspense fallback={<ConversationsSkeleton />}>
          <ActivePanel params={params} />
        </Suspense>
      </aside>
      <Suspense fallback={<ThreadSkeleton />}>
        <Conversation params={params} />
      </Suspense>
    </div>
  );
}

async function ActivePanel({ params }: Props) {
  const { clientId } = await params;
  return <ConversationsPanel activeId={clientId} />;
}

async function Conversation({ params }: Props) {
  const { clientId } = await params;
  const peer = await getConversationPeer(clientId);
  if (!peer) notFound();

  let messages: ThreadMessage[] | null;
  try {
    messages = await listThread(peer.clientId);
  } catch {
    messages = null;
  }
  const name = peer.fullName.split(" ")[0] || peer.fullName;
  const hasUnread = (messages ?? []).some((m) => m.sender === "coache" && m.readAt === null);

  return (
    <section aria-labelledby="titre-conversation" className="flex min-w-0 flex-col">
      <Link href="/coach/messages" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-olive-fonce hover:underline lg:hidden">
        ← Messages
      </Link>
      <header className="mt-1 flex items-center gap-3 border-b border-separateur pb-4 lg:mt-0">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-olive-pale text-[14px] font-semibold text-olive-fonce">
          {peer.initials}
        </span>
        <h1 id="titre-conversation" className="min-w-0 flex-1 truncate text-[22px] font-bold leading-tight">
          {peer.fullName}
        </h1>
        <Link href={`/coach/coaches/${peer.clientId}`} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-[15px] font-semibold text-olive-fonce hover:underline">
          Voir la fiche
        </Link>
      </header>

      <div className="py-5">
        {messages ? (
          <MessageThread
            messages={messages}
            viewer="coach"
            otherName={name}
            bilanHref={`/coach/bilans-progression/${peer.clientId}`}
            emptyText={`Écris ton premier message à ${name}. Ses retours de séance et tes ajustements s’afficheront aussi ici.`}
          />
        ) : (
          <p className="liste-groupee p-5 text-[15px] text-texte-2">Le fil n’a pas pu être chargé. Recharge la page.</p>
        )}
      </div>

      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 -mx-5 border-t border-separateur bg-fond px-5 py-3 md:bottom-0 md:mx-0 md:px-0">
        <ComposeForm
          coachName={name}
          hasUnread={hasUnread}
          rows={2}
          sendAction={sendCoachMessageAction.bind(null, peer.clientId)}
          markReadAction={markCoachThreadReadAction.bind(null, peer.clientId)}
        />
      </div>
    </section>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du fil" className="flex flex-col gap-3">
      <div className="h-11 w-2/5 rounded-full bg-separateur" />
      <div className="h-11 w-3/5 rounded-[20px] bg-olive-pale" />
      <div className="mx-auto h-7 w-4/5 rounded-full bg-separateur" />
      <div className="ml-auto h-11 w-1/2 rounded-[20px] bg-separateur" />
    </div>
  );
}
