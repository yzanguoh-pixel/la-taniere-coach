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
