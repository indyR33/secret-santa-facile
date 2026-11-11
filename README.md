# 🎅 L'Atelier du Père Noël Secret — Mode d'emploi détaillé

Bienvenue dans **L'Atelier du Père Noël Secret**, l'application conçue pour organiser, animer et suivre vos échanges de cadeaux de fin d'année (famille, amis, collègues) en toute sérénité, tout en préservant le mystère le plus absolu !

---

## 📋 Table des matières

1. [Principes clés & Avantages](#-principes-clés--avantages)
2. [Authentification de l'Organisateur](#-authentification-de-lorganisateur)
   - [Option 1 : Connexion rapide via Google SSO](#option-1--connexion-rapide-via-google-sso)
   - [Option 2 : Inscription et Connexion par Email & Mot de passe](#option-2--inscription-et-connexion-par-email--mot-de-passe)
   - [Mot de passe oublié et réinitialisation](#mot-de-passe-oublié-et-réinitialisation)
   - [Note de configuration Firebase Console](#note-de-configuration-firebase-console)
3. [Guide de l'Organisateur](#-guide-de-lorganisateur)
   - [Étape 1 : Créer ou sélectionner un événement](#étape-1--créer-ou-sélectionner-un-événement)
   - [Étape 2 : Ajouter les participants](#étape-2--ajouter-les-participants)
   - [Étape 3 : Définir les règles d'exclusion (couples, doublons)](#étape-3--définir-les-règles-dexclusion-couples-doublons)
   - [Étape 4 : Définir des règles secrètes de tirage forcé (Organisateur uniquement)](#étape-4--définir-des-règles-secrètes-de-tirage-forcé-organisateur-uniquement)
   - [Étape 5 : Lancer le tirage au sort mathématique](#étape-5--lancer-le-tirage-au-sort-mathématique)
   - [Étape 6 : Transmettre les accès aux participants](#étape-6--transmettre-les-accès-aux-participants)
   - [Étape 7 : Suivre l'avancement global sans divulgation](#étape-7--suivre-lavancement-global-sans-divulgation)
   - [Étape 8 : Supprimer un atelier (irréversible)](#étape-8--supprimer-un-atelier-irréversible)
4. [Guide du Participant](#-guide-du-participant)
   - [Accéder à sa carte avec son code PIN](#accéder-à-sa-carte-avec-son-code-pin)
   - [Découvrir sa mission secrète](#découvrir-sa-mission-secrète)
   - [Consulter les souhaits de son destinataire](#consulter-les-souhaits-de-son-destinataire)
   - [Indiquer l'avancement de son cadeau](#indiquer-lavancement-de-son-cadeau)
   - [Rédiger sa propre liste au Père Noël](#rédiger-sa-propre-liste-au-père-noël)
   - [Utiliser la Poste Anonyme du Pôle Nord](#utiliser-la-poste-anonyme-du-pôle-nord)
5. [Modes de Sauvegarde (Local & Cloud Firestore)](#-modes-de-sauvegarde-local--cloud-firestore)
6. [Sécurité, Règles d'accès & Confidentialité](#-sécurité-règles-daccès--confidentialité)
7. [Questions Fréquentes & Dépannage](#-questions-fréquentes--dépannage)

---

## ✨ Principes clés & Avantages

- **Secret préservé pour les participants** : Chaque attribution est masquée derrière un code PIN individuel.
- **Authentification flexible pour l'organisateur** : Accès au choix par compte Google en 1 clic (SSO) ou par adresse e-mail avec mot de passe sécurisé.
- **Règles d'exclusion intelligentes** : Empêchez les conjoints, colocataires ou tirages récents de s'offrir mutuellement des cadeaux.
- **Règle secrète de tirage forcé** : L'organisateur peut imposer discrètement une attribution précise (ex. un invité particulier qui doit gâter une personne spécifique), sans que personne d'autre ne le sache.
- **Algorithme à retour sur trace (Backtracking MRV)** : Garantit un cycle de tirage mathématiquement parfait, sans impasses ni destinataires en double.
- **Listes de souhaits intégrées** : Liens marchands, descriptions (tailles, couleurs), prix estimatifs et priorités pour guider les lutins.
- **Suivi d'avancement collectif** : Une jauge globale permet de savoir où en est le groupe (en réflexion, acheté, emballé, prêt) sans révéler qui offre à qui.
- **Messagerie anonyme bidirectionnelle** : Posez des questions à votre destinataire ou répondez à votre Père Noël Secret sans divulguer les identités.

---

## 🔐 Authentification de l'Organisateur

L'organisateur peut se connecter pour synchroniser ses ateliers avec la base de données partagée Cloud Firestore. Deux modes d'authentification sont disponibles dans la boîte de dialogue accessible via le bouton **« Connexion Organisateur (Google SSO ou Email) »** présent en haut à droite :

### Option 1 : Connexion rapide via Google SSO
1. Cliquez sur le bouton **« Continuer avec Google »**.
2. Une fenêtre popup Google sécurisée s'ouvre.
3. Sélectionnez votre compte Google.
4. Votre profil est instantanément connecté et vos ateliers sont synchronisés avec la base Cloud Firestore.

### Option 2 : Inscription et Connexion par Email & Mot de passe
Si vous préférez ne pas utiliser de compte Google :
1. **Pour créer un compte** :
   - Basculez sur l'onglet **« Créer un compte »**.
   - Indiquez votre prénom ou nom complet (ex. *Marie Durand*).
   - Saisissez votre adresse e-mail et choisissez un mot de passe (au moins 6 caractères).
   - Cliquez sur **« Créer mon compte Organisateur »**.
   - Un e-mail de confirmation vous est envoyé automatiquement pour sécuriser votre adresse.
2. **Pour vous reconnecter plus tard** :
   - Restez sur l'onglet **« Se connecter »**.
   - Saisissez votre e-mail et votre mot de passe, puis validez.

### Mot de passe oublié et réinitialisation
- Si vous avez oublié votre mot de passe, cliquez sur le lien **« Mot de passe oublié ? »** sous le formulaire de connexion.
- Indiquez votre adresse e-mail et cliquez sur **« Envoyer le lien de réinitialisation »**.
- Vous recevrez immédiatement un lien sécurisé officiel Firebase pour définir un nouveau mot de passe.

> ℹ️ **Note de configuration Firebase Console** :  
> Le mode Google SSO et le mode Email/Mot de passe utilisent Firebase Authentication. Si vous clonez ou déployez le projet sur votre propre compte Firebase, assurez-vous que les deux fournisseurs suivants sont activés dans la console Firebase (**Authentication > Sign-in method**) :
> - **Google** (activé par défaut)
> - **Adresse e-mail/Mot de passe** (cocher *Activer*, et laisser *Lien par e-mail sans mot de passe* désactivé)

---

## 🎩 Guide de l'Organisateur

### Étape 1 : Créer ou sélectionner un événement
1. En haut à droite de l'écran, cliquez sur le bouton **« Nouvel Événement »**.
2. Remplissez les informations de votre fête :
   - **Nom de l'événement** (ex. *Noël de la Famille Moreau 2026* ou *Secret Santa Équipe Tech*).
   - **Message d'accueil ou thème** (ex. *Cadeau insolite ou fait main avec amour*).
   - **Date prévue de l'échange** (ex. le 24 décembre).
   - **Lieu de rendez-vous** (ex. *Chalet familial* ou *Salle de pause*).
   - **Budget maximum conseillé** en euros (ex. *25 €* ou *35 €*).
3. Cliquez sur **« Créer l'Atelier Secret Santa »**. Votre événement devient automatiquement l'événement actif.

### Étape 2 : Ajouter les participants
Dans l'onglet **« Atelier & Tirage »** (section *01. Lutins Participants*) :
1. Renseignez le **Prénom ou surnom** de la personne (ex. *Camille*).
2. Ajoutez un **Indice ou une note sur ses goûts** (ex. *Amatrice de romans graphiques & thés fumés*).
3. Indiquez son **Code PIN initial à 4 chiffres** (par défaut `1234`, que le participant pourra modifier lors de sa première visite).
4. Cliquez sur **« Ajouter »**. Répétez l'opération pour chaque participant (au moins 3 participants requis).

### Étape 3 : Définir les règles d'exclusion (couples, doublons)
Dans la colonne de droite *02. Règles d'Exclusion & Tirage* :
1. Sélectionnez **Participant A** (ex. *Camille*) et **Participant B** (ex. *Thomas*).
2. Cochez **« Exclusion réciproque (couple A ↔ B) »** si vous souhaitez interdire que Camille tire Thomas ET que Thomas tire Camille.
3. Décochez la case si vous souhaitez une exclusion à sens unique (ex. *Lucas a déjà offert un cadeau à Emma l'an dernier*).
4. Cliquez sur **« Ajouter / Basculer la règle »**.
5. L'application teste en temps réel si une combinaison sans impasse reste mathématiquement possible. Si le voyant vert s'affiche, tout est parfait !

### Étape 4 : Définir des règles secrètes de tirage forcé (Organisateur uniquement)
Dans la sous-section dédiée bordée de rouge : **« 🔒 Règle Secrète : Tirage Forcé (Organisateur uniquement) »** :
1. **Pourquoi l'utiliser ?**  
   Parfois, vous souhaitez qu'un participant précis offre obligatoirement son cadeau à une personne ciblée (par exemple un secret de famille, une réconciliation, un cadeau préparé de longue date ou un clin d'œil spécial).
2. **Comment créer une règle forcée ?**
   - Sélectionnez le **Donneur imposé** dans le premier menu déroulant (ex. *Thomas*).
   - Sélectionnez la **Cible imposée** dans le deuxième menu (ex. *Camille*).
   - Cliquez sur **« Imposer cette règle secrète »**.
3. **Règles de cohérence automatique** :
   - Un participant ne peut jamais être forcé à s'offrir un cadeau à lui-même.
   - Deux donneurs ne peuvent pas forcer la même cible (chaque participant ne reçoit qu'un seul cadeau).
   - Si une règle d'exclusion contradictoire existait entre ces deux personnes, elle est automatiquement levée au profit de la règle forcée.
4. **Visibilité & Confidentialité absolue** :
   - Cette règle n'apparaît **QUE** dans cette section réservée à l'organisateur.
   - Sur les cartes de tirage, les enveloppes scellées et les liens partagés des participants, **rien n'indique qu'une règle forcée a été appliquée** : le résultat ressemble trait pour trait à un tirage au sort totalement aléatoire.
5. **Suppression** :
   - Vous pouvez retirer une règle forcée à tout moment en cliquant sur le bouton corbeille rouge à côté de la ligne correspondante dans la liste des attributions forcées actives.

### Étape 5 : Lancer le tirage au sort mathématique
1. Dès que tous les participants, exclusions et éventuels tirages forcés sont prêts, cliquez sur le bouton rouge **« Lancer le Tirage au Sort Secret »**.
2. L'algorithme priorise d'abord les attributions forcées, puis calcule par retour sur trace (*MRV backtracking*) un cycle aléatoire complet qui satisfait toutes les exclusions sans aucune boucle courte.
3. Les enveloppes sont alors scellées et le statut passe à *« Tirage validé »*.
4. *Remarque :* Si une modification doit intervenir avant Noël, cliquez sur **« Réinitialiser »** pour réouvrir le tirage.

### Étape 6 : Transmettre les accès aux participants (Accès Invité sans inscription)
Les participants n'ont **aucune obligation de se connecter ou de créer un compte**. L'accès est instantané et direct :
- **Méthode 1 (Lien individuel secret recommandé)** : Sur la ligne de chaque participant, cliquez sur **« Lien secret »** pour copier son URL d'accès direct (`?event=...&participant=...`). Lorsqu'il ouvre ce lien sur son smartphone ou son ordinateur, l'application charge directement l'atelier réel depuis Firestore, se positionne sur ses cartes et ouvre la boîte de saisie de son code PIN.
- **Méthode 2 (Lien général de l'atelier)** : Cliquez sur le bouton vert **« Partager l'atelier »** dans la barre supérieure pour copier l'URL globale de l'événement (`?event=...`). Chaque invité n'a plus qu'à cliquer sur son enveloppe et saisir son code PIN.

### Étape 7 : Suivre l'avancement global sans divulgation
Sur le tableau de bord :
- Le bandeau supérieur résume la jauge collective : *X cadeaux achetés*, *Y emballés*, *Z prêts sous le sapin*.
- La liste des participants affiche l'état d'avancement du cadeau destiné à chacun (ex. *« Cadeau pour Thomas : Acheté »*), sans jamais afficher qui en est l'auteur.

### Étape 8 : Supprimer un atelier (irréversible)
Si une fête est terminée ou annulée et que vous souhaitez faire du ménage :
1. Dans le sélecteur d'événement en haut de la page, choisissez l'atelier à supprimer.
2. Cliquez sur le bouton rouge **« Supprimer l'atelier »** situé à côté du menu déroulant (visible uniquement pour l'organisateur connecté).
3. Une boîte de dialogue de confirmation récapitule le nom de la fête et son code d'invitation.
4. Cliquez sur **« Confirmer la suppression »**.
5. L'atelier, tous ses participants, le tirage au sort, les listes de souhaits et les messages anonymes sont définitivement supprimés de Firestore.

---

## 🎁 Guide du Participant

### Accéder à sa carte uniquement avec son lien (Sans connexion)
1. Cliquez sur le lien secret reçu de votre organisateur (par SMS, WhatsApp, e-mail, etc.).
2. **Aucune création de compte ni mot de passe organisateur n'est demandée** : vous êtes automatiquement reconnu en mode invité sur le véritable atelier de votre fête.
3. **Interface ultra-épurée et confidentielle pour les participants** :
   - Les blocs d'administration réservés à l'organisateur (bannière hero, barre d'outils, boutons d'administration de chaque participant, panneau des règles d'exclusion et tirage forcé) sont automatiquement masqués.
   - Les indicateurs chiffrés du bandeau supérieur sont allégés : seuls les chiffres clés (participants inscrits, budget, avancement %, courriers) sont affichés sans les sous-textes détaillés superflus.
   - La galerie publique des enveloppes de tous les participants est retirée : le participant accède directement à sa propre enveloppe via un déverrouillage sécurisé, puis consulte exclusivement son panneau de mission personnel sans être exposé aux enveloppes des autres participants.
   - La liste des lutins s'affiche en pleine largeur avec un design calme, sobre et sans boutons d'action d'organisateur.
4. Si le lien était personnalisé à votre prénom, la fenêtre de saisie de votre code PIN s'ouvre directement. Sinon, rendez-vous dans la section **« Cartes & Codes PIN »**, cliquez sur **« Déverrouiller mon Enveloppe »**, choisissez votre prénom et saisissez votre code PIN.
5. Saisissez votre **code PIN à 4 chiffres** (par défaut `1234` lors de la création, ou le code convenu avec votre organisateur).
6. Cliquez sur **« Briser le sceau et révéler »**.

### Découvrir sa mission secrète
Une fois déverrouillée, la bannière de mission s'illumine en vert :
- Elle vous révèle l'identité de votre cible : *« Votre mission secrète : offrir un cadeau à [Prénom] »*.
- Elle rappelle ses indices de goûts et le budget conseillé de la fête.
- Dès que vous avez terminé de consulter votre mission sur un appareil partagé, cliquez sur **« Refermer mon enveloppe »** pour verrouiller la vue.

### Consulter les souhaits de son destinataire
À droite de votre panneau de mission :
- La liste des envies déposées par votre destinataire s'affiche automatiquement.
- Vous y trouverez les titres, les détails précis (taille, couleur, édition), le prix indicatif et un lien direct vers les boutiques en ligne si disponible.

### Indiquer l'avancement de son cadeau
Dans votre panneau de mission, 4 boutons vous permettent d'actualiser discrètement votre progression :
1. **1. En réflexion** : Vous cherchez l'inspiration.
2. **2. Acheté** : Le cadeau est commandé ou en votre possession.
3. **3. Emballé** : Le paquet cadeau et son ruban sont prêts.
4. **4. Prêt !** : Le cadeau est prêt à être déposé sous le sapin le jour J.
*Le reste du groupe verra avancer la jauge globale sans savoir qui prépare quel cadeau !*

### Rédiger sa propre liste au Père Noël
1. Allez dans l'onglet **« Listes de Souhaits »**.
2. Dans le formulaire de gauche :
   - Sélectionnez votre nom dans le menu déroulant.
   - Indiquez le titre de votre envie (ex. *Livre d'art, écharpe en laine, jeu de société*).
   - Ajoutez des précisions (ex. *Taille M, coloris bleu nuit ou vert forêt*).
   - Renseignez le prix estimé et le niveau d'envie (*Rêve absolu*, *Coup de cœur* ou *Idée classique*).
   - Ajoutez un lien web marchand si vous avez un produit précis en tête.
3. Cliquez sur **« Ajouter à la Liste au Père Noël »**. Votre Père Noël Secret pourra la consulter immédiatement !

### Utiliser la Poste Anonyme du Pôle Nord
L'onglet **« Poste Anonyme »** permet de lever tous les doutes sans révéler les identités grâce à deux canaux étanches :
- **Canal 1 : Discussion avec ma Cible** (vous êtes le Père Noël Secret) :
  - Posez des questions discrètes à votre destinataire (ex. *« Préfères-tu le thé vert ou le thé noir ? »*, *« Quelle est ta pointure ? »*).
  - Vos messages apparaîtront chez lui sous le nom de **« Père Noël Secret »**.
- **Canal 2 : Discussion avec mon Père Noël Secret** (vous êtes le destinataire) :
  - Répondez aux questions que votre mystérieux bienfaiteur vous a posées.
  - Vous ne connaissez pas son nom, mais vous pouvez le guider précisément dans son choix !

---

## ☁️ Modes de Sauvegarde (Local & Cloud Firestore)

L'application prend en charge deux modes d'utilisation :

### 1. Mode Atelier Interactif (Local)
- Utilisable immédiatement sans aucune inscription ni configuration.
- Comprend un événement d'exemple complet (*Famille Moreau 2026*) avec des participants, des exclusions de couples, des listes de souhaits et des messages de démonstration.
- Idéal pour tester le fonctionnement, faire des simulations de tirage ou organiser un événement sur un seul ordinateur partagé.

### 2. Mode Cloud Firebase Firestore (Partagé & Temps Réel)
- Connectez-vous avec Google ou avec votre compte Email/Mot de passe.
- Vos événements, participants, listes de souhaits et courriers anonymes sont synchronisés en direct sur la base de données Firestore.
- Si vous démarrez sur un compte vierge, un bouton vert **« Importer l'Atelier d'Exemple »** vous permet d'importer en un clic toutes les données types pour vous inspirer.
- Plusieurs participants peuvent se connecter simultanément depuis leurs téléphones portables respectifs.

---

## 🛡️ Sécurité, Règles d'accès & Gestion des Clés / Secrets

L'application respecte les principes de sécurité recommandés par Google et l'industrie :

### 1. Pourquoi la clé `"apiKey"` dans `firebase-applet-config.json` n'est PAS un secret ?
Il est fréquent de confondre la clé API Firebase avec une clé secrète de serveur (comme une clé API Stripe ou une clé privée de service). Dans l'architecture Google Cloud / Firebase :
- **La clé API Firebase est un identifiant public de projet** : Elle sert uniquement à router les requêtes du navigateur vers le bon projet Google.
- **Documentation officielle Firebase** : *"Contrairement aux clés d'API classiques, les clés d'API des services Firebase ne permettent pas d'autoriser l'accès aux données. Elles identifient uniquement votre projet auprès des serveurs de Google. Il est tout à fait normal et sécurisé de les inclure dans le code client ou dans une application web publique."*
- **La véritable barrière de sécurité** : L'accès à vos données n'est pas protégé par le fait de masquer cette clé (qui est de toute façon visible dans les requêtes réseau de n'importe quelle application web), mais **exclusivement par Firebase Authentication et les règles de sécurité Firestore (`firestore.rules`)** exécutées côté serveur par Google.

### 2. Règles de Sécurité Firestore Côté Serveur (`firestore.rules`)
Les règles de sécurité déployées interdisent tout accès non sollicité :
- **Principe de fermeture par défaut (*Default-Deny Catch-All*)** : Toute requête non explicitement autorisée est immédiatement rejetée avec `PERMISSION_DENIED`.
- **Contrôle d'accès basé sur l'identité (ABAC)** :
  - Seuls les organisateurs authentifiés (Google SSO avec e-mail vérifié ou compte Email/Mot de passe valide) peuvent créer, mettre à jour ou supprimer des événements et la liste des participants.
  - L'organisateur ne peut accéder et modifier que ses propres événements (`ownerId == request.auth.uid`).
  - Les modifications de règles forcées (`forcedReceiverId`) sont protégées par une validation de schéma typée et un contrôle des clés autorisées.
  - Les participants peuvent mettre à jour leur propre code PIN, leur statut d'avancement de cadeau, leurs listes de souhaits et leurs courriers anonymes.

### 3. Données de Démonstration Fictives vs Données Réelles
- Les codes PIN (`'1234'`) ou correspondances visibles dans le fichier `src/app/services/secret-santa-store.ts` constituent uniquement des **données d'exemple fictives** pour alimenter le mode démonstration hors-ligne (*Famille Moreau*).
- Dès que vous créez votre propre atelier, les codes PIN et les tirages au sort réels sont générés dynamiquement et protégés derrière les règles de sécurité Firestore.

### 4. Variables d'Environnement et Clés Serveur
- Le fichier `.env.example` ne contient **aucun secret réel** (uniquement des placeholders d'exemple comme `MY_GEMINI_API_KEY`).
- Si une clé d'API tierce ou un secret serveur (comme une clé Gemini) doit être utilisée, elle est strictement confinée au backend Express (`src/server.ts`) et n'est jamais exposée dans le bundle Angular client.

### 5. Déposer le projet sur GitHub (.gitignore & fichier d'exemple)
Si vous publiez ce projet sur un dépôt GitHub (public ou partagé) :
- Le fichier `firebase-applet-config.json` contenant vos identifiants de base personnelle est **inscrit dans `.gitignore`** afin de ne pas être committé sur votre dépôt.
- Un fichier modèle **`firebase-applet-config.example.json`** est fourni.
- Tout développeur clonant le projet peut simplement copier ce fichier modèle en `firebase-applet-config.json` et renseigner ses propres identifiants Firebase.
- Cela protège vos quotas Firestore personnels contre les requêtes non désirées de tiers clonant votre code, et évite les fausses alertes des scanners GitHub (GitGuardian / Secret Scanning).

---

## 💡 Questions Fréquentes & Dépannage

### Que faire si l'application m'indique que le tirage est impossible ?
Si le message *« Combinaison impossible : les règles d'exclusion actuelles bloquent toutes les permutations valides »* s'affiche, cela signifie que les contraintes d'exclusion ou de tirage forcé sont trop restrictives.  
👉 **Solution** : Retirez une ou deux exclusions dans la liste ou vérifiez qu'une règle forcée ne bloque pas les dernières options disponibles.

### Un participant peut-il savoir si son Père Noël a été tiré au sort ou forcé ?
Non. Le système traite l'attribution forcée de façon totalement transparente dans le cycle du Secret Santa. Pour le participant, sa carte de mission affiche uniquement l'identité de sa cible, identique à n'importe quel tirage aléatoire standard.

### Un participant a-t-il le droit de changer son code PIN ?
Oui ! Une fois son enveloppe déverrouillée avec le code PIN initial, un champ en bas de son panneau de mission lui permet d'enregistrer un nouveau code PIN personnel à 4 chiffres de son choix.

### L'organisateur peut-il tricher et voir qui offre à qui ?
L'organisateur ne dispose d'aucun tableau global dévoilant toutes les paires aléatoires. Seules les règles forcées qu'il a lui-même expressément configurées sont connues de lui. Toutes les autres paires restent scellées derrière les codes PIN individuels des participants.

### Comment réinitialiser le tirage si une personne se désiste ?
Dans l'onglet **« Atelier & Tirage »**, cliquez sur **« Réinitialiser »**. Cela efface les correspondances secrètes et remet l'événement en statut *Brouillon*, vous permettant de retirer ou d'ajouter des participants avant de relancer un tirage tout neuf.

### Est-il possible de supprimer un atelier ?
Oui, tout à fait ! L'organisateur peut supprimer n'importe quel atelier (et toutes les données associées : participants, tirage, souhaits, messages) en cliquant sur le bouton **« Supprimer l'atelier »** situé à côté du sélecteur d'événement en haut de page. Une boîte de confirmation sécurisée demande validation avant la suppression définitive.

---

*Joyeuses fêtes et excellents préparatifs dans l'Atelier du Père Noël Secret ! 🎄✨*
