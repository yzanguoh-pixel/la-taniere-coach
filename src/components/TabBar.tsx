"use client";
import { TabBarBase } from "./TabBarBase";
import type { NavItem } from "./coach-nav-items";

/** Barre d'onglets de l'espace coaché. */
const items: NavItem[] = [
  { href: "/app", label: "Aujourd’hui", icon: "accueil" },
  { href: "/app/messages", label: "Messages", icon: "messages" },
  { href: "/app/progression", label: "Progression", icon: "progression" },
  { href: "/app/nutrition", label: "Nutrition", icon: "nutrition" },
  { href: "/app/profil", label: "Profil", icon: "profil" },
];

export function TabBar() {
  return (
    <TabBarBase
      items={items}
      label="Navigation coaché"
      className="md:left-1/2 md:right-auto md:w-[430px] md:-translate-x-1/2 md:border-x"
      extraActive={(pathname, href) => (href === "/app" && pathname.startsWith("/app/seance")) || (href === "/app/profil" && pathname.startsWith("/app/connexions"))}
    />
  );
}
