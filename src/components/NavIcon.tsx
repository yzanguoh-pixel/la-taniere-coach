import * as I from "./icons";

const map = {
  accueil: I.IconAccueil,
  coaches: I.IconCoaches,
  agenda: I.IconAgenda,
  modeles: I.IconModeles,
  nutrition: I.IconNutrition,
  connexions: I.IconConnexions,
  abonnements: I.IconAbonnements,
  plus: I.IconPlus,
  seance: I.IconSeance,
  messages: I.IconMessages,
  progression: I.IconProgression,
  profil: I.IconProfil,
} as const;

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = map[name as keyof typeof map] ?? I.IconPlus;
  return <Cmp className={className} />;
}
