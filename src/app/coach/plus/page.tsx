import type { Metadata } from "next";
import Link from "next/link";
import { coachNav } from "@/components/coach-nav-items";
import { NavIcon } from "@/components/NavIcon";
import { IconChevron } from "@/components/icons";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = { title: "Plus" };

const tabbed = new Set(["/coach", "/coach/coaches", "/coach/agenda", "/coach/nutrition"]);

/** Menu « Plus » de l'espace coach sur mobile (maquette CM12-Plus). */
export default function PlusPage() {
  const items = coachNav.filter((i) => !tabbed.has(i.href));
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-titre">Plus</h1>
      <nav aria-label="Autres rubriques" className="liste-groupee">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-4 px-5 transition-colors hover:bg-fond">
            <span className="grid size-9 place-items-center rounded-[10px] bg-separateur">
              <NavIcon name={item.icon} className="size-5 text-texte" />
            </span>
            <span className="flex-1 font-medium">{item.label}</span>
            <IconChevron className="size-5 text-icone" />
          </Link>
        ))}
      </nav>
      <div className="liste-groupee px-2 py-1">
        <LogoutButton />
      </div>
    </section>
  );
}
