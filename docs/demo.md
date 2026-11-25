# Démo de soutenance — La Tanière Coach

Durée : 11 min 30 environ (10 à 12 min). Production : https://la-taniere-coach.vercel.app

Fil conducteur : Nora réserve seule son bilan, Karim la convertit en coachée, Léa s'entraîne et répond, Karim ajuste, puis nutrition et renouvellement. Une seule app remplace WhatsApp, le tableur et les relances.

## Comptes

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Coach (Karim) | karim@demo.la-taniere.fr | voir .env.local / fiche remise au groupe |
| Coachée (Léa) | lea@demo.la-taniere.fr | voir .env.local / fiche remise au groupe |
| Autres coachés | `<clé>@demo.la-taniere.fr` (clés : tom, yanis, ines, hugo, camille, sarah, malik, julie, theo) | voir .env.local / fiche remise au groupe |

En démo, on ne tape aucun mot de passe : les boutons « Je suis Karim » et « Je suis Léa » de la page d'accueil connectent côté serveur.

## Ce qu'il faut savoir sur les données

- La réinitialisation recrée déjà une demande « Nora Benali » (visio, questionnaire reçu, premier créneau libre après J+1). La réservation faite en direct crée une deuxième ligne « Nora Benali ». On ouvre celle qui porte la date et l'heure réservées en direct.
- Léa a déjà un retour non traité dans les données (« Squat facile, j'aurais pu mettre +5 kg », RPE 6). Après la démo, il reste dans la file : c'est normal, l'ajustement ne traite que le dernier retour.
- Les séances passées et celles du jour sont marquées faites par la réinitialisation. La carte de Léa affiche donc en général « Ta prochaine séance » (et non « Ta séance du jour »). On parle quand même de « séance du jour » à l'oral.
- Le titre de la séance dépend du jour de la soutenance : « Séance B — Soulevé de terre » avant le jeudi, « Séance A — Squat » à partir du jeudi.
- L'échéance de l'abonnement de Léa est à J-5 après réinitialisation.

## 0. Avant de commencer (hors chrono, 10 min avant)

1. Fenêtre normale, largeur ordinateur : ouvrir https://la-taniere-coach.vercel.app puis cliquer « Je suis Karim ».
2. Menu de gauche : « Connexions ». En bas, section « Réglages » : cliquer « Réinitialiser la démo », puis « Réinitialiser » dans la confirmation.
3. Attendre le message « Démo réinitialisée : toutes les données sont revenues à leur état de départ. »
4. Cliquer « Tableau de bord » : la page « Vue d’ensemble » s'ouvre. Laisser cette fenêtre ouverte.
5. Fenêtre de navigation privée, format téléphone (430 px environ) : ouvrir https://la-taniere-coach.vercel.app/decouvrir. Ne pas se connecter : Nora n'a pas de compte. Léa se connectera dans cette même fenêtre à l'étape (c).
6. Vérifier le réseau, couper les notifications, zoom navigateur à 110 %.
7. Ouvrir à l'avance, dans un onglet de côté, la démo prototype hors ligne (voir Plan B).

## Scénario minute par minute

### 0:00 – 0:45 · Introduction

- Qui : présentateur, fenêtre Karim.
- URL : https://la-taniere-coach.vercel.app (onglet de la fenêtre Karim, ou capture 01).
- Ce qu'on dit : « Karim perd du temps entre WhatsApp, Insta et SMS ; on a commencé par sa friction la plus forte, le suivi des coachés. »
- À l'écran : « Coacher plus, gérer moins. » et les trois entrées « Je suis Karim », « Je suis Léa », « Je découvre ».

### (a) 0:45 – 2:45 · Nora réserve son bilan offert

- Qui : fenêtre privée (Nora, sans compte).
- URL : /decouvrir puis /decouvrir/creneau, /decouvrir/questionnaire, /decouvrir/confirmation.

Clics :
1. Cliquer « Réserver mon bilan offert ».
2. « Format du bilan » : laisser « En visio ».
3. « Jour » : choisir un jour à partir de J+4 (les jours barrés sont complets).
4. « Horaires libres » : cliquer « 19:00 » (ou « 12:30 »).
5. Cliquer « Continuer · 19:00 ».
6. Page « Faisons connaissance », « Vos coordonnées » :
   - « Prénom et nom » : Nora Benali
   - « Téléphone » : 06 41 22 18 90
   - « E-mail (facultatif) » : laisser vide
7. « Questionnaire » :
   - « Votre objectif » : Perdre 5 kg et renforcer le dos
   - « Vos disponibilités pour vous entraîner » : 2 soirs par semaine et le samedi matin
   - « Votre niveau » : cliquer « Débutant »
   - « Douleurs ou blessures » : Douleur lombaire en fin de journée
   - « Votre sommeil (facultatif) » : 6 h par nuit
8. Cliquer « Réserver mon bilan offert ».

- Ce qu'on dit : « Nora réserve à 23 h sans écrire à Karim, et Karim reçoit un questionnaire déjà rempli. »
- À l'écran : « C’est réservé, Nora », « Votre bilan offert avec Karim est confirmé. », la date, l'heure, « En visio », puis « Karim vous envoie le lien par SMS au 06 41 22 18 90 avant le rendez-vous. »

### (b) 2:45 – 5:00 · Karim lit la synthèse, convertit et personnalise

- Qui : fenêtre Karim.
- URL : /coach/agenda, puis /coach/bilans/<id>, puis /coach/programmes/<id>.

Clics :
1. Menu de gauche : « Agenda ».
2. Bloc « Demandes de bilan » : cliquer la ligne « Nora Benali » qui porte la date et l'heure réservées en (a) (badge « Questionnaire reçu », « Bilan offert · Visio »).
3. Montrer, sans cliquer : « Point de vigilance » en orange (« Douleur lombaire en fin de journée », « Sommeil court : 6 h par nuit »), « Synthèse du questionnaire », et « Modèle conseillé » : « Mobilité et dos ».
4. Descendre à « Convertir en coachée » : « Modèle de départ » est déjà sur « Mobilité et dos (conseillé) ».
5. « Adaptations du programme » : laisser cochées « Dos : pas de charge lourde sur la colonne » et « Sommeil court : volume modéré, RPE 7 maximum ».
6. Cliquer « Convertir Nora en coachée ». L'éditeur du programme s'ouvre.
7. Montrer le bandeau : « Modèle de base « Mobilité et dos » → Version personnalisée pour Nora », avec les pastilles.
8. Carte « Séance B — Renfort dos », ligne « Tirage horizontal » (25 kg) : cliquer « Modifier ».
9. Fenêtre « Modifier Tirage horizontal » : « Charge » = 20. Laisser cochée « Appliquer aussi aux semaines suivantes » et choisie « Seulement pour Nora ».
10. Cliquer « Enregistrer l’exercice ».

- Ce qu'on dit : « Karim ne repart plus d'une page blanche : le modèle est copié pour Nora, adapté à son dos, et le modèle d'origine ne bouge pas. »
- À l'écran : message « Tirage horizontal enregistré sur 6 séances pour Nora », nouvelle pastille « Charge ajustée : Tirage horizontal 20 kg ».

### (c) 5:00 – 6:30 · Léa fait sa séance et envoie son retour

- Qui : fenêtre privée (Léa).
- URL : / puis /app, /app/seance/<id>, /app/seance/<id>/retour.

Clics :
1. Aller sur https://la-taniere-coach.vercel.app et cliquer « Je suis Léa ».
2. Page « Bonjour » : carte « Ta prochaine séance » (ou « Ta séance du jour » si une séance est prévue aujourd'hui). Cliquer « Voir ma séance ».
3. Série 1 du premier exercice : laisser « Répétitions » et « Charge (kg) » préremplis, cliquer « Valider ». Faire de même pour la série 2. La barre « Progression » avance.
4. Cliquer « Terminer la séance ».
5. « Effort ressenti (RPE) » : cliquer « 6 ».
6. « Ressenti » : cliquer « Douleur » pour montrer le champ « Où as-tu mal ? », puis revenir sur « Facile ».
7. « Un mot pour Karim (facultatif) » : Séance facile, je peux monter au squat.
8. Cliquer « Envoyer mon retour ».

- Ce qu'on dit : « Léa répond en 30 secondes, au bon moment ; Karim n'a plus besoin de la relancer. »
- À l'écran : « Merci, ton retour a été envoyé à Karim. » sur la page d'accueil de Léa.

### (d) 6:30 – 8:00 · Karim voit l'alerte et ajuste la charge

- Qui : fenêtre Karim, puis fenêtre privée (Léa).
- URL : /coach, puis /coach/coaches/<id>, puis /app/messages.

Clics :
1. Menu de gauche : « Tableau de bord ». Page « Vue d’ensemble », bloc « Retours à traiter » (compteur à jour).
2. Montrer l'ordre : « Douleur » d'abord (Tom, genou droit), puis la ligne de Léa avec le badge « À monter ».
3. Cliquer la ligne de Léa (« Séance facile, je peux monter au squat. »). La fiche s'ouvre.
4. « Dernier retour » : RPE 6, ressenti facile. Sous « Ajuster la charge », la suggestion : « Séance ressentie facile (RPE 6) : Léa peut monter de 2,5 kg. »
5. Ligne « Squat barre » (60 kg) : cliquer « +2,5 kg ».
6. « Aperçu » affiche « Squat barre 60 → 62,5 kg ». Cliquer « Appliquer et prévenir Léa ».
7. Fenêtre Léa : onglet « Messages ».

- Ce qu'on dit : « Karim traite le retour en un clic : la charge change sur toutes les séances à venir et Léa est prévenue sans un SMS. »
- À l'écran : côté Karim, « Programme mis à jour : Squat barre 60 → 62,5 kg. Léa est prévenue dans ses messages. » Côté Léa, l'événement « Programme mis à jour : Squat barre 60 → 62,5 kg » dans le fil.

### (e) 8:00 – 9:30 · Nutrition

- Qui : fenêtre privée (Léa), puis fenêtre Karim.
- URL : /app/nutrition, /app/nutrition/ajouter, puis /coach/nutrition et /coach/coaches/<id>/nutrition.

Clics côté Léa :
1. Onglet « Nutrition ».
2. Cliquer « Ajouter un aliment ».
3. Onglet « Aliments ». « Rechercher un aliment » : skyr. Choisir « Skyr nature ».
4. « Repas » : cliquer « Collation ». « Quantité » : 150 (g). Le calcul des calories s'affiche en direct.
5. Cliquer « Ajouter au journal ».

Clics côté Karim :
6. Menu de gauche : « Nutrition ». Bloc « Suivi des coachés » : cliquer la ligne de Léa Martin.
7. Section « Journal d’aujourd’hui » : sur la ligne « Skyr nature », cliquer « Commenter ».
8. « Commentaire visible par Léa » : Bien pour les protéines, garde cette collation avant la séance.
9. Cliquer « Enregistrer ».
10. Fenêtre Léa : recharger « Nutrition ».

- Ce qu'on dit : « Karim suit l'alimentation au même endroit que l'entraînement, sans captures d'écran envoyées sur WhatsApp. »
- À l'écran : côté Léa, le message « Ajouté à la collation : Skyr nature, … » puis, après le commentaire, l'encadré « Note de Karim, ton coach ». Côté Karim, la semaine face à l'objectif et le journal du jour.

### (f) 9:30 – 10:45 · Renouvellement

- Qui : fenêtre Karim, puis fenêtre privée (Léa).
- URL : /coach/abonnements, puis /app/messages.

Clics :
1. Menu de gauche : « Abonnements ».
2. Champ « Rechercher par nom ou formule » : Léa.
3. Ligne Léa Martin : « Échéance … », « dans 5 j ». Cliquer « Envoyer le rappel J-7 ».
4. Message « Rappel envoyé à Léa (simulation) ». Le bouton devient « Renvoyer le rappel J-7 ».
5. Cliquer « Renouveler ».
6. Fenêtre Léa : onglet « Messages ».

- Ce qu'on dit : « Le rappel part avec un bilan de progression chiffré : c'est l'argument de Karim pour le renouvellement. »
- À l'écran : côté Karim, « Abonnement de Léa renouvelé jusqu’au … Facture en attente créée. » et une facture « En attente » dans « Factures ». Côté Léa, « Rappel : ton abonnement … arrive à échéance le … (dans 5 jours). Ton bilan : … »

### 10:45 – 11:30 · Conclusion

- Qui : présentateur.
- Ce qu'on dit : « Cinq sprints, une boucle complète du bilan offert au renouvellement ; ce qui reste est noté dans le sprint log. »
- À l'écran : fenêtre Karim sur « Vue d’ensemble ».

## Plan B si le réseau tombe

1. Partage de connexion : activer le partage de connexion du téléphone (nom du réseau et code notés sur la fiche du groupe), reconnecter l'ordinateur, recharger la page en cours. Compter 30 secondes.
2. Démo prototype : ouvrir l'onglet préparé avec la démo prototype publiée ([LIEN DE LA DÉMO PROTOTYPE], artefact HTML autonome). Une fois ouverte, elle fonctionne hors ligne. Copie locale : `/home/claude/taniere/index.html`. Reprendre le scénario au même endroit.
3. Captures de secours, à faire la veille après une réinitialisation, en largeur ordinateur pour Karim et en format téléphone pour Léa et Nora. À ranger dans un dossier `captures-secours` sur le bureau et sur une clé USB :
   - `01-nora-creneau.png` : /decouvrir/creneau avec un jour et « 19:00 » choisis.
   - `02-nora-confirmation.png` : « C’est réservé, Nora ».
   - `03-karim-bilan-synthese.png` : bilan de Nora, point de vigilance et « Mobilité et dos ».
   - `04-karim-editeur-nora.png` : éditeur, bandeau « Version personnalisée pour Nora » et pastilles.
   - `05-lea-retour.png` : formulaire de retour rempli (RPE 6, « Facile », mot pour Karim).
   - `06-karim-vue-ensemble.png` : « Retours à traiter » avec la ligne de Léa « À monter ».
   - `07-karim-ajustement.png` : fiche de Léa, aperçu « Squat barre 60 → 62,5 kg ».
   - `08-karim-nutrition-lea.png` : journal d'aujourd'hui de Léa avec le commentaire.
   - `09-karim-abonnements.png` : ligne de Léa après rappel et renouvellement.
   - `10-lea-messages.png` : fil de Léa avec « Programme mis à jour » et le rappel.
4. Phrase de transition : « Le réseau de la salle nous lâche ; on passe sur la version enregistrée, le parcours est exactement le même. »

## Si quelque chose casse en direct

- Une page tourne dans le vide ou affiche une erreur : recharger la page (F5). Les données sont en base, rien n'est perdu.
- « Ta session a expiré. Reconnecte-toi. » ou « Session expirée » : revenir sur https://la-taniere-coach.vercel.app et cliquer « Je suis Karim » ou « Je suis Léa ». Si la page d'accueil n'apparaît pas, cliquer « Changer de profil » (menu de gauche pour Karim, onglet « Profil » pour Léa).
- Une action déjà faite pendant une répétition bloque la suite (« Ce prospect a déjà été converti. », « Retour déjà envoyé. ») : fenêtre Karim, « Connexions » → « Réglages » → « Réinitialiser la démo » → « Réinitialiser », puis reprendre à l'étape en cours. Léa doit recharger sa page.
- Mauvaise ligne « Nora Benali » ouverte (pas de bouton « Convertir Nora en coachée » attendu, ou date différente) : cliquer « ← Agenda » et ouvrir l'autre ligne.
- Un bouton ne répond plus : ne pas cliquer plusieurs fois. Attendre la fin du libellé « Enregistrement… », puis recharger.
- Rien ne repart : passer au Plan B, étape 2 ou 3.
