/** Lecture centralisée des variables d'environnement. Aucune valeur secrète n'est écrite dans le code. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** Vrai si l'URL et la clé publique Supabase sont renseignées. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/**
 * Mode aperçu local : DEMO_PREVIEW=1 court-circuite l'authentification pour regarder les coques
 * sans Supabase. Ignoré en production (NODE_ENV=production sur Vercel) sauf en build local `next start`.
 * Ne jamais définir cette variable sur Vercel.
 */
export function isDemoPreview(): boolean {
  return process.env.DEMO_PREVIEW === "1" && process.env.VERCEL !== "1";
}

export type DemoRole = "coach" | "coache";

/** Identifiants des comptes de démo, lus côté serveur uniquement. */
export function demoCredentials(role: DemoRole): { email: string; password: string } | null {
  const email = role === "coach" ? process.env.DEMO_COACH_EMAIL : process.env.DEMO_COACHE_EMAIL;
  const password = role === "coach" ? process.env.DEMO_COACH_PASSWORD : process.env.DEMO_COACHE_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}
