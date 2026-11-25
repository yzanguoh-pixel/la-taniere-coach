"use client";
import { coachTabs, plusRoutes } from "./coach-nav-items";
import { TabBarBase } from "./TabBarBase";

/** Onglets de l'espace coach sous 768 px : Accueil, Coachés, Agenda, Nutrition, Plus. */
export function CoachTabs() {
  return (
    <TabBarBase
      items={coachTabs}
      label="Navigation coach"
      className="md:hidden"
      extraActive={(pathname, href) => href === "/coach/plus" && plusRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))}
    />
  );
}
