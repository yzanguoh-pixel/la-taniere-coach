import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/Logo";
import { EntryNotice } from "@/components/EntryNotice";
import { IconChevron, IconCoaches, IconDecouvrir, IconSeance } from "@/components/icons";
import { isSupabaseConfigured } from "@/lib/env";

/** Écran d'entrée de la démo (maquette Main / CM0-Entree). */
export default function EntryPage() {
  const configured = isSupabaseConfigured();
  const choices = [
    { role: "coach", title: "Je suis Karim", sub: "Coach sportif · tableau de bord, retours, programmes", initials: "KB", tone: "bg-sauge text-sauge-fonce", Icon: IconCoaches },
    { role: "coache", title: "Je suis Léa", sub: "Coachée · séance du jour, retour, messages", initials: "LM", tone: "bg-ciel text-ciel-fonce", Icon: IconSeance },
  ] as const;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1080px] flex-col px-5 pb-16 pt-10 md:px-10 md:pt-16">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em]">
          <LogoMark size={30} />
          La Tanière
        </span>
        <span className="rounded-full bg-carte px-3 py-1.5 text-legende font-medium text-texte-2 shadow-legere">Démo · données fictives</span>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="flex flex-col gap-5">
          <p className="text-[15px] font-semibold text-sauge-fonce">Projet Scrum · Customer Journey de Karim</p>
          <h1 className="text-[44px] font-bold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] md:text-[64px]">
            Coacher plus,
            <br />
            gérer moins.
          </h1>
          <p className="max-w-[34ch] text-[19px] leading-snug text-texte-2">
            Une seule app pour Karim et ses coachés, du bilan offert au renouvellement. Sans WhatsApp, ni tableur, ni ressaisie.
          </p>
          <p className="text-legende italic text-texte-2">Où les loups se rassemblent.</p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="px-1 text-legende font-semibold uppercase tracking-[0.04em] text-texte-2">Choisis ton rôle pour la démo</h2>
          <Suspense fallback={null}>
            <EntryNotice />
          </Suspense>
          {!configured && (
            <p role="status" className="rounded-[20px] bg-beurre px-5 py-4 text-[15px] font-medium text-beurre-fonce">
              Configuration Supabase manquante : la connexion aux comptes de démo est désactivée. Voir le README.
            </p>
          )}
          <div className="liste-groupee">
            {choices.map((c) => (
              <form key={c.role} action="/auth/demo" method="post">
                <input type="hidden" name="role" value={c.role} />
                <button
                  type="submit"
                  disabled={!configured}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-fond disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className={`grid size-12 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${c.tone}`}>{c.initials}</span>
                  <span className="flex-1">
                    <span className="block text-[17px] font-semibold">{c.title}</span>
                    <span className="block text-[15px] text-texte-2">{c.sub}</span>
                  </span>
                  <IconChevron className="size-5 text-icone transition-transform group-hover:translate-x-0.5" />
                </button>
              </form>
            ))}
            <Link href="/decouvrir" className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-fond">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavande text-lavande-fonce">
                <IconDecouvrir className="size-6" />
              </span>
              <span className="flex-1">
                <span className="block text-[17px] font-semibold">Je découvre</span>
                <span className="block text-[15px] text-texte-2">Réserver un bilan offert, sans compte</span>
              </span>
              <IconChevron className="size-5 text-icone transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="px-1 text-legende text-texte-2">Connexion automatique aux comptes de démo, faite côté serveur.</p>
        </div>
      </section>
    </main>
  );
}
