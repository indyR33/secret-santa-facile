import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Firestore,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import {
  AnonymousMessage,
  AnonymousSenderRole,
  BLUEPRINT_CONSTRAINTS,
  DrawValidationResult,
  EventStatus,
  GiftStatus,
  Participant,
  SecretSantaEvent,
  WishItem,
  WishPriority,
} from '../models/secret-santa.model';
import { DrawEngine } from './draw-engine';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const AVATAR_PALETTE = [
  '#C81E32',
  '#166534',
  '#B45309',
  '#1E3A8A',
  '#7C2D12',
  '#6B21A8',
  '#0F766E',
  '#9D174D',
];

@Injectable({
  providedIn: 'root',
})
export class SecretSantaStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly drawEngine = inject(DrawEngine);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;

  private eventsUnsub: Unsubscribe | null = null;
  private participantsUnsub: Unsubscribe | null = null;
  private wishesUnsub: Unsubscribe | null = null;
  private messagesUnsub: Unsubscribe | null = null;

  // Signaux d'état d'authentification et de mode
  readonly currentUser = signal<User | null>(null);
  readonly authReady = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly toastMessage = signal<string | null>(null);
  readonly errorBanner = signal<string | null>(null);

  // Données Cloud Firestore (lorsque connecté)
  private readonly cloudEvents = signal<SecretSantaEvent[]>([]);
  private readonly cloudParticipants = signal<Participant[]>([]);
  private readonly cloudWishes = signal<WishItem[]>([]);
  private readonly cloudMessages = signal<AnonymousMessage[]>([]);

  // Données Atelier Démo / Local (avant connexion ou pour essai immédiat)
  private readonly localEvents = signal<SecretSantaEvent[]>(this.createInitialLocalEvents());
  private readonly localParticipants = signal<Participant[]>(this.createInitialLocalParticipants());
  private readonly localWishes = signal<WishItem[]>(this.createInitialLocalWishes());
  private readonly localMessages = signal<AnonymousMessage[]>(this.createInitialLocalMessages());

  readonly activeEventId = signal<string>('evt_famille_moreau_2026');

  // Signaux dérivés unifiés (Cloud si connecté avec événements ou mode Cloud actif, sinon Atelier Local)
  readonly isCloudConnected = computed(() => {
    const user = this.currentUser();
    return Boolean(user);
  });

  readonly events = computed<SecretSantaEvent[]>(() => {
    if (this.isCloudConnected()) {
      return this.cloudEvents();
    }
    return this.localEvents();
  });

  readonly activeEvent = computed<SecretSantaEvent | null>(() => {
    const list = this.events();
    const id = this.activeEventId();
    return list.find((e) => e.id === id) ?? list[0] ?? null;
  });

  readonly participants = computed<Participant[]>(() => {
    const evt = this.activeEvent();
    if (!evt) return [];
    const source = this.isCloudConnected() ? this.cloudParticipants() : this.localParticipants();
    return source
      .filter((p) => p.eventId === evt.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  });

  readonly wishes = computed<WishItem[]>(() => {
    const evt = this.activeEvent();
    if (!evt) return [];
    const source = this.isCloudConnected() ? this.cloudWishes() : this.localWishes();
    return source.filter((w) => w.eventId === evt.id);
  });

  readonly messages = computed<AnonymousMessage[]>(() => {
    const evt = this.activeEvent();
    if (!evt) return [];
    const source = this.isCloudConnected() ? this.cloudMessages() : this.localMessages();
    return source.filter((m) => m.eventId === evt.id);
  });

  readonly drawCheck = computed<DrawValidationResult>(() => {
    return this.drawEngine.solveSecretSantaDraw(this.participants());
  });

  readonly giftStats = computed(() => {
    const list = this.participants();
    const total = list.length;
    const idea = list.filter((p) => p.giftStatus === 'idea').length;
    const bought = list.filter((p) => p.giftStatus === 'bought').length;
    const wrapped = list.filter((p) => p.giftStatus === 'wrapped').length;
    const ready = list.filter((p) => p.giftStatus === 'ready').length;
    const revealed = list.filter((p) => p.hasRevealed).length;
    const progressPercent =
      total === 0
        ? 0
        : Math.round(((bought * 0.4 + wrapped * 0.75 + ready * 1.0) / total) * 100);

    return {
      total,
      idea,
      bought,
      wrapped,
      ready,
      revealed,
      progressPercent,
    };
  });

  constructor() {
    if (this.isBrowser) {
      this.initFirebase();
    } else {
      this.authReady.set(true);
    }
  }

  private initFirebase(): void {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId);
      this.auth = getAuth(this.app);

      void this.testConnection();

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser.set(user);
        this.authReady.set(true);

        if (user) {
          this.subscribeToUserEvents(user.uid);
        } else {
          this.clearSubscriptions();
          this.cloudEvents.set([]);
          this.cloudParticipants.set([]);
          this.cloudWishes.set([]);
          this.cloudMessages.set([]);
          this.activeEventId.set(this.localEvents()[0]?.id ?? '');
        }
      });
    } catch (err) {
      console.error('Erreur initialisation Firebase :', err);
      this.authReady.set(true);
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.db) return;
    try {
      await getDocFromServer(doc(this.db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  }

  private handleFirestoreError(
    error: unknown,
    operationType: OperationType,
    path: string | null
  ): never {
    const currentUser = this.auth?.currentUser;
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: currentUser?.uid,
        email: currentUser?.email,
        emailVerified: currentUser?.emailVerified,
        isAnonymous: currentUser?.isAnonymous,
        tenantId: currentUser?.tenantId,
        providerInfo:
          currentUser?.providerData?.map((provider) => ({
            providerId: provider.providerId,
            email: provider.email,
          })) || [],
      },
      operationType,
      path,
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    this.errorBanner.set(
      "Une erreur d'accès à la base de données est survenue. Vérifiez vos droits ou votre connexion."
    );
    throw new Error(JSON.stringify(errInfo));
  }

  private clearSubscriptions(): void {
    this.eventsUnsub?.();
    this.eventsUnsub = null;
    this.clearSubcollectionSubscriptions();
  }

  private clearSubcollectionSubscriptions(): void {
    this.participantsUnsub?.();
    this.participantsUnsub = null;
    this.wishesUnsub?.();
    this.wishesUnsub = null;
    this.messagesUnsub?.();
    this.messagesUnsub = null;
  }

  private subscribeToUserEvents(uid: string): void {
    if (!this.db) return;
    this.clearSubscriptions();

    const eventsPath = 'events';
    const q = query(collection(this.db, eventsPath), where('ownerId', '==', uid));

    this.eventsUnsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SecretSantaEvent[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: String(d['title'] ?? ''),
            subtitle: String(d['subtitle'] ?? ''),
            eventDate: String(d['eventDate'] ?? ''),
            location: String(d['location'] ?? ''),
            budget: Number(d['budget'] ?? 25),
            inviteCode: String(d['inviteCode'] ?? ''),
            status: (d['status'] as EventStatus) ?? 'draft',
            ownerId: String(d['ownerId'] ?? uid),
            createdAt: d['createdAt'],
            updatedAt: d['updatedAt'],
          };
        });

        this.cloudEvents.set(loaded);

        const currentActive = this.activeEventId();
        const nextActive =
          loaded.find((e) => e.id === currentActive)?.id ?? loaded[0]?.id ?? '';
        this.activeEventId.set(nextActive);

        if (nextActive) {
          this.subscribeToEventDetails(uid, nextActive);
        } else {
          this.clearSubcollectionSubscriptions();
          this.cloudParticipants.set([]);
          this.cloudWishes.set([]);
          this.cloudMessages.set([]);
        }
      },
      (error) => {
        this.handleFirestoreError(error, OperationType.LIST, eventsPath);
      }
    );
  }

  private subscribeToEventDetails(uid: string, eventId: string): void {
    if (!this.db || !eventId) return;
    this.clearSubcollectionSubscriptions();

    const participantsPath = `events/${eventId}/participants`;
    const wishesPath = `events/${eventId}/wishes`;
    const messagesPath = `events/${eventId}/messages`;

    this.participantsUnsub = onSnapshot(
      query(collection(this.db, participantsPath), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: Participant[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            eventId: String(d['eventId'] ?? eventId),
            ownerId: String(d['ownerId'] ?? uid),
            name: String(d['name'] ?? ''),
            roleNote: String(d['roleNote'] ?? ''),
            avatarColor: String(d['avatarColor'] ?? '#C81E32'),
            pinCode: String(d['pinCode'] ?? '1234'),
            giftStatus: (d['giftStatus'] as GiftStatus) ?? 'idea',
            hasRevealed: Boolean(d['hasRevealed']),
            assignedToId: String(d['assignedToId'] ?? ''),
            excludedIds: Array.isArray(d['excludedIds'])
              ? d['excludedIds'].map((x: unknown) => String(x))
              : [],
            forcedReceiverId: String(d['forcedReceiverId'] ?? ''),
            createdAt: d['createdAt'],
            updatedAt: d['updatedAt'],
          };
        });
        this.cloudParticipants.set(list);
      },
      (error) => {
        this.handleFirestoreError(error, OperationType.LIST, participantsPath);
      }
    );

    this.wishesUnsub = onSnapshot(
      query(collection(this.db, wishesPath), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: WishItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            eventId: String(d['eventId'] ?? eventId),
            participantId: String(d['participantId'] ?? ''),
            ownerId: String(d['ownerId'] ?? uid),
            title: String(d['title'] ?? ''),
            details: String(d['details'] ?? ''),
            linkUrl: String(d['linkUrl'] ?? ''),
            estimatedPrice: Number(d['estimatedPrice'] ?? 0),
            priority: (d['priority'] as WishPriority) ?? 'normal',
            createdAt: d['createdAt'],
            updatedAt: d['updatedAt'],
          };
        });
        this.cloudWishes.set(list);
      },
      (error) => {
        this.handleFirestoreError(error, OperationType.LIST, wishesPath);
      }
    );

    this.messagesUnsub = onSnapshot(
      query(collection(this.db, messagesPath), where('ownerId', '==', uid)),
      (snapshot) => {
        const list: AnonymousMessage[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          let iso = new Date().toISOString();
          const rawCreated = d['createdAt'] as { toDate?: () => Date } | undefined;
          if (rawCreated && typeof rawCreated.toDate === 'function') {
            iso = rawCreated.toDate().toISOString();
          }
          return {
            id: docSnap.id,
            eventId: String(d['eventId'] ?? eventId),
            targetParticipantId: String(d['targetParticipantId'] ?? ''),
            senderRole: (d['senderRole'] as AnonymousSenderRole) ?? 'santa',
            ownerId: String(d['ownerId'] ?? uid),
            content: String(d['content'] ?? ''),
            createdAtIso: iso,
            createdAt: d['createdAt'],
            updatedAt: d['updatedAt'],
          };
        });
        this.cloudMessages.set(
          list.sort((a, b) => (a.createdAtIso ?? '').localeCompare(b.createdAtIso ?? ''))
        );
      },
      (error) => {
        this.handleFirestoreError(error, OperationType.LIST, messagesPath);
      }
    );
  }

  selectEvent(eventId: string): void {
    this.activeEventId.set(eventId);
    const user = this.currentUser();
    if (user) {
      this.subscribeToEventDetails(user.uid, eventId);
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.auth) return;
    this.errorBanner.set(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
      this.showToast('Connecté avec votre compte Google (SSO). Synchronisation active.');
    } catch (error: unknown) {
      const fbErr = error as { code?: string; message?: string };
      console.error('Erreur de connexion Google :', error);
      if (fbErr.code === 'auth/popup-closed-by-user') {
        this.errorBanner.set('La fenêtre de connexion Google a été fermée.');
      } else {
        this.errorBanner.set('Impossible de se connecter avec Google. Veuillez réessayer.');
      }
    }
  }

  async signInWithEmail(email: string, pass: string): Promise<boolean> {
    if (!this.auth) return false;
    this.errorBanner.set(null);
    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), pass);
      this.showToast('Connecté à votre compte organisateur. Vos données sont synchronisées.');
      return true;
    } catch (error: unknown) {
      const fbErr = error as { code?: string; message?: string };
      console.error('Erreur connexion email :', error);
      if (
        fbErr.code === 'auth/invalid-credential' ||
        fbErr.code === 'auth/wrong-password' ||
        fbErr.code === 'auth/user-not-found'
      ) {
        this.errorBanner.set('Adresse e-mail ou mot de passe incorrect.');
      } else if (fbErr.code === 'auth/invalid-email') {
        this.errorBanner.set('Format d’adresse e-mail invalide.');
      } else if (fbErr.code === 'auth/operation-not-allowed') {
        this.errorBanner.set(
          "L'authentification par e-mail/mot de passe doit être activée dans la console Firebase (Authentication > Sign-in method)."
        );
      } else {
        this.errorBanner.set('Erreur de connexion. Veuillez vérifier vos identifiants.');
      }
      return false;
    }
  }

  async registerWithEmail(email: string, pass: string, displayName?: string): Promise<boolean> {
    if (!this.auth) return false;
    this.errorBanner.set(null);
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email.trim(), pass);
      if (displayName && displayName.trim()) {
        try {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        } catch {
          // ignore profile update error
        }
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // ignore verification email sending failure
      }
      this.showToast('Compte organisateur créé avec succès !');
      return true;
    } catch (error: unknown) {
      const fbErr = error as { code?: string; message?: string };
      console.error('Erreur inscription email :', error);
      if (fbErr.code === 'auth/email-already-in-use') {
        this.errorBanner.set('Cette adresse e-mail possède déjà un compte. Essayez de vous connecter.');
      } else if (fbErr.code === 'auth/weak-password') {
        this.errorBanner.set('Le mot de passe doit comporter au moins 6 caractères.');
      } else if (fbErr.code === 'auth/invalid-email') {
        this.errorBanner.set('Format d’adresse e-mail invalide.');
      } else if (fbErr.code === 'auth/operation-not-allowed') {
        this.errorBanner.set(
          "L'authentification par e-mail/mot de passe doit être activée dans la console Firebase (Authentication > Sign-in method)."
        );
      } else {
        this.errorBanner.set('Impossible de créer le compte organisateur. Vérifiez vos informations.');
      }
      return false;
    }
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    if (!this.auth) return false;
    this.errorBanner.set(null);
    try {
      await sendPasswordResetEmail(this.auth, email.trim());
      this.showToast('E-mail de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
      return true;
    } catch (error: unknown) {
      const fbErr = error as { code?: string; message?: string };
      console.error('Erreur réinitialisation :', error);
      if (fbErr.code === 'auth/user-not-found') {
        this.errorBanner.set('Aucun compte trouvé avec cette adresse e-mail.');
      } else if (fbErr.code === 'auth/invalid-email') {
        this.errorBanner.set('Format d’adresse e-mail invalide.');
      } else {
        this.errorBanner.set("Impossible d'envoyer l'e-mail de réinitialisation.");
      }
      return false;
    }
  }

  async logout(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
    this.showToast('Déconnecté. Retour au mode Atelier de démonstration.');
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    if (this.isBrowser) {
      setTimeout(() => {
        if (this.toastMessage() === msg) {
          this.toastMessage.set(null);
        }
      }, 3600);
    }
  }

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
  }

  /**
   * Effet sonore doux via Web Audio API pour la révélation ou le tirage.
   */
  playFestiveChime(type: 'unlock' | 'draw' | 'step'): void {
    if (!this.isBrowser || !this.soundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes =
        type === 'draw'
          ? [523.25, 659.25, 783.99, 1046.5]
          : type === 'unlock'
            ? [587.33, 739.99, 880]
            : [659.25, 783.99];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.28);
      });
    } catch {
      // Ignore Web Audio restriction errors
    }
  }

  private sanitizeId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'NOEL-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Importe l'événement de démonstration complet dans le compte Firestore de l'utilisateur connecté.
   */
  async seedDemoEventToCloud(): Promise<void> {
    const user = this.currentUser();
    if (!this.db || !user || !user.emailVerified) return;

    const eventId = this.sanitizeId('evt_moreau');
    const demoEvt = this.createInitialLocalEvents()[0];
    const demoParts = this.createInitialLocalParticipants();
    const demoWishes = this.createInitialLocalWishes();
    const demoMsgs = this.createInitialLocalMessages();

    const eventPath = `events/${eventId}`;
    try {
      await setDoc(doc(this.db, 'events', eventId), {
        title: demoEvt.title.slice(0, BLUEPRINT_CONSTRAINTS.EVENT_TITLE_MAX),
        subtitle: demoEvt.subtitle.slice(0, BLUEPRINT_CONSTRAINTS.EVENT_SUBTITLE_MAX),
        eventDate: demoEvt.eventDate,
        location: demoEvt.location.slice(0, BLUEPRINT_CONSTRAINTS.EVENT_LOCATION_MAX),
        budget: demoEvt.budget,
        inviteCode: this.generateInviteCode(),
        status: 'draft',
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const batch = writeBatch(this.db);

      for (const p of demoParts) {
        const pRef = doc(this.db, `events/${eventId}/participants`, p.id);
        batch.set(pRef, {
          eventId,
          ownerId: user.uid,
          name: p.name.slice(0, BLUEPRINT_CONSTRAINTS.PARTICIPANT_NAME_MAX),
          roleNote: p.roleNote.slice(0, BLUEPRINT_CONSTRAINTS.PARTICIPANT_NOTE_MAX),
          avatarColor: p.avatarColor,
          pinCode: p.pinCode,
          giftStatus: p.giftStatus,
          hasRevealed: p.hasRevealed,
          assignedToId: p.assignedToId,
          excludedIds: p.excludedIds.slice(0, BLUEPRINT_CONSTRAINTS.PARTICIPANT_MAX_EXCLUSIONS),
          forcedReceiverId: p.forcedReceiverId ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      // Une fois l'événement et les participants créés, passons le statut à 'drawn' et ajoutons souhaits et messages
      await updateDoc(doc(this.db, 'events', eventId), {
        status: 'drawn',
        updatedAt: serverTimestamp(),
      });

      const secondBatch = writeBatch(this.db);
      for (const w of demoWishes) {
        const wRef = doc(this.db, `events/${eventId}/wishes`, w.id);
        secondBatch.set(wRef, {
          eventId,
          participantId: w.participantId,
          ownerId: user.uid,
          title: w.title.slice(0, BLUEPRINT_CONSTRAINTS.WISH_TITLE_MAX),
          details: w.details.slice(0, BLUEPRINT_CONSTRAINTS.WISH_DETAILS_MAX),
          linkUrl: w.linkUrl.slice(0, BLUEPRINT_CONSTRAINTS.WISH_LINK_MAX),
          estimatedPrice: w.estimatedPrice,
          priority: w.priority,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const m of demoMsgs) {
        const mRef = doc(this.db, `events/${eventId}/messages`, m.id);
        secondBatch.set(mRef, {
          eventId,
          targetParticipantId: m.targetParticipantId,
          senderRole: m.senderRole,
          ownerId: user.uid,
          content: m.content.slice(0, BLUEPRINT_CONSTRAINTS.MESSAGE_CONTENT_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await secondBatch.commit();
      this.selectEvent(eventId);
      this.showToast("Événement d'exemple importé et synchronisé dans Firestore !");
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, eventPath);
    }
  }

  /**
   * Création d'un nouvel événement Secret Santa.
   */
  async createEvent(payload: {
    title: string;
    subtitle: string;
    eventDate: string;
    location: string;
    budget: number;
  }): Promise<string> {
    const cleanTitle = payload.title.trim().slice(0, BLUEPRINT_CONSTRAINTS.EVENT_TITLE_MAX);
    const cleanSubtitle = payload.subtitle.trim().slice(0, BLUEPRINT_CONSTRAINTS.EVENT_SUBTITLE_MAX);
    const cleanLocation = payload.location.trim().slice(0, BLUEPRINT_CONSTRAINTS.EVENT_LOCATION_MAX);
    const cleanBudget = Math.max(
      BLUEPRINT_CONSTRAINTS.EVENT_BUDGET_MIN,
      Math.min(BLUEPRINT_CONSTRAINTS.EVENT_BUDGET_MAX, Math.round(Number(payload.budget) || 25))
    );
    const eventId = this.sanitizeId('evt');
    const inviteCode = this.generateInviteCode();

    if (this.isCloudConnected() && this.db && this.currentUser()) {
      const uid = this.currentUser()!.uid;
      const path = `events/${eventId}`;
      try {
        await setDoc(doc(this.db, 'events', eventId), {
          title: cleanTitle,
          subtitle: cleanSubtitle,
          eventDate: payload.eventDate,
          location: cleanLocation,
          budget: cleanBudget,
          inviteCode,
          status: 'draft',
          ownerId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        this.selectEvent(eventId);
        this.showToast(`Événement « ${cleanTitle} » créé dans Firestore.`);
        return eventId;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    const newEvent: SecretSantaEvent = {
      id: eventId,
      title: cleanTitle,
      subtitle: cleanSubtitle,
      eventDate: payload.eventDate,
      location: cleanLocation,
      budget: cleanBudget,
      inviteCode,
      status: 'draft',
      ownerId: 'local_organizer',
    };
    this.localEvents.update((list) => [newEvent, ...list]);
    this.activeEventId.set(eventId);
    this.showToast(`Événement « ${cleanTitle} » créé.`);
    return eventId;
  }

  /**
   * Suppression complète d'un atelier (événement) et de toutes ses données associées.
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const targetEvt = this.events().find((e) => e.id === eventId);
    const title = targetEvt ? targetEvt.title : 'Atelier';

    if (this.isCloudConnected() && this.db && this.currentUser()) {
      const path = `events/${eventId}`;
      try {
        // 1. Suppression des documents des sous-collections (participants, souhaits, messages)
        const partsSnap = await getDocs(collection(this.db, `events/${eventId}/participants`));
        const wishesSnap = await getDocs(collection(this.db, `events/${eventId}/wishes`));
        const msgsSnap = await getDocs(collection(this.db, `events/${eventId}/messages`));

        const batch = writeBatch(this.db);
        partsSnap.forEach((d) => batch.delete(d.ref));
        wishesSnap.forEach((d) => batch.delete(d.ref));
        msgsSnap.forEach((d) => batch.delete(d.ref));
        // 2. Suppression de l'événement principal
        batch.delete(doc(this.db, 'events', eventId));

        await batch.commit();

        const remainingEvents = this.cloudEvents().filter((e) => e.id !== eventId);
        if (this.activeEventId() === eventId) {
          if (remainingEvents.length > 0) {
            this.selectEvent(remainingEvents[0].id);
          } else {
            this.activeEventId.set('');
          }
        }
        this.showToast(`L'atelier « ${title} » a été supprimé de Firestore.`);
        return true;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.DELETE, path);
        return false;
      }
    }

    // Mode Local
    this.localEvents.update((list) => list.filter((e) => e.id !== eventId));
    this.localParticipants.update((list) => list.filter((p) => p.eventId !== eventId));
    this.localWishes.update((list) => list.filter((w) => w.eventId !== eventId));
    this.localMessages.update((list) => list.filter((m) => m.eventId !== eventId));

    const remaining = this.localEvents();
    if (this.activeEventId() === eventId) {
      if (remaining.length > 0) {
        this.activeEventId.set(remaining[0].id);
      } else {
        const fallbackId = this.sanitizeId('evt_nouveau');
        const fallbackEvt: SecretSantaEvent = {
          id: fallbackId,
          title: 'Nouvel Atelier Secret Santa',
          subtitle: 'Atelier prêt pour vos préparatifs',
          eventDate: '2026-12-24',
          location: 'Salon chaleureux',
          budget: 25,
          inviteCode: this.generateInviteCode(),
          status: 'draft',
          ownerId: 'local_organizer',
        };
        this.localEvents.set([fallbackEvt]);
        this.activeEventId.set(fallbackId);
      }
    }
    this.showToast(`L'atelier « ${title} » a été supprimé.`);
    return true;
  }

  /**
   * Ajout d'un participant à l'événement actif.
   */
  async addParticipant(payload: {
    name: string;
    roleNote: string;
    pinCode: string;
  }): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    const cleanName = payload.name.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARTICIPANT_NAME_MAX);
    const cleanNote = payload.roleNote.trim().slice(0, BLUEPRINT_CONSTRAINTS.PARTICIPANT_NOTE_MAX);
    const cleanPin = BLUEPRINT_CONSTRAINTS.PIN_PATTERN.test(payload.pinCode.trim())
      ? payload.pinCode.trim()
      : '1234';
    const participantId = this.sanitizeId('part');
    const avatarColor =
      AVATAR_PALETTE[this.participants().length % AVATAR_PALETTE.length] ?? '#C81E32';

    if (this.isCloudConnected() && this.db && this.currentUser()) {
      const uid = this.currentUser()!.uid;
      const path = `events/${evt.id}/participants/${participantId}`;
      try {
        await setDoc(doc(this.db, `events/${evt.id}/participants`, participantId), {
          eventId: evt.id,
          ownerId: uid,
          name: cleanName,
          roleNote: cleanNote,
          avatarColor,
          pinCode: cleanPin,
          giftStatus: 'idea',
          hasRevealed: false,
          assignedToId: '',
          excludedIds: [],
          forcedReceiverId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        this.showToast(`${cleanName} a rejoint l'atelier (PIN : ${cleanPin}).`);
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    const newParticipant: Participant = {
      id: participantId,
      eventId: evt.id,
      ownerId: evt.ownerId,
      name: cleanName,
      roleNote: cleanNote,
      avatarColor,
      pinCode: cleanPin,
      giftStatus: 'idea',
      hasRevealed: false,
      assignedToId: '',
      excludedIds: [],
      forcedReceiverId: '',
    };
    this.localParticipants.update((list) => [...list, newParticipant]);
    this.showToast(`${cleanName} a rejoint l'atelier (PIN : ${cleanPin}).`);
  }

  /**
   * Suppression d'un participant (uniquement avant tirage ou après réinitialisation).
   */
  async removeParticipant(participantId: string): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${participantId}`;
      try {
        await deleteDoc(doc(this.db, `events/${evt.id}/participants`, participantId));
        this.showToast('Participant retiré de la liste.');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.DELETE, path);
      }
    }

    this.localParticipants.update((list) =>
      list
        .filter((p) => p.id !== participantId)
        .map((p) => ({
          ...p,
          excludedIds: p.excludedIds.filter((id) => id !== participantId),
        }))
    );
    this.showToast('Participant retiré de la liste.');
  }

  /**
   * Ajoute ou retire une règle d'exclusion (directionnelle ou réciproque pour un couple).
   */
  async toggleExclusionRule(
    giverId: string,
    excludedId: string,
    bidirectional: boolean
  ): Promise<void> {
    const evt = this.activeEvent();
    if (!evt || giverId === excludedId) return;

    const currentParts = this.participants();
    const giver = currentParts.find((p) => p.id === giverId);
    const target = currentParts.find((p) => p.id === excludedId);
    if (!giver || !target) return;

    const alreadyExcluded = giver.excludedIds.includes(excludedId);
    const nextGiverExclusions = alreadyExcluded
      ? giver.excludedIds.filter((id) => id !== excludedId)
      : [...giver.excludedIds, excludedId].slice(
          0,
          BLUEPRINT_CONSTRAINTS.PARTICIPANT_MAX_EXCLUSIONS
        );

    const nextTargetExclusions = bidirectional
      ? alreadyExcluded
        ? target.excludedIds.filter((id) => id !== giverId)
        : Array.from(new Set([...target.excludedIds, giverId])).slice(
            0,
            BLUEPRINT_CONSTRAINTS.PARTICIPANT_MAX_EXCLUSIONS
          )
      : target.excludedIds;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${giverId}`;
      try {
        await updateDoc(doc(this.db, `events/${evt.id}/participants`, giverId), {
          excludedIds: nextGiverExclusions,
          updatedAt: serverTimestamp(),
        });
        if (bidirectional) {
          await updateDoc(doc(this.db, `events/${evt.id}/participants`, excludedId), {
            excludedIds: nextTargetExclusions,
            updatedAt: serverTimestamp(),
          });
        }
        this.showToast(
          alreadyExcluded ? "Règle d'exclusion retirée." : "Règle d'exclusion enregistrée."
        );
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) => {
        if (p.id === giverId) {
          return { ...p, excludedIds: nextGiverExclusions };
        }
        if (bidirectional && p.id === excludedId) {
          return { ...p, excludedIds: nextTargetExclusions };
        }
        return p;
      })
    );
    this.showToast(
      alreadyExcluded ? "Règle d'exclusion retirée." : "Règle d'exclusion enregistrée."
    );
  }

  /**
   * Définit une attribution forcée (règle secrète organisateur).
   * Impose qu'un participant offre obligatoirement à un destinataire donné.
   */
  async setForcedAssignment(giverId: string, forcedReceiverId: string): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    const currentParts = this.participants();
    const giver = currentParts.find((p) => p.id === giverId);
    const target = currentParts.find((p) => p.id === forcedReceiverId);
    if (!giver || !target || giverId === forcedReceiverId) {
      this.showToast('Veuillez sélectionner deux participants différents.');
      return;
    }

    // Vérification qu'aucun autre participant n'a déjà ce destinataire forcé
    const conflict = currentParts.find(
      (p) => p.id !== giverId && p.forcedReceiverId && p.forcedReceiverId === forcedReceiverId
    );
    if (conflict) {
      this.showToast(
        `Conflit : ${target.name} est déjà réservé(e) comme destinataire forcé par ${conflict.name}.`
      );
      return;
    }

    // Si le donneur avait une exclusion sur cette cible, on la retire pour cohérence
    const cleanedExclusions = giver.excludedIds.filter((id) => id !== forcedReceiverId);

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${giverId}`;
      try {
        await updateDoc(doc(this.db, `events/${evt.id}/participants`, giverId), {
          forcedReceiverId,
          excludedIds: cleanedExclusions,
          updatedAt: serverTimestamp(),
        });
        this.showToast(`Règle secrète enregistrée : ${giver.name} offrira à ${target.name}.`);
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) =>
        p.id === giverId
          ? { ...p, forcedReceiverId, excludedIds: cleanedExclusions }
          : p
      )
    );
    this.showToast(`Règle secrète enregistrée : ${giver.name} offrira à ${target.name}.`);
  }

  /**
   * Retire une règle d'attribution forcée pour un participant.
   */
  async removeForcedAssignment(giverId: string): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${giverId}`;
      try {
        await updateDoc(doc(this.db, `events/${evt.id}/participants`, giverId), {
          forcedReceiverId: '',
          updatedAt: serverTimestamp(),
        });
        this.showToast('Tirage forcé retiré.');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) => (p.id === giverId ? { ...p, forcedReceiverId: '' } : p))
    );
    this.showToast('Tirage forcé retiré.');
  }

  /**
   * Exécute le tirage au sort mathématique et enregistre les attributions secrètes.
   */
  async executeSecretDraw(): Promise<boolean> {
    const evt = this.activeEvent();
    if (!evt) return false;

    const currentParts = this.participants();
    const result = this.drawEngine.solveSecretSantaDraw(currentParts);
    if (!result.isValid || !result.assignments) {
      this.errorBanner.set(result.errorMessage ?? 'Impossible de lancer le tirage.');
      return false;
    }

    this.errorBanner.set(null);

    if (this.isCloudConnected() && this.db) {
      const eventPath = `events/${evt.id}`;
      try {
        const batch = writeBatch(this.db);
        for (const p of currentParts) {
          const assignedToId = result.assignments[p.id] ?? '';
          const pRef = doc(this.db, `events/${evt.id}/participants`, p.id);
          batch.update(pRef, {
            assignedToId,
            hasRevealed: false,
            giftStatus: 'idea',
            updatedAt: serverTimestamp(),
          });
        }
        const evtRef = doc(this.db, 'events', evt.id);
        batch.update(evtRef, {
          status: 'drawn',
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        this.playFestiveChime('draw');
        this.showToast(
          'Tirage au sort réalisé avec succès ! Les enveloppes secrètes sont scellées.'
        );
        return true;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, eventPath);
      }
    }

    const assignments = result.assignments;
    this.localParticipants.update((list) =>
      list.map((p) =>
        p.eventId === evt.id
          ? {
              ...p,
              assignedToId: assignments[p.id] ?? '',
              hasRevealed: false,
              giftStatus: 'idea',
            }
          : p
      )
    );
    this.localEvents.update((list) =>
      list.map((e) => (e.id === evt.id ? { ...e, status: 'drawn' } : e))
    );
    this.playFestiveChime('draw');
    this.showToast('Tirage au sort réalisé avec succès ! Les enveloppes secrètes sont scellées.');
    return true;
  }

  /**
   * Réinitialise le tirage pour permettre de modifier les participants ou relancer.
   */
  async resetDraw(): Promise<void> {
    const evt = this.activeEvent();
    if (!evt || evt.status === 'completed') return;

    const currentParts = this.participants();

    if (this.isCloudConnected() && this.db) {
      const eventPath = `events/${evt.id}`;
      try {
        const batch = writeBatch(this.db);
        for (const p of currentParts) {
          const pRef = doc(this.db, `events/${evt.id}/participants`, p.id);
          batch.update(pRef, {
            assignedToId: '',
            hasRevealed: false,
            giftStatus: 'idea',
            updatedAt: serverTimestamp(),
          });
        }
        batch.update(doc(this.db, 'events', evt.id), {
          status: 'draft',
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        this.showToast("Le tirage a été réinitialisé. Vous pouvez ajuster les participants.");
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, eventPath);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) =>
        p.eventId === evt.id
          ? { ...p, assignedToId: '', hasRevealed: false, giftStatus: 'idea' }
          : p
      )
    );
    this.localEvents.update((list) =>
      list.map((e) => (e.id === evt.id ? { ...e, status: 'draft' } : e))
    );
    this.showToast('Le tirage a été réinitialisé. Vous pouvez ajuster les participants.');
  }

  /**
   * Marque la carte d'un participant comme révélée et met éventuellement à jour son code PIN.
   */
  async markRevealed(participantId: string, newPinCode?: string): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;
    const part = this.participants().find((p) => p.id === participantId);
    if (!part) return;

    const pinToSave =
      newPinCode && BLUEPRINT_CONSTRAINTS.PIN_PATTERN.test(newPinCode)
        ? newPinCode
        : part.pinCode;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${participantId}`;
      try {
        await updateDoc(doc(this.db, `events/${evt.id}/participants`, participantId), {
          hasRevealed: true,
          pinCode: pinToSave,
          updatedAt: serverTimestamp(),
        });
        this.playFestiveChime('unlock');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) =>
        p.id === participantId ? { ...p, hasRevealed: true, pinCode: pinToSave } : p
      )
    );
    this.playFestiveChime('unlock');
  }

  /**
   * Met à jour l'état d'avancement du cadeau préparé par ce Père Noël Secret.
   */
  async updateGiftStatus(participantId: string, giftStatus: GiftStatus): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/participants/${participantId}`;
      try {
        await updateDoc(doc(this.db, `events/${evt.id}/participants`, participantId), {
          giftStatus,
          updatedAt: serverTimestamp(),
        });
        this.playFestiveChime('step');
        this.showToast('Avancement du cadeau mis à jour !');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }

    this.localParticipants.update((list) =>
      list.map((p) => (p.id === participantId ? { ...p, giftStatus } : p))
    );
    this.playFestiveChime('step');
    this.showToast('Avancement du cadeau mis à jour !');
  }

  /**
   * Ajoute une idée cadeau dans la liste de souhaits d'un participant.
   */
  async addWishItem(payload: {
    participantId: string;
    title: string;
    details: string;
    linkUrl: string;
    estimatedPrice: number;
    priority: WishPriority;
  }): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    const cleanTitle = payload.title.trim().slice(0, BLUEPRINT_CONSTRAINTS.WISH_TITLE_MAX);
    const cleanDetails = payload.details.trim().slice(0, BLUEPRINT_CONSTRAINTS.WISH_DETAILS_MAX);
    const cleanLink = payload.linkUrl.trim().slice(0, BLUEPRINT_CONSTRAINTS.WISH_LINK_MAX);
    const cleanPrice = Math.max(0, Math.min(10000, Math.round(Number(payload.estimatedPrice) || 0)));
    const wishId = this.sanitizeId('wish');

    if (this.isCloudConnected() && this.db && this.currentUser()) {
      const uid = this.currentUser()!.uid;
      const path = `events/${evt.id}/wishes/${wishId}`;
      try {
        await setDoc(doc(this.db, `events/${evt.id}/wishes`, wishId), {
          eventId: evt.id,
          participantId: payload.participantId,
          ownerId: uid,
          title: cleanTitle,
          details: cleanDetails,
          linkUrl: cleanLink,
          estimatedPrice: cleanPrice,
          priority: payload.priority,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        this.showToast(`Souhait « ${cleanTitle} » ajouté à la liste.`);
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    const newWish: WishItem = {
      id: wishId,
      eventId: evt.id,
      participantId: payload.participantId,
      ownerId: evt.ownerId,
      title: cleanTitle,
      details: cleanDetails,
      linkUrl: cleanLink,
      estimatedPrice: cleanPrice,
      priority: payload.priority,
    };
    this.localWishes.update((list) => [newWish, ...list]);
    this.showToast(`Souhait « ${cleanTitle} » ajouté à la liste.`);
  }

  /**
   * Supprime un souhait d'une liste.
   */
  async deleteWishItem(wishId: string): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    if (this.isCloudConnected() && this.db) {
      const path = `events/${evt.id}/wishes/${wishId}`;
      try {
        await deleteDoc(doc(this.db, `events/${evt.id}/wishes`, wishId));
        this.showToast('Souhait retiré de la liste.');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.DELETE, path);
      }
    }

    this.localWishes.update((list) => list.filter((w) => w.id !== wishId));
    this.showToast('Souhait retiré de la liste.');
  }

  /**
   * Envoie un message anonyme dans le canal associé à un destinataire.
   * - Si senderRole === 'santa', le Père Noël Secret écrit à sa cible (targetParticipantId = sa cible).
   * - Si senderRole === 'recipient', le destinataire répond à son Père Noël Secret (targetParticipantId = lui-même).
   */
  async sendAnonymousMessage(payload: {
    targetParticipantId: string;
    senderRole: AnonymousSenderRole;
    content: string;
  }): Promise<void> {
    const evt = this.activeEvent();
    if (!evt) return;

    const cleanContent = payload.content.trim().slice(0, BLUEPRINT_CONSTRAINTS.MESSAGE_CONTENT_MAX);
    if (!cleanContent) return;

    const messageId = this.sanitizeId('msg');

    if (this.isCloudConnected() && this.db && this.currentUser()) {
      const uid = this.currentUser()!.uid;
      const path = `events/${evt.id}/messages/${messageId}`;
      try {
        await setDoc(doc(this.db, `events/${evt.id}/messages`, messageId), {
          eventId: evt.id,
          targetParticipantId: payload.targetParticipantId,
          senderRole: payload.senderRole,
          ownerId: uid,
          content: cleanContent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        this.playFestiveChime('step');
        this.showToast('Message anonyme distribué par la Poste du Pôle Nord !');
        return;
      } catch (error) {
        this.handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    const newMsg: AnonymousMessage = {
      id: messageId,
      eventId: evt.id,
      targetParticipantId: payload.targetParticipantId,
      senderRole: payload.senderRole,
      ownerId: evt.ownerId,
      content: cleanContent,
      createdAtIso: new Date().toISOString(),
    };
    this.localMessages.update((list) => [...list, newMsg]);
    this.playFestiveChime('step');
    this.showToast('Message anonyme distribué par la Poste du Pôle Nord !');
  }

  // ===========================================================================
  // Données initiales réalistes en français (Mode Atelier de Démonstration)
  // ===========================================================================
  private createInitialLocalEvents(): SecretSantaEvent[] {
    return [
      {
        id: 'evt_famille_moreau_2026',
        title: 'Réveillon de la Famille Moreau & Amis',
        subtitle:
          'Un cadeau fait avec le cœur ou déniché avec malice sous le grand sapin du salon !',
        eventDate: '2026-12-24',
        location: 'Chalet des Érables · Annecy',
        budget: 35,
        inviteCode: 'NOEL-2026',
        status: 'drawn',
        ownerId: 'local_organizer',
      },
    ];
  }

  private createInitialLocalParticipants(): Participant[] {
    // Cycle hamiltonien valide respectant les exclusions de couples (Camille <-> Thomas, Léa <-> Hugo) :
    // Camille -> Léa -> Antoine -> Thomas -> Chloé -> Hugo -> Camille
    return [
      {
        id: 'part_camille',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Camille Moreau',
        roleNote: 'Organisatrice · Fan de romans graphiques & thés fumés',
        avatarColor: '#C81E32',
        pinCode: '1234',
        giftStatus: 'wrapped',
        hasRevealed: true,
        assignedToId: 'part_lea',
        excludedIds: ['part_thomas'],
        forcedReceiverId: '',
      },
      {
        id: 'part_thomas',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Thomas Mercier',
        roleNote: 'En couple avec Camille · Pâtissier du dimanche & vinyles',
        avatarColor: '#166534',
        pinCode: '1234',
        giftStatus: 'bought',
        hasRevealed: true,
        assignedToId: 'part_chloe',
        excludedIds: ['part_camille'],
        forcedReceiverId: '',
      },
      {
        id: 'part_lea',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Léa Fontaine',
        roleNote: 'En couple avec Hugo · Aquarelle, botanique & randonnée',
        avatarColor: '#B45309',
        pinCode: '1234',
        giftStatus: 'ready',
        hasRevealed: true,
        assignedToId: 'part_antoine',
        excludedIds: ['part_hugo'],
        forcedReceiverId: '',
      },
      {
        id: 'part_hugo',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Hugo Chevalier',
        roleNote: 'En couple avec Léa · Jeux de plateau & cafés de spécialité',
        avatarColor: '#1E3A8A',
        pinCode: '1234',
        giftStatus: 'bought',
        hasRevealed: true,
        assignedToId: 'part_camille',
        excludedIds: ['part_lea'],
        forcedReceiverId: '',
      },
      {
        id: 'part_chloe',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Chloé Moreau',
        roleNote: 'La petite sœur · Céramique artisanale & photographie argentique',
        avatarColor: '#6B21A8',
        pinCode: '1234',
        giftStatus: 'idea',
        hasRevealed: false,
        assignedToId: 'part_hugo',
        excludedIds: ['part_antoine'],
        forcedReceiverId: '',
      },
      {
        id: 'part_antoine',
        eventId: 'evt_famille_moreau_2026',
        ownerId: 'local_organizer',
        name: 'Antoine Garnier',
        roleNote: 'Ami d’enfance · Cuisine épicée & escalade en bloc',
        avatarColor: '#0F766E',
        pinCode: '1234',
        giftStatus: 'ready',
        hasRevealed: true,
        assignedToId: 'part_thomas',
        excludedIds: ['part_chloe'],
        forcedReceiverId: '',
      },
    ];
  }

  private createInitialLocalWishes(): WishItem[] {
    return [
      {
        id: 'wish_1',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_lea',
        ownerId: 'local_organizer',
        title: 'Carnet de voyage aquarelle papier coton 300g',
        details: 'Format paysage A5, reliure cousue à plat (marque Hahnemühle ou Etchr).',
        linkUrl: 'https://www.geant-beaux-arts.fr',
        estimatedPrice: 28,
        priority: 'dream',
      },
      {
        id: 'wish_2',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_lea',
        ownerId: 'local_organizer',
        title: 'Herbier illustré de la flore alpine',
        details: 'Édition reliée pour identifier les fleurs en randonnée.',
        linkUrl: '',
        estimatedPrice: 32,
        priority: 'high',
      },
      {
        id: 'wish_3',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_camille',
        ownerId: 'local_organizer',
        title: 'Coffret de thés noirs fumés Lapsang & Chaï aux épices',
        details: 'En vrac de préférence, sans arômes artificiels.',
        linkUrl: 'https://www.palaisdesthes.com',
        estimatedPrice: 26,
        priority: 'high',
      },
      {
        id: 'wish_4',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_thomas',
        ownerId: 'local_organizer',
        title: 'Tapis de pâtisserie gradué + douilles inox professionnelles',
        details: 'Pour réussir enfin les éclairs au chocolat maison !',
        linkUrl: '',
        estimatedPrice: 30,
        priority: 'dream',
      },
      {
        id: 'wish_5',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_hugo',
        ownerId: 'local_organizer',
        title: 'Jeu de société coopératif « Sky Team » ou « Dorfromantik »',
        details: 'Vérifier avec Léa mais je ne possède aucun des deux.',
        linkUrl: 'https://www.philibertnet.com',
        estimatedPrice: 29,
        priority: 'dream',
      },
      {
        id: 'wish_6',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_chloe',
        ownerId: 'local_organizer',
        title: 'Lot de 3 pellicules photo 35mm Kodak Portra 400',
        details: 'Pour mon appareil argentique Canon AE-1.',
        linkUrl: '',
        estimatedPrice: 35,
        priority: 'high',
      },
      {
        id: 'wish_7',
        eventId: 'evt_famille_moreau_2026',
        participantId: 'part_antoine',
        ownerId: 'local_organizer',
        title: 'Assortiment de sauces piquantes artisanales françaises',
        details: 'Force moyenne à forte (piment habanero ou fumé).',
        linkUrl: '',
        estimatedPrice: 24,
        priority: 'normal',
      },
    ];
  }

  private createInitialLocalMessages(): AnonymousMessage[] {
    return [
      {
        id: 'msg_1',
        eventId: 'evt_famille_moreau_2026',
        targetParticipantId: 'part_lea',
        senderRole: 'santa',
        ownerId: 'local_organizer',
        content:
          'Ho ho ho Léa ! Pour ton carnet aquarelle, tu préfères le grain fin ou le grain torchon ?',
        createdAtIso: '2026-11-08T18:20:00.000Z',
      },
      {
        id: 'msg_2',
        eventId: 'evt_famille_moreau_2026',
        targetParticipantId: 'part_lea',
        senderRole: 'recipient',
        ownerId: 'local_organizer',
        content:
          'Oh merci cher Père Noël Secret ! Le grain fin est idéal pour mes croquis botaniques.',
        createdAtIso: '2026-11-08T19:05:00.000Z',
      },
      {
        id: 'msg_3',
        eventId: 'evt_famille_moreau_2026',
        targetParticipantId: 'part_camille',
        senderRole: 'santa',
        ownerId: 'local_organizer',
        content:
          'Bonjour Camille ! As-tu déjà lu la bande dessinée « Les Guerres de Lucas » ou « L’Arabe du futur » ?',
        createdAtIso: '2026-11-08T20:10:00.000Z',
      },
      {
        id: 'msg_4',
        eventId: 'evt_famille_moreau_2026',
        targetParticipantId: 'part_camille',
        senderRole: 'recipient',
        ownerId: 'local_organizer',
        content:
          "Je n'ai pas encore lu « Les Guerres de Lucas », elle me tente énormément ! Merci Père Noël !",
        createdAtIso: '2026-11-08T20:42:00.000Z',
      },
    ];
  }
}
