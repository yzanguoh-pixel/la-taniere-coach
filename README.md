# La Tanière Coach

App de démo du projet Scrum « Coacher plus, gérer moins. » pour Karim, coach sportif indépendant.
Stack : Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (Postgres, Auth, RLS), déploiement Vercel.

> Le contexte complet est dans `kit/CLAUDE.md`, les prompts de sprint dans `kit/PROMPTS.md`.

## 1. Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (section 3)
npm run dev                  # http://localhost:3000
```

Sans Supabase configuré, l'écran d'entrée affiche « Configuration Supabase manquante » et les espaces coach et coaché redirigent vers `/`.

### Aperçu des écrans sans Supabase (local uniquement)

```bash
DEMO_PREVIEW=1 npm run dev
```

`DEMO_PREVIEW=1` court-circuite l'authentification pour parcourir les coques `/coach` et `/app`. Il est ignoré sur Vercel (`VERCEL=1`) et ne doit **jamais** être défini dans les variables Vercel.

## 2. Créer le projet Supabase

1. Sur [supabase.com](https://supabase.com), créer un **nouveau** projet `la-taniere-coach`, région **Paris (eu-west-3)**. Ne jamais toucher au projet `coaching-hub`.
2. Appliquer les migrations du dossier `supabase/migrations/` (dans l'ordre), avec la CLI Supabase (`supabase link --project-ref <ref>` puis `supabase db push`) ou en collant les fichiers dans l'éditeur SQL.
3. Récupérer dans *Project Settings → API* : l'URL du projet, la clé `anon` et la clé `service_role`.

## 3. Variables d'environnement

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | local + Vercel | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local + Vercel | Clé publique (soumise aux règles RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | local uniquement (scripts) | Création des comptes de démo. Jamais exposée au navigateur |
| `DEMO_COACH_EMAIL` / `DEMO_COACH_PASSWORD` | local + Vercel | Compte de démo de Karim |
| `DEMO_COACHE_EMAIL` / `DEMO_COACHE_PASSWORD` | local + Vercel | Compte de démo de Léa |
| `DEMO_PREVIEW` | local seulement, facultatif | Aperçu sans authentification |

Aucun secret n'est écrit dans le code : tout passe par `.env.local` (ignoré par git) et les variables Vercel.

## 4. Créer les comptes de démo

Après les migrations, lancer le script fourni dans `scripts/` (voir son en-tête pour la commande exacte, par exemple `npx tsx scripts/create-demo-users.ts`). Il crée Karim, Léa et les autres profils avec la clé `service_role`, puis le seed rattache les données de démo.

La connexion « Je suis Karim » / « Je suis Léa » est faite **côté serveur** (`POST /auth/demo`) avec les identifiants d'environnement ; le navigateur ne les voit jamais.

## 5. Déployer sur Vercel

1. Pousser le dépôt sur GitHub, puis *Add New → Project* sur Vercel et importer le dépôt (framework détecté : Next.js).
2. Dans *Settings → Environment Variables*, ajouter les variables `NEXT_PUBLIC_*` et `DEMO_*` (pas `DEMO_PREVIEW`, pas besoin de `SUPABASE_SERVICE_ROLE_KEY` pour l'app).
3. Déployer. Chaque branche poussée produit une *preview* (exigée par la Definition of Done).

## Structure

- `src/app/` : routes (tableau de CLAUDE.md), `auth/demo` et `auth/logout`.
- `src/proxy.ts` : protection des espaces (`/coach` réservé au coach, `/app` au coaché, `/decouvrir` public). Next.js 16 renomme `middleware` en `proxy`.
- `src/components/` : `CoachNav` (menu latéral), `CoachTabs` (onglets coach sous 768 px), `TabBar` (onglets coaché), icônes en trait fin.
- `src/lib/` : variables d'environnement et clients Supabase (serveur et navigateur).
- `public/logo/` : **logos provisoires**, à remplacer par `assets/taniere-mark.svg`, `assets/taniere-mark-dark.svg` et `assets/taniere-logo.svg` du kit.
- `src/app/fonts/` : Inter auto-hébergée (licence SIL OFL).

## Vérifications

```bash
npm run lint
npm run build
```
