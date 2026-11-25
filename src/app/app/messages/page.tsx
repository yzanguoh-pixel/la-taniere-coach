import type { Metadata } from "next";
import { Suspense } from "react";
import { getMyClientId, getMyCoachFirstName, listThread } from "@/lib/messages/thread";
import { MessageThread } from "@/components/messages/MessageThread";
import { ComposeForm } from "@/components/messages/ComposeForm";

export const metadata: Metadata = { title: "Messages" };

/** US21 — Messagerie du coaché : fil unique avec son coach, messages texte et événements. */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-legende font-medium text-texte-2">Tes échanges avec ton coach</p>
        <h1 className="text-titre">Messages</h1>
      </header>
      <Suspense fallback={<ThreadSkeleton />}>
        <Thread />
      </Suspense>
    </section>
  );
}

async function Thread() {
  const [clientId, coachName] = await Promise.all([getMyClientId(), getMyCoachFirstName()]);

  if (!clientId) {
    return (
      <div className="liste-groupee p-5">
        <p className="font-semibold">Messagerie indisponible</p>
        <p className="mt-1 text-[15px] text-texte-2">Ton fil n’a pas pu être chargé. Reconnecte-toi puis réessaie.</p>
      </div>
    );
  }

  const messages = await listThread(clientId);
  const hasUnread = messages.some((m) => m.sender === "coach" && m.kind === "text" && m.readAt === null);
  const label = coachName === "ton coach" ? "Ton coach" : `${coachName}, ton coach`;

  return (
    <div className="flex flex-col gap-6">
      <MessageThread messages={messages} viewer="coache" otherName={coachName} otherLabel={label} />
      <ComposeForm coachName={coachName} hasUnread={hasUnread} />
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du fil" className="flex flex-col gap-3">
      <div className="h-11 w-3/5 rounded-[20px] bg-olive-pale" />
      <div className="mx-auto h-7 w-4/5 rounded-full bg-separateur" />
      <div className="ml-auto h-11 w-1/2 rounded-[20px] bg-separateur" />
    </div>
  );
}
