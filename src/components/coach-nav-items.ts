/** Entrées de navigation de l'espace coach (CoachNav sur ordinateur, menu « Plus » sur mobile). */
export type NavItem = { href: string; label: string; icon: string };

export const coachNav: NavItem[] = [
  { href: "/coach", label: "Tableau de bord", icon: "accueil" },
  { href: "/coach/coaches", label: "Coachés", icon: "coaches" },
  { href: "/coach/messages", label: "Messages", icon: "messages" },
  { href: "/coach/bilans-progression", label: "Bilans de progression", icon: "progression" },
  { href: "/coach/agenda", label: "Agenda", icon: "agenda" },
  { href: "/coach/modeles", label: "Modèles de programme", icon: "modeles" },
  { href: "/coach/nutrition", label: "Nutrition", icon: "nutrition" },
  { href: "/coach/connexions", label: "Connexions", icon: "connexions" },
  { href: "/coach/abonnements", label: "Abonnements", icon: "abonnements" },
];

/** Onglets mobiles (CoachTabs, sous 768 px). Nutrition est rangée sous « Plus ». */
export const coachTabs: NavItem[] = [
  { href: "/coach", label: "Accueil", icon: "accueil" },
  { href: "/coach/coaches", label: "Coachés", icon: "coaches" },
  { href: "/coach/agenda", label: "Agenda", icon: "agenda" },
  { href: "/coach/messages", label: "Messages", icon: "messages" },
  { href: "/coach/plus", label: "Plus", icon: "plus" },
];

/** Pages rangées sous l'onglet « Plus » sur mobile. */
export const plusRoutes = ["/coach/plus", "/coach/nutrition", "/coach/modeles", "/coach/programmes", "/coach/connexions", "/coach/abonnements", "/coach/bilans", "/coach/bilans-progression"];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/coach" || href === "/app") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}
