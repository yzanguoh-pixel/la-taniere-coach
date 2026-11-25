"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { NavIcon } from "./NavIcon";
import { isActive, type NavItem } from "./coach-nav-items";

/** Barre d'onglets blanche translucide, onglet actif en #1D1D1F. */
type Props = { items: NavItem[]; label: string; extraActive?: (pathname: string, href: string) => boolean; className?: string };

/** Le chemin courant n'est connu qu'au moment de la requête : la barre est prérendue sans onglet actif, puis complétée. */
export function TabBarBase(props: Props) {
  return (
    <Suspense fallback={<TabBarView {...props} pathname="" />}>
      <TabBarWithPath {...props} />
    </Suspense>
  );
}

function TabBarWithPath(props: Props) {
  return <TabBarView {...props} pathname={usePathname()} />;
}

function TabBarView({ items, label, extraActive, className = "", pathname }: Props & { pathname: string }) {
  return (
    <nav aria-label={label} className={`barre-translucide fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] ${className}`}>
      <ul className="mx-auto grid max-w-[430px] grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href) || Boolean(extraActive?.(pathname, item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${active ? "text-texte" : "text-icone"}`}
              >
                <NavIcon name={item.icon} className="size-6" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
