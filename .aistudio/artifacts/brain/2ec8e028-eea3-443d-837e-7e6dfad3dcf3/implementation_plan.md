# L'Atelier du Père Noël Secret — Organisation & Suivi de Secret Santa

Une application web collaborative et ludique en français permettant d'organiser des tirages au sort « Secret Santa » sur mesure, de gérer les listes de souhaits, de suivre l'avancement des cadeaux sans gâcher la surprise et d'échanger anonymement entre participants en temps réel.

## Revue Utilisateur & Décisions Clés

> [!IMPORTANT]
> Ce plan intègre toutes vos préférences confirmées lors de la phase de clarification. Lors du lancement de la construction, l'assistant configurera **Firebase (Firestore & Authentification)** via l'interface dédiée d'AI Studio afin d'activer la base de données temps réel sécurisée.

- **Mode de révélation confirmé** : Accès par **liens secrets individuels et protection par code PIN à 4 chiffres** par participant, permettant à chacun de découvrir sa mission secrète sans que l'organisateur ne voie les attributions des autres.
- **Périmètre fonctionnel complet confirmé** :
  1. **Règles d'exclusion intelligentes** (couples, membres d'un même foyer, tirages de l'année précédente) résolues par un algorithme de recherche de cycle sans impasse.
  2. **Listes de souhaits interactives** avec idées cadeaux, liens marchands, prix estimé, niveau de priorité et respect du budget de l'événement.
  3. **Suivi de l'état des cadeaux** (*En réflexion*, *Acheté*, *Emballé*, *Prêt sous le sapin*) avec vue globale anonymisée pour le groupe et tableau de bord d'avancement pour l'organisateur.
  4. **Messagerie anonyme bidirectionnelle** permettant à chaque participant de discuter à la fois avec la personne qu'il a tirée (« Ma Cible ») et avec la personne qui l'a tiré (« Mon Père Noël Secret ») sans jamais dévoiler les identités.
- **Persistance des données confirmée** : Synchronisation en temps réel via **Firebase Firestore** avec règles de sécurité Zero-Trust.
- **Direction artistique confirmée** : **Atelier du Père Noël illustré, ludique et coloré**, alliant chaleur artisanale, illustrations sur mesure et lisibilité irréprochable.

---

## 1. Vue d'Ensemble & Concept

- **Ce que fait l'application** : Elle accompagne un groupe d'amis, une famille ou des collègues depuis la création de l'événement jusqu'au jour de l'échange des cadeaux. L'organisateur configure l'événement (date, lieu, budget maximum, participants, exclusions), lance le tirage mathématique garanti sans conflit, puis partage l'espace de l'événement.
- **Public cible & Contexte** : Familles, groupes d'amis et équipes en entreprise cherchant une expérience chaleureuse en français, utilisable aussi bien sur grand écran que sur mobile.
- **Valeur ajoutée** : Zéro divulgation accidentelle des tirages (même pour l'organisateur), relance ludique grâce au suivi d'avancement des cadeaux et suppression des pannes d'inspiration grâce aux listes de souhaits et au chat anonyme.

---

## 2. Expérience Utilisateur & Design Visuel

### Parcours Utilisateur Clés

1. **Accueil & Création d'Événement (L'Atelier)** :
   - Connexion rapide pour créer ou retrouver ses événements synchronisés, ou accès direct à un événement partagé via son code/lien.
   - Création guidée d'un événement : Nom de la fête, date de l'échange, budget conseillé (ex. `25 €`), message d'accueil et ajout des participants.
2. **Atelier des Règles d'Exclusion & Tirage** :
   - Matrice visuelle intuitive permettant de définir des exclusions mutuelles (ex. *Marie ↔ Thomas* pour un couple) ou directionnelles (ex. *Lucas → Emma* tiré l'an dernier).
   - Vérification instantanée de la faisabilité mathématique du tirage avant validation et génération des attributions secrètes.
3. **Espace Participant & Révélation par Code PIN** :
   - En cliquant sur son nom ou son lien personnel, le participant choisit (lors de sa première visite) ou saisit son **code PIN personnel à 4 chiffres**.
   - Une animation d'ouverture de carte scellée dévoile le nom de son destinataire secret, sa liste de souhaits et les outils de mission.
4. **Gestion des Souhaits, Suivi du Cadeau & Chat Anonyme** :
   - **Ma Liste au Père Noël** : Ajout/modification de ses propres envies cadeaux (titre, description, lien URL, prix indicatif, coup de cœur).
   - **Ma Mission Secrète** : Consultation de la liste de souhaits de sa cible et mise à jour de la jauge d'avancement du cadeau (*Idée trouvée* → *Acheté* → *Emballé* → *Prêt*).
   - **Bureau de Poste Anonyme** : Deux fils de discussion distincts et étanches :
     - *Discussion avec ma cible* (je suis le Père Noël Secret, je pose des questions sur ses goûts ou sa taille).
     - *Discussion avec mon Père Noël Secret* (je réponds aux questions de celui ou celle qui me prépare un cadeau).

### Identité Visuelle & Thème (« Atelier du Père Noël Illustré »)

- **Direction Esthétique** : Un univers d'atelier de jouets artisanal et joyeux — papier parchemin crème chaleureux, bois d'établi, rouge carmin festif, vert sapin profond et touches d'or cuivré, ponctué d'illustrations sur mesure générées pour l'application (bannière de l'atelier des lutins, sceau de tirage secret, boîte aux lettres du Pôle Nord).
- **Palette de Couleurs (Discipline 60-30-10)** :
  - **60% Canevas Neutre Chaleureux (`--background`)** : Crème parchemin doux (`#FFFDF9`) offrant un contraste optimal et une lecture reposante.
  - **30% Surfaces Structurelles (`--surface`)** : Cartes d'atelier blanc pur (`#FFFFFF`) et beige sablé (`#F7F2E7`) délimitées par de fines bordures chaudes (`#E6DEC8`). Texte principal en brun-ardoise profond (`#1E1B18`) garantissant un contraste conforme WCAG AA (> 12:1).
  - **10% Accents Festifs & Sémantiques (`--primary` / `--accent`)** :
    - Rouge Atelier (`#C81E32`) pour les actions principales (tirage, révélation, envoi).
    - Vert Sapin (`#166534`) pour les validations et cadeaux prêts.
    - Ambre Doré (`#D97706`) pour les étapes en cours (cadeau acheté/en préparation).
