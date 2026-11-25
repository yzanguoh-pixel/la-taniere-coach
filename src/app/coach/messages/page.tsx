import type { Metadata } from "next";
import { Suspense } from "react";
import { IconMessages } from "@/components/icons";
import { ConversationsPanel, ConversationsSkeleton } from "./_parts/ConversationsPanel";

export const metadata: Metadata = { title: "Messages" };

/** Messagerie du coach : une conversation par coaché actif (sur ordinateur, le fil s'ouvre à droite). */
export default function Page() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="text-legende font-medium text-texte-2">Tes échanges avec tes coachés</p>
        <h1 className="text-titre">Messages</h1>
      </header>
      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <Suspense fallback={<ConversationsSkeleton />}>
          <ConversationsPanel />
        </Suspense>
        <div className="liste-groupee hidden flex-col items-center gap-2 px-6 py-16 text-center lg:flex">
          <span className="grid size-12 place-items-center rounded-full bg-olive-pale text-olive-fonce">
            <IconMessages width={24} height={24} />
          </span>
          <p className="mt-1 font-semibold">Choisis une conversation</p>
          <p className="text-[15px] text-texte-2">Le fil s’affiche ici, avec la zone de saisie.</p>
        </div>
      </div>
    </section>
  );
}
