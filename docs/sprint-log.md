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

## Sprint 0 — validé en ligne (25/11/2026)
- Dépôt GitHub privé `yzanguoh-pixel/la-taniere-coach`, projet Vercel `la-taniere-coach` (variables d'environnement posées, identifiants de démo en « sensitive »).
- Production : https://la-taniere-coach.vercel.app — construction OK.
- Testé en ligne : « Je suis Karim » → /coach ; « Je suis Léa » → /app (connexion de démo côté serveur contre Supabase).
- Identité olive appliquée (palette, logo, navigation) ; écrans métier = maquettes, à remplir à partir du Sprint 1.
- À faire par le PO : protection de déploiement Vercel sur « Preview uniquement » pour que le jury accède à la production sans compte Vercel.

## Bilan global

Sources : `docs/sprint1-brief.md`, `kit/PROMPTS.md` (numéros d'US), `/home/claude/atelier/backlog.md` (story map MoSCoW), le code sous `src/` et `supabase/`. Aucune estimation en points n'a été trouvée dans ces documents : les points sont notés « n.e. » (non estimé) au lieu d'être inventés.

### Stories par sprint

| Sprint | Sprint Goal | US | Story | Points | Statut |
|---|---|---|---|---|---|
| 1 | Boucle de suivi : séance → retour → ajustement → message | US17 | Séance du jour et séries validées | n.e. | Livrée |
| 1 | | US18 | Retour de fin de séance (RPE, ressenti, zone de douleur, mot pour Karim) | n.e. | Livrée |
| 1 | | US19 | Retours triés par urgence sur le tableau de bord | n.e. | Livrée |
| 1 | | US20 | Fiche coaché, prévu / réalisé, ajustement par pas de 2,5 kg | n.e. | Livrée |
| 1 | | US21 | Messagerie : fil unique avec messages événement | n.e. | Livrée |
| 2 | Bibliothèque, modèles, éditeur de programme, progression | US12 | Bibliothèque d'exercices avec recherche | n.e. | Livrée |
| 2 | | US13 | Modèles de programme, filtres, « Personnaliser pour… » | n.e. | Livrée |
| 2 | | US14 | Éditeur de programme et bandeau d'adaptations | n.e. | Livrée |
| 2 | | US15 | Attribution : copie liée au coaché | n.e. | Livrée |
| 2 | | US16 | Bonus : proposer +5 kg si RPE ≤ 6 deux fois | n.e. | Reportée |
| 2 | | US30 | Ma progression (charge, assiduité, records) | n.e. | Livrée |
| 3 | Découverte / réservation, agenda, bilan, conversion | US05 | Page publique La Tanière | n.e. | Livrée |
| 3 | | US06 | Choix du créneau (visio / salle) | n.e. | Livrée |
| 3 | | US08 | Questionnaire et confirmation | n.e. | Livrée |
| 3 | | US07 | Agenda, demandes de bilan, lien de réservation | n.e. | Livrée |
| 3 | | US09 | Synthèse automatique et modèle conseillé | n.e. | Livrée |
| 3 | | US10 | Tests physiques pendant le bilan | n.e. | Livrée |
| 3 | | US11 | « Convertir en coachée » | n.e. | Livrée (invitation e-mail reportée) |
| 4 | Nutrition coachée et coach, abonnements, connexions simulées | US23 | Journal alimentaire et ajout d'un aliment | n.e. | Livrée |
| 4 | | US27 / US28 | Plan du jour, recettes, liste de courses (coachée) | n.e. | Livrée |
| 4 | | US25 / US26 | Objectifs par type de jour, semaine, journal commenté (coach) | n.e. | Livrée |
| 4 | | US27 | Espace Nutrition coach, plans types « Personnaliser pour… » | n.e. | Livrée (quantités non recalculées) |
| 4 | | US32 | Abonnements : échéances, rappel J-7, factures | n.e. | Livrée (facture payée reportée) |
| 4 | | US35 | Connexions simulées (Strava jamais visible du coach) | n.e. | Livrée |
| 5 « jour J » | Démo fiable et sécurité vérifiée | US43 | « Réinitialiser la démo » (Connexions → Réglages) | n.e. | Livrée |
| 5 « jour J » | | — | Corrections : migration 0020 (créneaux UTC → heure de Paris, comptes convertis supprimés au reset, échéance de Léa à J-5), test RLS | n.e. | Livrée |

### Stories reportées

- US16 (bonus) : proposer +5 kg dans la fiche si le RPE reste à 6 ou moins deux fois de suite.
- US32 : marquer une facture comme payée (les factures créées au renouvellement restent « En attente »).
- US11 : invitation par e-mail du coaché converti. Le compte est créé sans mot de passe : la personne ne peut pas encore se connecter.
- US06 / US08 : adresse de la salle et lien visio réels dans `app_config`. La confirmation affiche toujours [ADRESSE] en salle, et le message « Karim vous envoie le lien par SMS » en visio.
- US27 : les quantités d'aliments ne sont pas recalculées dans le plan personnalisé (seul l'objectif calorique est adapté).

### Vélocité

Unité demandée : points livrés par sprint. Les stories n'ont pas été estimées en points : la vélocité en points n'est pas mesurable. À titre indicatif, la dernière colonne compte les stories livrées (unité : nombre de stories, US27 / US28 et US25 / US26 comptées comme lignes distinctes du prompt, US23 comptée une fois).

| Sprint | Points livrés | Stories livrées (nombre) |
|---|---|---|
| 1 | n.e. | 5 |
| 2 | n.e. | 5 (US16 reportée) |
| 3 | n.e. | 7 |
| 4 | n.e. | 7 |
| 5 « jour J » | n.e. | 1 (+ corrections) |
| Moyenne | n.e. | 5 par sprint (6 sur les sprints 1 à 4) |

À retenir pour la rétro : estimer en points dès le prochain Sprint Planning, sinon la vélocité ne peut pas servir à prévoir.

### Sécurité vérifiée

- 0006 `coache_feedback` : un coaché ne peut plus poster un retour sur la séance d'un autre coaché, et un seul retour par séance (index unique).
- 0011 `messages_read_only` : un coaché peut seulement marquer un message comme lu, toute autre modification est refusée.
- 0012 `sets_coache_guard` : un coaché saisit seulement le réalisé de ses séries, jamais les cibles prescrites ni le rattachement.
- 0017 `food_log_coach_comment_guard` : seul le coach peut écrire ou modifier le commentaire d'une entrée du journal alimentaire.
- 0019 `connexions` : les policies du coach sur `activities` excluent toujours les données Strava, en lecture comme en écriture.
- Test `supabase/tests/rls_isolation.sql` : chaque coaché de démo est simulé (JWT + rôle authenticated) et compte les lignes qui ne lui appartiennent pas. 10 coachés × 21 tables, 210 contrôles, aucune fuite (exécuté le 25/11/2026, tout est annulé par un rollback).

### Points ouverts

- Les stories reportées ci-dessus.
- Backlog de l'atelier, M1 : coller un message reçu sur WhatsApp, Insta ou SMS dans la file des retours. Aucun écran correspondant trouvé dans le code.
- Backlog de l'atelier, C2 : bilan de progression généré à la demande sur une période choisie. Couvert en partie par US30 et par le bilan joint au rappel J-7, sans choix de période.
- Tarifs non fixés : les montants restent à [PRIX].
- Réglage Auth Supabase : activer la protection contre les mots de passe compromis (noté au Sprint 0).
- Vercel : confirmer que la protection de déploiement est sur « Preview uniquement » pour que le jury accède à la production.
- Données de démo : la réinitialisation crée déjà une demande « Nora Benali » ; une réservation faite en direct sous le même nom crée un doublon dans l'agenda (voir `docs/demo.md`).
- Données de démo : les séances du jour sont marquées faites par la réinitialisation, la carte de Léa affiche donc « Ta prochaine séance » et non « Ta séance du jour ».
