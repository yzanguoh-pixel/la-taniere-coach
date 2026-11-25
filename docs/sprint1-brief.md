# Sprint 1 — brief commun des agents

Sprint Goal : « Léa envoie son retour de séance, Karim le voit et ajuste sa charge, Léa reçoit le changement. »

## Lire avant de coder
- `kit/CLAUDE.md` (règles, Definition of Done, données de démo) et `kit/PROMPTS.md` section « Prompt 1 ». `AGENTS.md` : Next.js 16 a des changements cassants, lis `node_modules/next/dist/docs/` avant d'utiliser une API Next (params async, proxy.ts au lieu de middleware, Server Actions…).
- Il n'y a PAS de dossier `maquettes/`. La référence visuelle et fonctionnelle est la démo validée par le client : `/home/claude/taniere/js/coach-suivi.js` (tableau de bord, file des retours, panneau, ajustement ±2,5 kg), `/home/claude/taniere/js/coache.js` (Aujourd'hui, séance, retour guidé, messages), captures `/home/claude/taniere/shots/ref-*.png` et `olive-*.png`. Reproduis les parcours et les textes, en composants React + Tailwind.
- Style : identité olive déjà posée dans `src/app/globals.css` (tokens `olive`, `olive-fonce`, `olive-pale`, `fond`, `carte`, `texte`, `texte-2`, classes `.liste-groupee`, `.btn-principal`, `.btn-secondaire`). N'invente pas d'autres couleurs ; jamais de texte blanc sur `bg-olive`. Police système, titres de page `text-titre`, chiffres `tabular-nums`, cibles ≥ 44 px, focus visible, pas d'emoji, icônes de `src/components/icons.tsx`.
- Données : Supabase projet `cdjrrrsjtbzgvzjykzpa` (schéma `supabase/migrations/0001_schema.sql`, RLS `0002_rls.sql`, seed `0003_demo_seed.sql`). Lis le schéma avant d'écrire une requête. Clients Supabase : `src/lib/supabase/` (serveur via cookies). Le seed contient l'histoire de Léa (squat 50 → 60 kg, semaine 5 séance A terminée, retour « Squat facile, j'aurais pu mettre +5 kg » RPE 6 non traité).
- Le bac à sable NE PEUT PAS joindre supabase.co : pas de test local avec données. Vérifie la logique SQL et la RLS avec l'outil MCP Supabase `execute_sql` en simulant un utilisateur (`set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role','authenticated')::text, true);` dans une transaction terminée par `rollback`). Les UUID : `select id, raw_user_meta_data->>'demo_key' from auth.users`. Ne modifie jamais les données réelles hors transaction annulée.
- Si un changement de schéma ou une fonction SQL est indispensable, écris-le dans un nouveau fichier `supabase/migrations/0005_<sujet>.sql` (agent coach : 0005, agent coaché : 0006, agent messages : 0007) et NE l'applique PAS : le coordinateur l'appliquera. Préfère ce qui marche avec la RLS existante.

## Partage des fichiers (strict, pour travailler en parallèle)
- Agent coaché : `src/app/app/page.tsx`, `src/app/app/seance/**`, `src/lib/coache/**`, `src/components/coache/**`.
- Agent coach : `src/app/coach/page.tsx`, `src/app/coach/coaches/**`, `src/lib/coach/**`, `src/components/coach/**`.
- Agent messages : `src/app/app/messages/**`, `src/lib/messages/**`, `src/components/messages/**`, et `src/lib/database.types.ts` (à générer en PREMIER avec l'outil MCP `generate_typescript_types`, les deux autres l'importent dès qu'il existe).
- Personne ne touche aux autres fichiers (layouts, nav, globals.css, proxy) : besoin → le dire dans le rapport.
- Ne lance PAS `npm run build` (un seul build à la fois, c'est le coordinateur) : utilise `npx tsc --noEmit -p .` et `npx eslint <tes fichiers>`. Ne commit pas, ne push pas.

## Règles du sprint
- Quand Karim applique un ajustement : mettre à jour les séances futures (status `planned`) du programme personnel de Léa pour l'exercice concerné, ajouter un message `kind='event'` dans le fil de Léa (« Programme mis à jour : Squat barre 60 → 62,5 kg »), marquer le retour comme traité (`handled_at`).
- Quand Léa envoie son retour : enregistrer `session_feedback`, passer la séance à `done`, ajouter un message événement « Retour envoyé : … — RPE n ».
- L'accueil de Léa affiche ses vraies données (séance du jour / prochaine séance, charges réelles).
- Toutes les écritures via Server Actions côté serveur, avec erreurs sous les champs et confirmation après enregistrement.

Rapport final de chaque agent : fichiers créés, migration éventuelle à appliquer, tests SQL/RLS faits, points ouverts.

---
# Sprint 2 en parallèle (décision du PO/équipe le 25/11)
Sprint Goal : « Karim part d'un modèle, le personnalise pour un coaché et le lui envoie ; Léa voit sa progression. »
Même règles que ci-dessus. Partage des fichiers Sprint 2 :
- Agent bibliothèque : `src/app/coach/modeles/**`, `src/app/coach/coaches/page.tsx` (liste C2 — UNIQUEMENT ce fichier, l'agent coach du Sprint 1 garde `coaches/[id]/**`), `src/components/programmes/library/**`, `src/lib/programmes/templates.ts`. Migration éventuelle : 0008.
- Agent éditeur : `src/app/coach/programmes/**`, `src/components/programmes/editor/**`, `src/lib/programmes/editor.ts`, `src/lib/programmes/assign.ts`. Migration éventuelle : 0009.
- Agent progression : `src/app/app/progression/**`, `src/components/progression/**`, `src/lib/progression/**`. Migration éventuelle : 0010.
US16 (bonus, proposition +5 kg dans la fiche) : à faire plus tard par le coordinateur, car la fiche appartient à l'agent coach du Sprint 1.

---
# Sprint 3 en parallèle (demandé par Yassine le 25/11)
Sprint Goal : « Nora réserve son bilan offert seule, Karim lit la synthèse et la convertit en coachée avec un programme personnalisé. »
Mêmes règles. Partage des fichiers Sprint 3 :
- Agent prospect : `src/app/decouvrir/**`, `src/components/decouvrir/**`, `src/lib/decouvrir/**` (US05, US06, US08). Parcours public sans compte. Migration éventuelle : 0013.
- Agent agenda : `src/app/coach/agenda/**`, `src/components/agenda/**`, `src/lib/agenda/**` (US07). Migration éventuelle : 0014.
- Agent bilan : `src/app/coach/bilans/**`, `src/components/bilans/**`, `src/lib/bilans/**` (US09, US10, US11). Pour « Convertir en coachée », réutilise `assignTemplate` de `src/lib/programmes/assign.ts` (Sprint 2) puis redirige vers l'éditeur `/coach/programmes/<id>`. Migration éventuelle : 0015.

---
# Sprint 4 (lancé après la fin des Sprints 1 et 2)
Sprint Goal : « Le suivi devient complet : nutrition personnalisée, renouvellement en un clic et appareils connectés (simulés). »
Mêmes règles. Partage des fichiers Sprint 4 :
- Agent nutrition coaché : `src/app/app/nutrition/**`, `src/components/nutrition/coache/**`, `src/lib/nutrition/coache/**` (US23 journal + ajouter un aliment, US27/US28 plan du jour, recettes, liste de courses). Migration éventuelle : 0016.
- Agent nutrition coach : `src/app/coach/coaches/[id]/nutrition/**`, `src/app/coach/nutrition/**`, `src/components/nutrition/coach/**`, `src/lib/nutrition/coach/**` (US25, US26, US27 côté coach). Migration éventuelle : 0017.
- Agent abonnements : `src/app/coach/abonnements/**`, `src/app/app/profil/**`, `src/components/abonnements/**`, `src/lib/abonnements/**` (US32). Migration éventuelle : 0018.
- Agent connexions : `src/app/app/connexions/**`, `src/app/coach/connexions/**`, `src/components/connexions/**`, `src/lib/connexions/**` (US35). Il fournit un composant `ActivitiesCard` (Garmin) et une fonction `listWeights(clientId)` (Withings) que les autres écrans importent ; l'intégration dans la fiche coaché `src/app/coach/coaches/[id]/page.tsx` est faite par le coordinateur. Strava n'est JAMAIS lu côté coach. Migration éventuelle : 0019.
