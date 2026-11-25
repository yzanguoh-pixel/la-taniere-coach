/**
 * Crée (ou met à jour) les comptes de démo de La Tanière Coach, puis rejoue les données de démo.
 *
 *   npx tsx --env-file=.env.local scripts/create-demo-users.ts
 *
 * Variables lues (jamais de secret dans le code) :
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DEMO_COACH_EMAIL, DEMO_COACH_PASSWORD     (Karim)
 *   DEMO_COACHE_EMAIL, DEMO_COACHE_PASSWORD   (Léa)
 *   DEMO_EMAIL_DOMAIN (facultatif, défaut demo.la-taniere.fr) pour les autres coachés
 *
 * Idempotent : un compte déjà présent est mis à jour (mot de passe démo, demo_key).
 * Les autres coachés reçoivent un mot de passe aléatoire jamais affiché : ils ne servent qu'aux données.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Variable manquante : ${name} (voir .env.example)`);
    process.exit(1);
  }
  return v;
}

const url = need('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = need('SUPABASE_SERVICE_ROLE_KEY');
const domain = process.env.DEMO_EMAIL_DOMAIN || 'demo.la-taniere.fr';

type DemoUser = { key: string; name: string; email: string; password: string };

const users: DemoUser[] = [
  { key: 'karim', name: 'Karim B.', email: need('DEMO_COACH_EMAIL'), password: need('DEMO_COACH_PASSWORD') },
  { key: 'lea', name: 'Léa Martin', email: need('DEMO_COACHE_EMAIL'), password: need('DEMO_COACHE_PASSWORD') },
  ...[
    ['tom', 'Tom Bernard'], ['yanis', 'Yanis Saïdi'], ['ines', 'Inès Kaci'], ['hugo', 'Hugo Lefèvre'], ['camille', 'Camille Roux'],
    ['sarah', 'Sarah Petit'], ['malik', 'Malik Diallo'], ['julie', 'Julie Moreau'], ['theo', 'Théo Garnier'],
  ].map(([key, name]) => ({ key, name, email: `${key}@${domain}`, password: randomBytes(24).toString('base64url') })),
];

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findByEmail(email: string) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  for (const u of users) {
    const meta = { demo_key: u.key, full_name: u.name };
    const existing = await findByEmail(u.email);
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password: u.password, user_metadata: meta, email_confirm: true });
      if (error) throw error;
      console.log(`Mis à jour : ${u.name} <${u.email}>`);
    } else {
      const { error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: meta });
      if (error) throw error;
      console.log(`Créé : ${u.name} <${u.email}>`);
    }
  }
  const { error } = await admin.rpc('seed_demo');
  if (error) {
    console.error('Comptes prêts, mais seed_demo() a échoué :', error.message);
    console.error('Connectez-vous en Karim et utilisez « Réinitialiser la démo », ou exécutez select public.seed_demo(); dans l’éditeur SQL.');
    process.exit(1);
  }
  console.log('Données de démo chargées (seed_demo). Avant la soutenance : bouton « Réinitialiser la démo » (reset_demo).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