- **Typographie & Hiérarchie (Règle 2+1 Polices)** :
  - *Titres & En-têtes Display* : **Fraunces** (serif expressif au charme éditorial et conte de Noël) avec équilibrage des lignes (`text-wrap: balance`).
  - *Corps de Texte & Contrôles* : **Plus Jakarta Sans** (sans-serif géométrique ultra-lisible pour les formulaires, listes et messages).
  - *Données Chiffrées, Budgets, Dates & Codes PIN* : **JetBrains Mono** avec chiffres tabulaires (`tabular-nums`) pour l'alignement parfait des prix, compteurs de jours avant Noël et jauges de progression.
- **Architecture de Mise en Page & Barre de Navigation** :
  - **Barre supérieure à 3 zones strictes** : Marque à gauche (*L'Atelier Secret*), 4 liens de navigation sur une seule ligne au centre (*Mes Événements*, *Participants & Tirage*, *Listes de Souhaits*, *Poste Anonyme*), et 1 bouton d'action principal à droite (*Nouvel Événement*).
  - **Élévation unique** : Pas de cartes imbriquées ni de badges superflus ; les métadonnées (budget, date, nombre de participants) sont présentées en texte épuré séparé par des points médians (`·`).

---

## 3. Décisions Produit & Arbitrages Techniques

- **Décision 1 : Protection du Secret vis-à-vis de l'Organisateur**
  - *Approche choisie* : Stockage séparé des tirages dans une sous-collection dédiée aux missions et verrouillage de l'interface de révélation par un jeton personnel / code PIN participant, sans jamais afficher le tableau complet des paires à l'écran de l'organisateur.
  - *Pourquoi* : L'organisateur participe presque toujours lui-même au Secret Santa ; s'il voyait la liste des paires en gérant l'événement, la surprise serait gâchée.
  - *Alternative écartée* : Tableau récapitulatif visible par l'administrateur (gâche le jeu pour l'organisateur).

