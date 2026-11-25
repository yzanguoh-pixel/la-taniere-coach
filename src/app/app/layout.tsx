import { LogoMark } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";

/** Coque de l'espace coaché : page web mobile, 430 px max, centrée sur ordinateur. */
export default function CoacheLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-fond md:border-x md:border-bordure">
      <header className="barre-translucide sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={22} />
          La Tanière
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-olive-pale text-[12px] font-semibold text-olive-fonce" aria-label="Léa Martin">LM</span>
      </header>
      <main className="px-5 pb-28 pt-6">{children}</main>
      <TabBar />
    </div>
  );
}
