# Spécification de Sécurité Firestore (Phase 0 : Payload-First Security TDD)

## 1. Invariants de Données (Data Invariants)

1. **Authentification & Vérification Email** : Toute opération de lecture ou d'écriture requiert un utilisateur authentifié (`request.auth != null`) disposant d'une adresse e-mail vérifiée (`request.auth.token.email_verified == true`).
2. **Intégrité d'Identité (`ownerId`)** : Aucun document (`SecretSantaEvent`, `Participant`, `WishItem`, `AnonymousMessage`) ne peut être créé ou modifié avec un `ownerId` différent de `request.auth.uid`.
3. **Master Gate Relationnel** : Aucun sous-document (`participants`, `wishes`, `messages`) ne peut exister ou être modifié sans que son événement parent `/events/{eventId}` existe et appartienne à `request.auth.uid`, et son champ `eventId` doit correspondre exactement au paramètre de chemin `{eventId}`.
4. **Verrouillage d'État Terminal (`completed`)** : Dès qu'un événement atteint `status == 'completed'`, aucune mise à jour ultérieure de l'événement n'est autorisée.
5. **Immuabilité des Champs Immortels** : Les champs `ownerId`, `eventId`, et `createdAt` ne peuvent jamais être modifiés lors d'un `update`.
6. **Intégrité Temporelle Serveur** : `createdAt` et `updatedAt` doivent égaler `request.time` à la création, et `updatedAt` doit égaler `request.time` à la mise à jour.
7. **Protection Anti-Empoisonnement & Limites Volumétriques** : Tous les identifiants de chemin respectent `^[a-zA-Z0-9_\-]+$` (taille <= 128), chaque chaîne de caractères est bornée en taille, et `excludedIds` est limité à 10 éléments maximum.
8. **Sécurité des Requêtes de Liste (`allow list`)** : Chaque règle `allow list` filtre strictement par `resource.data.ownerId == request.auth.uid` sans aucun appel `get()` ou `exists()` coûteux.

---

## 2. Les 12 Charges Utiles Malveillantes ("The Dirty Dozen" Payloads)

1. **Payload 1 (Identity Spoofing on Event Create)** : Création d'un événement avec `ownerId: "victim-uid-999"` alors que l'utilisateur connecté est `"attacker-uid-111"`.
2. **Payload 2 (Unverified Email Spoof)** : Création d'un événement par un utilisateur dont `email_verified` est `false`.
3. **Payload 3 (Shadow Field Injection on Create)** : Création d'un événement valide mais contenant un champ fantôme `"isSuperAdmin": true`.
4. **Payload 4 (Shadow Field Injection on Update / Update-Gap)** : Mise à jour d'un participant modifiant un champ non autorisé ou injectant `"hacked": "yes"`.
5. **Payload 5 (Value Poisoning on Update)** : Mise à jour d'un champ autorisé (`budget`) avec un type invalide (`"un million"`) ou une valeur hors bornes (`-50` ou `9999999`).
6. **Payload 6 (Terminal State Bypass)** : Tentative de modification d'un événement dont le statut existant est déjà `'completed'`.
7. **Payload 7 (Orphaned Subcollection Write)** : Création d'un participant dans `/events/non_existent_event/participants/p1` sans document parent existant.
8. **Payload 8 (Cross-Tenant Subcollection Hijack)** : Création d'un souhait dans l'événement d'un autre utilisateur (`/events/other_user_event/wishes/w1`).
9. **Payload 9 (Immortal Field Mutation)** : Mise à jour d'un événement tentant de modifier `createdAt` ou `ownerId`.
10. **Payload 10 (Forged Client Timestamp)** : Création d'un message anonyme avec un `createdAt` dans le passé ou le futur (`request.time - 1000s`).
11. **Payload 11 (Array Exhaustion / Unbounded List Attack)** : Création d'un participant avec `excludedIds` contenant 15 éléments (dépasse la limite stricte de 10).
12. **Payload 12 (Unauthorized Blanket List Scraping)** : Requête `list` sur `/events` sans filtre `where('ownerId', '==', auth.uid)` tentant de lire les événements d'autres utilisateurs.
