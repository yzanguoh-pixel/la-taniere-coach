# La Tanière Coach : contexte du projet

Projet de cours de gestion de projet agile (Scrum). On construit une app **de démo, mais réellement utilisable**, pour Karim, coach sportif indépendant. Elle sera présentée en soutenance : chaque écran doit fonctionner en vrai, avec des données de démo réalistes. Ce n'est pas un produit destiné à durer : on vise simple, propre et fiable, sans sur-ingénierie.

Slogan : **« Coacher plus, gérer moins. »** Signature de la marque : « Où les loups se rassemblent ».

## Principe produit n°1 : du coaching personnalisé

- Karim travaille avec des **plans types** (modèles de programme sportif, plans alimentaires types).
- Un plan type n'est **jamais attribué tel quel**. L'attribuer à un coaché crée une **copie personnalisée** pour cette personne : charges calées sur son bilan, jours de séance, douleurs à éviter (ex. fentes remplacées pour un genou), objectif, calories calculées selon son poids, aliments exclus.
- Les adaptations sont visibles sous forme de pastilles (« Charges calées sur son bilan », « Sans poisson »…).
- À l'enregistrement, on choisit **« Seulement pour Léa »** (par défaut) ou **« Mettre aussi à jour le modèle »**.

## Principe produit n°2 : la boucle de suivi (priorité +++)

Le coaché fait sa séance, puis envoie son retour (RPE, ressenti, douleur, un mot). Le retour apparaît chez Karim, trié par urgence (une douleur passe en premier). Karim ajuste la charge en un clic, et le coaché reçoit le changement dans ses messages et dans son programme. C'est l'histoire à montrer en démo.

## Intégrations : simulées

Agendas (Google, Outlook, Apple via .ics), Withings, Garmin, WHOOP, Apple Santé, Health Connect, Strava et le paiement **ne sont pas branchés pour de vrai**. Le bouton « Connecter » passe le service à l'état connecté, enregistre la date de synchro et injecte des données d'exemple (ex. Withings ajoute des pesées, Garmin des activités). Strava est marqué « visible par toi seule (règles Strava) » et n'est jamais montré au coach. N'ajoute aucune clé d'API tierce.

## Stack

- Next.js (dernière version stable, App Router) + TypeScript + Tailwind CSS
- Supabase : Postgres, Auth, Row Level Security. Nouveau projet dédié, **à ne pas confondre avec le projet perso `coaching-hub`**, qu'on ne modifie jamais.
- Déploiement sur Vercel
- Pas de librairie de graphiques : barres, anneaux et courbes en SVG/CSS, comme dans les maquettes
- Pas d'app mobile native : les écrans coaché et prospect sont des pages web mobiles (largeur max. 430 px, centrées sur ordinateur)

## Comptes de démo

Il n'y a pas de vraie inscription. L'écran d'entrée (`/`) propose trois boutons :

