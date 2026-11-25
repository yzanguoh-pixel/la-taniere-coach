import { CoachNav } from "@/components/CoachNav";
import { CoachTabs } from "@/components/CoachTabs";

/** Coque de l'espace coach : menu latéral (ordinateur) ou onglets (sous 768 px). */
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <CoachNav />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 pb-28 pt-8 md:px-10 md:pb-16 md:pt-12">{children}</main>
      <CoachTabs />
    </div>
  );
}
