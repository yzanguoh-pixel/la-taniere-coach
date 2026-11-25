import Link from "next/link";
import { LogoMark } from "@/components/Logo";

/** Parcours prospect public, sans compte (page mobile 430 px). */
export default function DecouvrirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <Link href="/decouvrir" className="flex items-center gap-2 text-[15px] font-semibold">
          <LogoMark size={24} />
          La Tanière
        </Link>
        <Link href="/" className="text-[15px] font-medium text-texte-2">Retour à la démo</Link>
      </header>
      {children}
    </div>
  );
}