- **Je suis Karim** : connexion automatique au compte coach de démo (identifiants dans les variables d'environnement, connexion faite côté serveur)
- **Je suis Léa** : connexion automatique au compte coachée de démo
- **Je découvre** : parcours prospect public `/decouvrir`, sans compte

Les identifiants de démo vont dans `.env.local` et dans les variables Vercel. Jamais dans le code.

Les règles RLS s'appliquent : un coaché ne voit que ses propres données, et le coach ne voit que ses coachés. Ajoute un bouton **« Réinitialiser la démo »** dans les réglages du coach : une fonction SQL remet les données de démo à zéro avant la soutenance.

## Maquettes : la référence visuelle

Le dossier `maquettes/` contient les écrans validés (39 écrans, dont la version mobile de l'espace coach) et 3 composants (`CoachNav`, `TabBar`, `CoachTabs`), au format `.dc.html`. C'est du HTML avec des trous `{{…}}`, et les données d'exemple sont dans le `<script>` en bas de chaque fichier. Ces fichiers **ne s'exécutent pas** : lis-les pour reproduire fidèlement la mise en page, les textes, les couleurs et les données de démo. Les images `/_blob/…` correspondent au logo : utilise `public/logo/taniere-mark.svg` (symbole seul) et `public/logo/taniere-logo.svg` (logo complet avec lettrage), copiés depuis `assets/`.

| Maquette | Route | Rôle |
| --- | --- | --- |
| Main | `/` | Entrée démo |
| P1-Accueil | `/decouvrir` | Prospect |
| P2-Creneau | `/decouvrir/creneau` | Prospect |
| P3-Questionnaire | `/decouvrir/questionnaire` | Prospect |
| P4-Confirmation | `/decouvrir/confirmation` | Prospect |
| C1-Dashboard | `/coach` | Coach |
| C2-Coaches | `/coach/coaches` | Coach |
| C3-Fiche | `/coach/coaches/[id]` | Coach |
| C9-FicheNutrition | `/coach/coaches/[id]/nutrition` | Coach |
| C4-Agenda | `/coach/agenda` | Coach |
| C5-Bilan | `/coach/bilans/[id]` | Coach |
| C6-Modeles | `/coach/modeles` | Coach |
| C7-Editeur | `/coach/programmes/[id]` | Coach |
| C10-Nutrition | `/coach/nutrition` | Coach |
| C11-Connexions | `/coach/connexions` | Coach |
| C8-Abonnements | `/coach/abonnements` | Coach |
| M1-Accueil | `/app` | Coaché |
| M2-Seance | `/app/seance/[id]` | Coaché |
| M3-Retour | `/app/seance/[id]/retour` | Coaché |
| M4-Messages | `/app/messages` | Coaché |
| M5-Progression | `/app/progression` | Coaché |
| M6-Profil | `/app/profil` | Coaché |
| M7-Nutrition | `/app/nutrition` | Coaché |
| M8-Aliment | `/app/nutrition/ajouter` | Coaché |
| M9-Plan | `/app/nutrition/plan` | Coaché |
| M10-Connexions | `/app/connexions` | Coaché |

### Espace coach sur téléphone

Chaque écran coach existe aussi en version mobile (maquettes `CM…`). Sous 768 px de large, l'espace coach remplace le menu latéral `CoachNav` par la barre d'onglets `CoachTabs` (Accueil, Coachés, Agenda, Nutrition, Plus) et suit la mise en page `CM…`. Ce sont les **mêmes routes** : une seule app responsive, pas deux apps.

| Ordinateur | Mobile | Contenu |
| --- | --- | --- |
| Main | CM0-Entree | Entrée démo |
| C1 | CM1-Dashboard | Tableau de bord |
| C2 | CM2-Coaches | Coachés |
| C3 | CM3-Fiche | Fiche, retours et ajustement |
| C4 | CM4-Agenda | Agenda et demandes de bilan |
| C5 | CM5-Bilan | Résultats d'un bilan |
| C6 | CM6-Modeles | Modèles de programme |
| C7 | CM7-Editeur | Programme personnalisé |
| C8 | CM8-Abonnements | Abonnements |
| C9 | CM9-FicheNutrition | Nutrition d'un coaché |
| C10 | CM10-Nutrition | Nutrition : suivi, plans, recettes |
| C11 | CM11-Connexions | Connexions et réglages (avec « Réinitialiser la démo ») |
| — | CM12-Plus | Menu « Plus » (route `/coach/plus`, mobile uniquement) |

## Design system : clair, épuré, pastel (validé, remplace le style sombre)

**Important :** les maquettes du dossier `maquettes/` sont en thème sombre. Elles servent pour la **structure** (écrans, contenus, parcours, données). Le **style** à appliquer est celui-ci, illustré par `maquettes/Design-clair-pastel.dc.html`.

- Fond `#F5F5F7`, cartes `#FFFFFF`, séparateurs `#F0F0F2`, bordures `#E5E5EA`
- Texte `#1D1D1F`, texte secondaire `#6E6E73`, icônes inactives `#8E8E93`
- Pastels : une couleur par type d'info, toujours avec le texte foncé de la même teinte dessus
  - Sauge `#E3F0E5` / `#2E6B43` : séances, progrès, actions positives (anneau et interrupteur `#6FB585`)
  - Lavande `#ECEAFB` / `#4F45A8` : bilans, protéines
  - Ciel `#E1EEFA` / `#1E5E9C` : coachés, glucides, infos
  - Beurre `#FBF2D2` / `#7A5A00` : à surveiller, charge trop haute
  - Pêche `#FDE7DC` / `#A1471B` : douleur, alertes, lipides
- Bouton principal : pilule noire `#1D1D1F`, texte blanc. Bouton secondaire : pilule `#F0F0F2`.
- Typo : `-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif` (Inter via Google Fonts). Titres 34 px en gras (700), interlettrage -0,025 em ; sous-titres 20 px (600) ; texte 17 px ; légendes 13 px. Pas de capitales pour les titres.
- Coins : cartes 20 à 24 px, téléphone en listes groupées façon iOS (cartes blanches avec séparateurs fins). Ombres très légères seulement.
- Sélecteurs segmentés et interrupteurs façon iOS ; barre d'onglets blanche translucide, onglet actif en `#1D1D1F`.
- Logo : version foncée du symbole (`assets/taniere-mark-dark.svg`) sur fond clair.
- Cibles tactiles d'au moins 44 px.
- Icônes : traits fins (stroke 1,8), comme dans les maquettes. Pas d'emoji. Aucun logo de marque tiers : une icône générique plus le nom du service.
- Accessibilité : vrais `<button>`, `<a>`, `<label>`, contraste suffisant, `aria-label` sur les boutons qui n'ont qu'une icône

## Modèle de données (base à affiner)

- `profiles` (id = auth user, role coach | coache, full_name, initials, coach_id)
- `clients` (profile_id, goal, level, sessions_per_week, injuries, weight_kg, food_exclusions, since)
- `bookings` (prospect : nom, téléphone, créneau, format visio | salle, statut) + `intake_forms` (answers jsonb, tests jsonb, summary jsonb, converted_client_id)
- `availability_slots` (créneaux de Karim)
- `exercises` (name_fr, category, muscles, equipment)
- `program_templates` → `template_sessions` → `template_exercises`
- `client_programs` (client_id, template_id, adaptations jsonb, name) → `client_sessions` (date, status planned | done | skipped) → `session_exercises` (consigne) → `sets` (target_reps, target_load_kg, target_rpe, reps, load_kg, rpe, done)
- `session_feedback` (session_id, rpe, feeling, pain_zone, note, handled_at)
- `messages` (client_id, sender, body, kind text | event, payload jsonb)
- `foods` (name, brand, source ciqual | openfoodfacts | coach, kcal/protein/carbs/fat pour 100 g)
- `nutrition_goals` (client_id, day_type training | rest, kcal, protein_g, carbs_g, fat_g)
- `meal_plan_templates` + `client_meal_plans` (copie personnalisée, adaptations jsonb) + `recipes`
- `food_log_entries` (client_id, date, meal, food_id | recipe_id, quantity, kcal, macros) ; `supplements` ; `shopping_items`
- `weight_logs`, `activities` (données simulées des objets connectés)
- `subscriptions` (formule, prix, date d'échéance, statut) + `invoices`
- `integrations` (user_id, provider, status, connected_at, last_sync_at, shared_scopes jsonb)

## Données de démo (seed)

Les mêmes que dans les maquettes, cohérentes d'un écran à l'autre :

- Karim B. et 10 coachés : Léa Martin, Tom Bernard, Yanis Saïdi, Inès Kaci, Hugo Lefèvre, Camille Roux, Sarah Petit, Malik Diallo, Julie Moreau, Théo Garnier
- 3 prospects : Nora Benali et Emma Dubois (questionnaire reçu), Lucas Fontaine (questionnaire en attente)
- L'histoire de Léa : programme « Force bas du corps » adapté, squat 60 kg, retour « Squat facile, j'aurais pu mettre +5 kg » avec RPE 6, objectif squat 70 kg, journal nutrition du lundi à 1 276 / 2 100 kcal
- 7 modèles de programme, 6 plans alimentaires, environ 10 recettes
- Exercices et aliments : si le MCP Supabase a accès au projet `coaching-hub`, **lis seulement** (SELECT) ses tables `sport_exercises` (915 exercices) et `food_items` (3 207 aliments), puis copie-les dans le nouveau projet. Sinon, crée une sélection d'environ 80 exercices et 200 aliments courants.
- Prix des formules : la valeur `[PRIX]` reste affichée tant qu'Angel n'a pas donné les tarifs (variable de config).

## Façon de travailler (Scrum)

- On avance sprint par sprint, avec les prompts du fichier `PROMPTS.md`. Ne fais pas les sprints suivants en avance.
- À la fin de chaque sprint, mets à jour `docs/sprint-log.md` : stories terminées, ce qui a été simplifié, obstacles rencontrés, points pour la rétro. C'est la matière de la Sprint Review et de la rétrospective.
- **Definition of Done** d'une story :
  - critères d'acceptation remplis ;
  - fidèle à la maquette ;
  - fonctionne avec les comptes de démo ;
  - RLS vérifiée ;
  - `npm run build` et `npm run lint` passent ;
  - affichage correct en largeur mobile ;
  - déployé sur une preview Vercel.
- Commits courts et clairs, un par story quand c'est possible.
- Si une maquette et ce fichier se contredisent, ce fichier l'emporte. En cas de doute, pose la question plutôt que d'inventer.
