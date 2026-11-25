"use client";
import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  config: "Configuration Supabase manquante : renseignez .env.local (voir le README).",
  identifiants: "Identifiants de démo manquants : renseignez DEMO_COACH_* et DEMO_COACHE_* dans .env.local.",
  connexion: "La connexion au compte de démo a échoué. Vérifiez que les comptes ont été créés (scripts/create-demo-users.ts).",
};

/** Message d'erreur de connexion lu dans l'adresse (?erreur=…). */
export function EntryNotice() {
  const code = useSearchParams().get("erreur");
  if (!code || !messages[code]) return null;
  return (
    <p role="alert" className="rounded-[20px] bg-peche px-5 py-4 text-[15px] font-medium text-peche-fonce">
      {messages[code]}
    </p>
  );
}