- **Décision 2 : Algorithme de Tirage par Graphe Dirigé & Backtracking**
  - *Approche choisie* : Modélisation des participants et de leurs exclusions sous forme de graphe dirigé, avec recherche aléatoire d'un dérangement valide (permutation sans point fixe ni arête interdite) via algorithme de *backtracking* déterministe après mélange de Fisher-Yates.
  - *Pourquoi* : Garantit à 100 % que personne ne se tire soi-même, que toutes les règles d'exclusion sont respectées et que chaque participant reçoit exactement un cadeau, tout en détectant immédiatement si des règles trop strictes rendent le tirage mathématiquement impossible.
  - *Alternative écartée* : Tirage naïf par essais successifs aléatoires (risque de boucle infinie ou d'impasse sur le dernier participant).

- **Décision 3 : Suivi des Cadeaux Anonymisé au Niveau du Groupe**
  - *Approche choisie* : Sur le tableau de bord général de l'événement, l'avancement global est affiché sous forme de compteurs collectifs (ex. *4 cadeaux achetés · 2 emballés · 1 prêt*) et le statut individuel indique uniquement l'avancement du Père Noël de chaque participant sans jamais révéler qui est ce Père Noël.
  - *Pourquoi* : Crée une émulation collective festive et rassure l'organisateur sur le fait que personne ne sera oublié, tout en préservant une confidentialité absolue.

---

## 4. Architecture Technique & Stratégie de Données

### Diagramme d'Architecture & Hiérarchie des Composants

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   Barre Supérieure (3 Zones : Marque · Nav · Action)       │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────────────┐
│                     Orchestrateur d'Application (Angular)                  │
├──────────────────────┬───────────────────────────┬─────────────────────────┤
│  Vue Atelier &       │  Vue Participant &        │  Vue Listes de Souhaits │
│  Configuration       │  Mission Secrète          │  & Poste Anonyme        │
│  ┌────────────────┐  │  ┌─────────────────────┐  │  ┌───────────────────┐  │
│  │ Créateur       │  │  │ Sélecteur Identité  │  │  │ Éditeur de        │  │
│  │ d'Événement    │  │  │ & Verrou Code PIN   │  │  │ Liste de Souhaits │  │
│  ├────────────────┤  │  ├─────────────────────┤  │  ├───────────────────┤  │
│  │ Matrice Règles │  │  │ Carte de Révélation │  │  │ Fil Anonyme       │  │
│  │ d'Exclusion    │  │  │ Animée (Ma Cible)   │  │  │ -> Vers ma Cible  │  │
│  ├────────────────┤  │  ├─────────────────────┤  │  ├───────────────────┤  │
│  │ Moteur Tirage  │  │  │ Sélecteur Statut    │  │  │ Fil Anonyme       │  │
│  │ (Backtracking) │  │  │ Cadeau (4 étapes)   │  │  │ <- De mon Santa   │  │
│  └───────┬────────┘  │  └──────────┬──────────┘  │  └─────────┬─────────┘  │
└──────────┼───────────┴─────────────┼──────────────────────────┼────────────┘
           │                         │                          │
           ▼                         ▼                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│              Service Temps Réel & Sécurité (Firebase SDK)                  │
│   • Authentification Google + Gestion des sessions d'événement             │
│   • Écouteurs temps réel (onSnapshot) avec gestionnaire d'erreurs dédié    │
│   • Validation stricte des charges utiles avant écriture                   │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Base de Données Firebase Firestore                      │
│   ├── /events/{eventId}                     (Métadonnées, budget, statut)  │
│   ├── /events/{eventId}/participants/{pId}  (Nom, avatar, statut cadeau)   │
│   ├── /events/{eventId}/assignments/{pId}   (Cible secrète, hash PIN)      │
│   ├── /events/{eventId}/wishes/{wishId}     (Idées cadeaux, budget, lien)  │
│   └── /events/{eventId}/messages/{msgId}    (Canal anonyme Santa <-> Cible)│
└────────────────────────────────────────────────────────────────────────────┘
```

### Modèle de Données & Sécurité Firestore

- **Événement (`events/{eventId}`)** : Titre, description, date de l'échange, budget maximum en euros, code d'invitation court, identifiant du créateur (`ownerId`), état du tirage (`draft` | `drawn` | `completed`), et liste bornée des règles d'exclusion.
- **Participant (`events/{eventId}/participants/{participantId}`)** : Prénom/surnom, couleur/illustation d'avatar, indicateur d'initialisation du code PIN, et état d'avancement du cadeau qu'il prépare (`idea` | `bought` | `wrapped` | `ready`).
- **Attribution Secrète (`events/{eventId}/assignments/{giverParticipantId}`)** : Identifiant du participant destinataire (`receiverParticipantId`), empreinte du code PIN à 4 chiffres permettant de protéger l'ouverture de la carte sur tout appareil, et horodatage de révélation.
- **Souhaits (`events/{eventId}/wishes/{wishId}`)** : Identifiant du participant auteur, titre du cadeau, prix estimé, lien optionnel, priorité (`normal` | `high` | `dream`) et notes (taille, couleur).
- **Messages Anonymes (`events/{eventId}/messages/{messageId}`)** : Identifiant du couple de conversation indexé par le destinataire du cadeau (`targetParticipantId`), rôle de l'expéditeur (`santa` ou `recipient`), contenu du message validé et horodatage serveur. Ainsi, le destinataire ne voit jamais l'identifiant du Père Noël dans le message.

### Correspondance Composants Interactifs & Transitions d'État

- **Création & Règles d'Exclusion** : Validation immédiate des champs (budget positif, noms uniques, au moins 3 participants pour un tirage valide). Ajout/suppression dynamique de règles d'exclusion avec test de solvabilité du graphe en direct.
- **Exécution du Tirage au Sort** : Calcul du cycle sans conflit, écriture atomique par lot (`writeBatch`) des attributions et passage du statut de l'événement à `drawn`. Une fois le tirage effectué, la liste des participants est verrouillée pour garantir l'intégrité des paires.
- **Déverrouillage par Code PIN / Lien Individuel** : Génération d'un lien direct partageable en un clic (copie dans le presse-papiers avec notification de confirmation) pour chaque participant. Saisie du code PIN à 4 chiffres avec retour visuel immédiat.
- **Suivi de Cadeau & Souhaits** : Changement d'étape en un clic sur les 4 états du cadeau avec mise à jour instantanée de la barre de progression globale de l'atelier. Filtrage des souhaits par participant et tri par prix ou priorité.
- **Messagerie Anonyme Temps Réel** : Bascule fluide entre l'onglet *« Discussion avec ma cible »* et *« Discussion avec mon Père Noël Secret »*, envoi instantané avec défilement automatique et étiquettes d'identité masquées (*« Votre Père Noël Secret »* / *« Votre Destinataire »*).
