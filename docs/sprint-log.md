# Journal des sprints

## Sprint 0 : socle technique

### Front

**Stories terminées**
- App Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + ESLint.
- Design system clair pastel de CLAUDE.md en jetons Tailwind (fond, cartes, séparateurs, bordures, textes, 5 pastels, sauge vive, rayons 20-24 px, typo 34/20/17/13 px), style inspiré des apps iOS : listes groupées, barres d'onglets blanches translucides, boutons pilules.
- Écran d'entrée « / » : « Je suis Karim », « Je suis Léa », « Je découvre » ; connexion automatique côté serveur (`POST /auth/demo`) avec les identifiants d'environnement ; message clair si la configuration manque.
- Proxy de protection des rôles (`/coach`, `/app`, `/decouvrir` public) et déconnexion.
- Coques : `CoachNav` (ordinateur), `CoachTabs` (sous 768 px), `TabBar` coaché (430 px max), menu `/coach/plus`.
- Pages provisoires pour chaque route du tableau de CLAUDE.md, avec la maquette et le sprint prévus.
- README : lancement, Supabase, variables, comptes de démo, Vercel.

**Simplifications**
- Polices : Inter / SF Pro (décision de Yassine, conforme à CLAUDE.md) au lieu d'Archivo et Big Shoulders Display cités dans le Prompt 0. Inter est auto-hébergée pour un build sans réseau.
- Logos : fichiers provisoires dans `public/logo/`, le dossier `assets/` du kit n'étant pas disponible.
- Maquettes `.dc.html` non disponibles : la structure suit CLAUDE.md et la maquette La Tanière consultée.

**Obstacles**
- Next.js 16 : `middleware` renommé `proxy` ; Cache Components impose d'isoler `usePathname()` dans un `<Suspense>` (navigation prérendue puis complétée).
- Google Fonts injoignable pendant le build dans l'environnement de travail : passage à `next/font/local`.

**Points pour la rétro**
- Récupérer le dossier `maquettes/` et `assets/` du kit avant le sprint 1 pour la fidélité visuelle.
- Valider la connexion de démo dès que le projet Supabase et les comptes existent.

### Données

**Stories terminées**
- `supabase/migrations/0001_schema.sql` : tout le modèle de CLAUDE.md (profils, coachés, prospects et questionnaires, créneaux, exercices, modèles, copies personnalisées `client_programs` → séances → exercices → séries, retours de séance, messages texte/événement, aliments, objectifs, plans types et copies, recettes, journal, compléments, liste de courses, pesées, activités, abonnements, factures, intégrations, configuration). Notes privées du coach dans une table à part (`coach_notes`).
- `supabase/migrations/0002_rls.sql` : RLS sur toutes les tables. Fonctions `is_coach()`, `my_coach_id()`, `my_client_id()`, `my_role()`, `coach_owns_client()`. Le coach gère ses coachés, le coaché ne voit que ses données, les catalogues sont lisibles par tout compte connecté, le prospect (anon) réserve via `book_slot()` / `submit_intake()` et ne relit rien, Strava jamais visible par le coach. Un créneau réservé disparaît (déclencheur).
- `supabase/migrations/0003_demo_seed.sql` (généré par `scripts/generate-demo-seed.py` depuis `scripts/demo_data.py`) : `seed_demo()` et `reset_demo()` (coach uniquement, ne touche pas aux comptes auth). Karim, 10 coachés, 3 prospects (Nora et Emma questionnaire reçu, Lucas en attente), 7 modèles, 6 plans alimentaires, 11 recettes, 82 exercices, 202 aliments, abonnements à prix `null` (affichés `[PRIX]` via `app_config`), créneaux sur 2 semaines. Histoire de Léa : copie « Force bas du corps » (fentes → step-up), squat de 50 à 60 kg, retour « Squat facile, j'aurais pu mettre +5 kg » RPE 6, objectif 70 kg, journal du lundi à 1 276 / 2 100 kcal. Dates relatives au jour du reset.
- `scripts/create-demo-users.ts` : crée ou met à jour les 11 comptes (Karim et Léa depuis `DEMO_*`, autres coachés avec mot de passe aléatoire, `demo_key` dans les métadonnées), puis appelle `seed_demo()`. `npx tsx --env-file=.env.local scripts/create-demo-users.ts`.
- `scripts/rls-test.mjs` : rejoue les migrations et le seed dans PGlite avec un faux schéma `auth` et les droits par défaut de Supabase, puis 51 vérifications (seed, RLS coaché / coach / anon, `reset_demo()`). Résultat : 51/51. Contre-épreuve : en désactivant la RLS de `clients`, 7 tests échouent comme attendu.

**Simplifications**
- Aliments et exercices saisis à la main (valeurs proches de CIQUAL, source `coach`) : le projet `coaching-hub` n'est pas accessible ici et ne doit pas être modifié.
- Les comptes auth sont retrouvés par `raw_user_meta_data->>'demo_key'` plutôt que par e-mail : les e-mails de démo restent dans l'environnement.
- Le coaché peut mettre à jour ses séances et séries (statut, réalisé) ligne entière : pas de restriction par colonne, suffisant pour la démo.

**Obstacles**
- PGlite n'a pas `pgcrypto` : on s'appuie sur `gen_random_uuid()` natif (Postgres 13+), identique sur Supabase.
- Supabase accorde par défaut l'exécution des fonctions `public` à `anon` et `authenticated` : `seed_demo()` et la fonction interne de copie sont révoquées explicitement.

**Points pour la rétro**
- Ordre de mise en route : migrations → `create-demo-users.ts` → (seed automatique) ; avant la soutenance, bouton « Réinitialiser la démo ».
- PGlite valide la logique SQL et la RLS, pas PostgREST ni l'authentification réelle : refaire un passage sur le vrai projet Supabase.

## Sprint 0 — base Supabase en ligne (25/11/2026)
- Projet Supabase `la-taniere-coach` : migrations 0001 à 0004 appliquées (schéma, RLS, seed de démo, durcissement).
- 11 comptes de démo créés (karim, lea + 9 coachés) ; identifiants uniquement dans `.env.local` (non versionné).
- `seed_demo()` exécuté : 10 coachés, 82 exercices, 202 aliments, 7 modèles, 130 séances, 1 480 séries, 9 retours (5 à traiter), 3 rendez-vous, 32 créneaux, 20 factures.
- Contrôles RLS en base : Léa ne voit que ses données (1 coachée, 1 retour, aucun rendez-vous) ; Karim voit ses 10 coachés et jamais Strava.
- Histoire de Léa vérifiée : squat 50 → 60 kg, retour « Squat facile, j'aurais pu mettre +5 kg », RPE 6.
- Audit sécurité : helpers RLS fermés aux visiteurs anonymes, déclencheur non appelable, search_path figé. `book_slot` et `submit_intake` restent publics (prise de rendez-vous). Reste : activer la protection contre les mots de passe compromis (réglage Auth).
- En attente : dépôt GitHub puis déploiement Vercel (connexion de démo testée de bout en bout à ce moment-là).
