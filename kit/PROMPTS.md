# Prompts Claude Code, sprint par sprint

Colle **un prompt à la fois** dans Claude Code, depuis ce dossier. Attends la fin du sprint, teste, puis passe au suivant. Claude Code lit automatiquement `CLAUDE.md` (le contexte) : inutile de le recoller.

Chaque écran coach (`C…`) doit aussi respecter sa version mobile (`CM…`, voir le tableau de CLAUDE.md). Quand un prompt cite `C3-Fiche`, cela vaut aussi pour `CM3-Fiche`.

---

## Prompt 0 : socle technique (Sprint 0)

```
Lis CLAUDE.md, puis parcours le dossier maquettes/ (commence par Main, CoachNav, TabBar, C1 et M1).

Objectif du sprint 0 : poser le socle de l'app La Tanière Coach, sans encore les fonctionnalités.

1. Crée l'app Next.js + TypeScript + Tailwind dans ce dossier. Configure les polices Archivo et Big Shoulders Display, puis les couleurs du design system de CLAUDE.md dans la config Tailwind. Copie assets/ vers public/logo/.
2. Crée un nouveau projet Supabase « la-taniere-coach » en région Paris. Utilise le MCP Supabase s'il est disponible, sinon dis-moi quoi faire dans le dashboard. Ne touche jamais au projet coaching-hub.
3. Écris la migration du modèle de données de CLAUDE.md, avec des règles RLS (le coach voit ses coachés, un coaché ne voit que ses données, le parcours prospect peut seulement créer une réservation et un questionnaire).
4. Écris le seed complet des données de démo (coachés, prospects, modèles, plans alimentaires, recettes, l'histoire de Léa), ainsi qu'une fonction SQL reset_demo() qui le rejoue. Pour les exercices et les aliments, suis la règle de CLAUDE.md.
5. Crée les 2 comptes de démo (Karim, Léa), l'écran d'entrée « / » fidèle à la maquette Main, et la connexion automatique côté serveur avec les identifiants de .env.local.
6. Crée les coques de navigation : le menu latéral coach (CoachNav) sur ordinateur, la barre d'onglets coach (CoachTabs) sous 768 px, et la barre d'onglets coaché (TabBar). Ajoute des pages vides pour chaque route du tableau de CLAUDE.md.
7. Prépare le déploiement Vercel : variables d'environnement documentées dans un README, sans aucun secret dans le code.

Termine en créant docs/sprint-log.md (section Sprint 0) et en me donnant : l'URL locale, ce que je dois configurer moi-même (Supabase, Vercel, variables) et la liste des fichiers créés.
```

**Tu vérifies :** `npm run dev`, puis l'écran d'entrée s'affiche, « Je suis Karim » ouvre l'espace coach et « Je suis Léa » ouvre l'espace coaché.

---

## Prompt 1 : la boucle de suivi, priorité +++ (Sprint 1)

```
Sprint 1. Sprint Goal : « Léa envoie son retour de séance, Karim le voit et ajuste sa charge, Léa reçoit le changement. »

Stories (critères dans CLAUDE.md et les maquettes) :
- US17 Séance du jour et séries validées : maquettes M1-Accueil et M2-Seance
- US18 Retour de fin de séance (RPE 1-10, ressenti, zone de douleur si « Douleur », mot pour Karim) : M3-Retour
- US19 Retours triés par urgence sur le tableau de bord (douleur, puis charge trop haute, puis à monter, puis conforme) : C1-Dashboard
- US20 Fiche coaché : dernier retour, prévu / réalisé, ajustement de charge par pas de 2,5 kg avec « Appliquer et prévenir Léa » : C3-Fiche
- US21 Messagerie : fil unique, avec des messages « événement » (retour envoyé, programme mis à jour) : M4-Messages

Règles :
- quand Karim applique un ajustement, mets à jour les séances futures du programme personnel de Léa, ajoute un message événement et marque le retour comme traité ;
- l'accueil de Léa affiche ses vraies données.

Respecte la Definition of Done de CLAUDE.md. Termine par la section Sprint 1 de docs/sprint-log.md, puis donne-moi le scénario de test à cliquer pour la Sprint Review.
```

**Tu vérifies :** dans deux fenêtres (une privée), envoie le retour en tant que Léa, ajuste en tant que Karim, puis regarde les messages de Léa.

---

## Prompt 2 : programmation personnalisée (Sprint 2)

