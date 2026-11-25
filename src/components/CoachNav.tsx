"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { coachNav, isActive } from "./coach-nav-items";
import { NavIcon } from "./NavIcon";
import { LogoWordmark } from "./Logo";
import { LogoutButton } from "./LogoutButton";

/** Menu latéral blanc de l'espace coach (ordinateur, à partir de 768 px). */
export function CoachNav() {
  return (
    <Suspense fallback={<CoachNavView pathname="" />}>
      <CoachNavWithPath />
    </Suspense>
  );
}

function CoachNavWithPath() {
  return <CoachNavView pathname={usePathname()} />;
}

function CoachNavView({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-bordure bg-carte px-4 py-6 md:flex">
      <Link href="/coach" className="mb-8 px-3" aria-label="La Tanière, tableau de bord">
        <LogoWordmark />
      </Link>
      <nav aria-label="Navigation coach" className="flex flex-col gap-1">
        {coachNav.map((item) => {
          const active = isActive(pathname, item.href) || (item.href === "/coach/modeles" && pathname.startsWith("/coach/programmes"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
                active ? "bg-olive-pale font-semibold text-olive-fonce" : "font-medium text-texte-2 hover:bg-separateur/70 hover:text-texte"
              }`}
            >
              <NavIcon name={item.icon} className={`size-5 ${active ? "text-olive-fonce" : "text-icone"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-separateur pt-4">
        <div className="mb-2 flex items-center gap-3 px-3">
          <span className="grid size-9 place-items-center rounded-full bg-olive-pale text-[13px] font-semibold text-olive-fonce">KB</span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">Karim B.</p>
            <p className="text-legende text-texte-2">Coach sportif</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