```
Sprint 2. Sprint Goal : « Karim part d'un modèle, le personnalise pour un coaché et le lui envoie ; Léa voit sa progression. »

Stories :
- US12 Bibliothèque d'exercices avec recherche (nom, alias, catégorie) : panneau droit de C7-Editeur
- US13 Modèles de programme avec filtres et bouton « Personnaliser pour… » : C6-Modeles
- US14 Éditeur : semaines, séances A/B/C, exercice, consigne, séries, reps, charge, RPE visé, repos ; bandeau « Modèle de base → version personnalisée » avec les pastilles d'adaptation et le choix « Seulement pour Léa / Mettre aussi à jour le modèle » : C7-Editeur
- US15 Attribution : « Personnaliser pour… » crée une copie liée au coaché (jamais le modèle lui-même), et le coaché la reçoit dans son app
- US16 (bonus si le temps le permet) Progression automatique : si le RPE reste à 6 ou moins deux fois de suite, proposer +5 kg dans la fiche
- US30 Ma progression : charge au squat par semaine avec ligne d'objectif, assiduité, records : M5-Progression
- Liste des coachés : C2-Coaches

Termine par la section Sprint 2 de docs/sprint-log.md et le scénario de démo.
```

---

## Prompt 3 : acquisition et bilan (Sprint 3)

```
Sprint 3. Sprint Goal : « Nora réserve son bilan offert seule, Karim lit la synthèse et la convertit en coachée avec un programme personnalisé. »

Stories :
- US05 Page publique La Tanière avec le logo complet : P1-Accueil
- US06 Choix du créneau (format visio / salle, jours, horaires libres issus de availability_slots ; un créneau pris disparaît) : P2-Creneau
- US08 Questionnaire en 2 minutes, puis confirmation du rendez-vous : P3-Questionnaire et P4-Confirmation
- US07 Agenda de la semaine, demandes de bilan, lien de réservation à copier : C4-Agenda
- US09 Synthèse automatique (objectif, disponibilités, niveau, point de vigilance en orange) et modèle conseillé selon l'objectif et le niveau : C5-Bilan
- US10 Saisie des tests physiques pendant le bilan : C5-Bilan
- US11 « Convertir en coachée » : crée le profil client et ouvre l'éditeur sur le modèle conseillé, déjà personnalisé (ex. douleur lombaire : pastille « Dos : pas de charge lourde sur la colonne »)

Termine par la section Sprint 3 de docs/sprint-log.md et le scénario de démo.
```

---

## Prompt 4 : nutrition, fidélisation et connexions (Sprint 4)

```
Sprint 4. Sprint Goal : « Le suivi devient complet : nutrition personnalisée, renouvellement en un clic et appareils connectés (simulés). »

Stories :
- US23 Journal alimentaire : anneau des calories restantes, macros face aux objectifs, repas dépliables, compléments à cocher : M7-Nutrition
- US23 Ajouter un aliment : recherche dans foods, choix du repas, quantité avec calcul en direct, recettes en portions : M8-Aliment
- US27 et US28 Plan du jour (entraînement / repos), recettes et liste de courses à cocher, générée depuis le plan : M9-Plan
- US25 et US26 Côté coach : objectifs par type de jour, graphique de la semaine face à l'objectif, journal du jour avec commentaire, plan type adapté avec ses pastilles : C9-FicheNutrition
- US27 Espace Nutrition : suivi de tous les coachés, plans types avec « Personnaliser pour… » (copie personnalisée : calories recalculées selon le poids et l'objectif, aliments exclus), recettes : C10-Nutrition
- US32 Abonnements : échéances, rappel J-7 avec bilan de progression (envoi simulé), factures : C8-Abonnements, plus l'abonnement du coaché dans M6-Profil
- US35 Connexions simulées, avec icônes génériques et nom du service : M10-Connexions (coaché) et C11-Connexions (coach : agenda, objets connectés, paiement, notifications). « Connecter » injecte des données d'exemple (Withings : pesées visibles dans la fiche nutrition ; Garmin : activités dans la fiche). Strava n'est jamais visible côté coach.

Termine par la section Sprint 4 de docs/sprint-log.md.
```

---

## Prompt 5 : prêt pour le jour J

```
Préparation de la soutenance. Ne crée pas de nouvelle fonctionnalité.

1. Parcours tous les écrans en largeur ordinateur et mobile, puis corrige les écarts avec les maquettes et les bugs.
2. Vérifie les RLS : un coaché ne doit pas pouvoir lire les données d'un autre (écris un petit test).
3. US43 : ajoute « Réinitialiser la démo » dans C11-Connexions (section Réglages) : appel de reset_demo() avec confirmation.
4. Vérifie que npm run build passe, puis déploie en production sur Vercel.
5. Écris docs/demo.md : le scénario minute par minute (Nora réserve, Karim convertit et personnalise, Léa fait sa séance et envoie son retour, Karim ajuste, nutrition, renouvellement), avec les clics exacts et un plan B si le réseau tombe.
6. Complète docs/sprint-log.md avec un bilan global : stories livrées et reportées, vélocité par sprint.

Donne-moi l'URL de production et le scénario.
```
