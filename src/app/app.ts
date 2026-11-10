import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  ActiveSection,
  AnonymousMessage,
  AnonymousSenderRole,
  GiftStatus,
  Participant,
  SecretSantaEvent,
  WishItem,
  WishPriority,
} from './models/secret-santa.model';
import { SecretSantaStore } from './services/secret-santa-store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly store = inject(SecretSantaStore);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Chemins des illustrations générées sur mesure
  readonly heroImageUrl = '/src/assets/images/hero_santa_workshop_1794215680024.jpg';
  readonly envelopeImageUrl = '/src/assets/images/card_secret_envelope_1794215680737.jpg';
  readonly mailboxImageUrl = '/src/assets/images/post_office_mailbox_1794215681624.jpg';

  readonly brokenImages = signal<Record<string, boolean>>({});

  // Navigation principale (4 vues)
  readonly activeSection = signal<ActiveSection>('workshop');
  readonly showNewEventModal = signal<boolean>(false);
  readonly eventToDelete = signal<SecretSantaEvent | null>(null);
  readonly isDeletingEvent = signal<boolean>(false);

  // Authentification de l'organisateur (Google SSO ou Email & Mot de passe)
  readonly showAuthModal = signal<boolean>(false);
  readonly authTab = signal<'signin' | 'register'>('signin');
  readonly showForgotPassword = signal<boolean>(false);
  readonly isSubmittingAuth = signal<boolean>(false);

  // État pour la révélation par code PIN et session participant déverrouillée
  readonly selectedParticipantForPin = signal<Participant | null>(null);
  readonly unlockedParticipantId = signal<string | null>(null);
  readonly pinError = signal<string | null>(null);
  readonly showDemoPinHint = signal<boolean>(true);

  // Filtres pour la vue Listes de souhaits
  readonly selectedWishParticipantId = signal<string>('ALL');
  readonly wishSortOrder = signal<'priority' | 'priceAsc' | 'priceDesc'>('priority');

  // Canal actif dans le Bureau de Poste Anonyme ('to_target' = j'écris à ma cible, 'from_santa' = je réponds à mon Père Noël)
  readonly activeChatChannel = signal<'to_target' | 'from_santa'>('to_target');

  // Formulaires réactifs
  readonly authEmailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly authRegisterForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly forgotPasswordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly newEventForm = this.fb.nonNullable.group({
    title: ['Noël des Lutins Gourmands 2026', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    subtitle: [
      'Échange de cadeaux surprises autour d’un chocolat chaud aux épices !',
      [Validators.maxLength(240)],
    ],
    eventDate: ['2026-12-24', [Validators.required]],
    location: ['Salon familial · Lyon', [Validators.required, Validators.maxLength(120)]],
    budget: [30, [Validators.required, Validators.min(1), Validators.max(10000)]],
  });

  readonly participantForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(60)]],
    roleNote: ['', [Validators.maxLength(100)]],
    pinCode: ['1234', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
  });

  readonly exclusionForm = this.fb.nonNullable.group({
    giverId: ['', [Validators.required]],
    excludedId: ['', [Validators.required]],
    bidirectional: [true],
  });

  // Règle de tirage forcé (accessible uniquement par l'organisateur)
  readonly forcedMatchForm = this.fb.nonNullable.group({
    giverId: ['', [Validators.required]],
    forcedReceiverId: ['', [Validators.required]],
  });

  readonly pinUnlockForm = this.fb.nonNullable.group({
    pinCode: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
  });

  readonly changePinForm = this.fb.nonNullable.group({
    newPinCode: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
  });

  readonly wishForm = this.fb.nonNullable.group({
    participantId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
    details: ['', [Validators.maxLength(300)]],
    linkUrl: ['', [Validators.maxLength(500)]],
    estimatedPrice: [25, [Validators.required, Validators.min(0), Validators.max(10000)]],
    priority: ['high' as WishPriority, [Validators.required]],
  });

  readonly messageForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(500)]],
  });

  // Questions rapides suggérées pour le Bureau de Poste Anonyme
  readonly quickPrompts: readonly string[] = [
    'Ho ho ho ! Quelle est ta taille de pull ou de t-shirt ?',
    'As-tu des allergies ou des préférences gourmandes particulières ?',
    'Préfères-tu une surprise utile au quotidien ou un objet créatif ?',
    'Parmi ta liste de souhaits, lequel te ferait le plus briller les yeux ?',
  ];

  // Signaux calculés pour l'interface
  readonly daysUntilEvent = computed<number>(() => {
    const evt = this.store.activeEvent();
    if (!evt || !evt.eventDate) return 0;
    const target = Date.parse(evt.eventDate);
    if (Number.isNaN(target)) return 0;
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  });

  readonly unlockedParticipant = computed<Participant | null>(() => {
    const id = this.unlockedParticipantId();
    if (!id) return null;
    return this.store.participants().find((p) => p.id === id) ?? null;
  });

  readonly unlockedTargetParticipant = computed<Participant | null>(() => {
    const giver = this.unlockedParticipant();
    if (!giver || !giver.assignedToId) return null;
    return this.store.participants().find((p) => p.id === giver.assignedToId) ?? null;
  });

  readonly unlockedTargetWishes = computed<WishItem[]>(() => {
    const target = this.unlockedTargetParticipant();
    if (!target) return [];
    return this.store.wishes().filter((w) => w.participantId === target.id);
  });

  readonly exclusionPairs = computed(() => {
    const parts = this.store.participants();
    const mapById = new Map(parts.map((p) => [p.id, p]));
    const pairs: {
      key: string;
      giver: Participant;
      excluded: Participant;
      isMutual: boolean;
    }[] = [];
    const seenMutual = new Set<string>();

    for (const giver of parts) {
      for (const exId of giver.excludedIds) {
        const excluded = mapById.get(exId);
        if (!excluded) continue;
        const isMutual = excluded.excludedIds.includes(giver.id);
        if (isMutual) {
          const sortedKey = [giver.id, excluded.id].sort().join('__');
          if (seenMutual.has(sortedKey)) continue;
          seenMutual.add(sortedKey);
          pairs.push({
            key: sortedKey,
            giver,
            excluded,
            isMutual: true,
          });
        } else {
          pairs.push({
            key: `${giver.id}->${excluded.id}`,
            giver,
            excluded,
            isMutual: false,
          });
        }
      }
    }
    return pairs;
  });

  /**
   * Liste des règles de tirage forcé (confidentielles pour l'organisateur)
   */
  readonly forcedAssignmentsList = computed(() => {
    const parts = this.store.participants();
    const mapById = new Map(parts.map((p) => [p.id, p]));
    return parts
      .filter((p) => Boolean(p.forcedReceiverId && p.forcedReceiverId.trim() !== ''))
      .map((giver) => {
        const receiver = mapById.get(giver.forcedReceiverId!) ?? null;
        return {
          giver,
          receiver,
        };
      });
  });

  /**
   * Suivi anonymisé par destinataire : permet à chacun de savoir où en est le cadeau
   * qui lui est destiné sans jamais révéler l'identité de son Père Noël Secret !
   */
  readonly anonymizedRecipientProgress = computed(() => {
    const parts = this.store.participants();
    return parts.map((recipient) => {
      const secretSanta = parts.find((p) => p.assignedToId === recipient.id);
      const status: GiftStatus = secretSanta ? secretSanta.giftStatus : 'idea';
      return {
        recipient,
        giftStatus: status,
        santaHasRevealed: secretSanta ? secretSanta.hasRevealed : false,
      };
    });
  });

  readonly filteredWishes = computed<WishItem[]>(() => {
    const filterId = this.selectedWishParticipantId();
    const sort = this.wishSortOrder();
    const list = this.store
      .wishes()
      .filter((w) => filterId === 'ALL' || w.participantId === filterId);

    const priorityRank: Record<WishPriority, number> = {
      dream: 3,
      high: 2,
      normal: 1,
    };

    return [...list].sort((a, b) => {
      if (sort === 'priority') {
        return priorityRank[b.priority] - priorityRank[a.priority];
      }
      if (sort === 'priceAsc') {
        return a.estimatedPrice - b.estimatedPrice;
      }
      return b.estimatedPrice - a.estimatedPrice;
    });
  });

  readonly activeThreadMessages = computed<AnonymousMessage[]>(() => {
    const me = this.unlockedParticipant();
    if (!me) return [];
    const channel = this.activeChatChannel();
    const all = this.store.messages();

    if (channel === 'to_target') {
      // Canal où je suis le Père Noël Secret : le fil porte sur ma cible (me.assignedToId)
      if (!me.assignedToId) return [];
      return all.filter((m) => m.targetParticipantId === me.assignedToId);
    } else {
      // Canal où je suis le destinataire : le fil porte sur moi-même (me.id)
      return all.filter((m) => m.targetParticipantId === me.id);
    }
  });

  ngOnInit(): void {
    const firstPart = this.store.participants()[0];
    const secondPart = this.store.participants()[1];
    if (firstPart) {
      this.wishForm.patchValue({ participantId: firstPart.id });
      this.exclusionForm.patchValue({
        giverId: firstPart.id,
        excludedId: secondPart?.id ?? '',
      });
      this.forcedMatchForm.patchValue({
        giverId: firstPart.id,
        forcedReceiverId: secondPart?.id ?? '',
      });
    }

    if (this.isBrowser) {
      const params = new URLSearchParams(window.location.search);
      const deepParticipantId = params.get('participant');
      if (deepParticipantId) {
        const found = this.store.participants().find((p) => p.id === deepParticipantId);
        if (found) {
          this.activeSection.set('reveal');
          this.openPinModal(found);
        }
      }
    }
  }

  // --- Gestion de l'authentification Organisateur ---
  openAuthModal(tab: 'signin' | 'register' = 'signin'): void {
    this.authTab.set(tab);
    this.showForgotPassword.set(false);
    this.showAuthModal.set(true);
    this.store.errorBanner.set(null);
  }

  closeAuthModal(): void {
    this.showAuthModal.set(false);
    this.showForgotPassword.set(false);
  }

  setAuthTab(tab: 'signin' | 'register'): void {
    this.authTab.set(tab);
    this.showForgotPassword.set(false);
    this.store.errorBanner.set(null);
  }

  async handleGoogleSSO(): Promise<void> {
    this.isSubmittingAuth.set(true);
    try {
      await this.store.signInWithGoogle();
      if (this.store.isCloudConnected()) {
        this.closeAuthModal();
      }
    } finally {
      this.isSubmittingAuth.set(false);
    }
  }

  async submitSignInEmail(): Promise<void> {
    if (this.authEmailForm.invalid) return;
    this.isSubmittingAuth.set(true);
    const { email, password } = this.authEmailForm.getRawValue();
    try {
      const success = await this.store.signInWithEmail(email, password);
      if (success) {
        this.closeAuthModal();
        this.authEmailForm.reset();
      }
    } finally {
      this.isSubmittingAuth.set(false);
    }
  }

  async submitRegisterEmail(): Promise<void> {
    if (this.authRegisterForm.invalid) return;
    this.isSubmittingAuth.set(true);
    const { name, email, password } = this.authRegisterForm.getRawValue();
    try {
      const success = await this.store.registerWithEmail(email, password, name);
      if (success) {
        this.closeAuthModal();
        this.authRegisterForm.reset();
      }
    } finally {
      this.isSubmittingAuth.set(false);
    }
  }

  async submitForgotPassword(): Promise<void> {
    if (this.forgotPasswordForm.invalid) return;
    this.isSubmittingAuth.set(true);
    const { email } = this.forgotPasswordForm.getRawValue();
    try {
      const success = await this.store.sendPasswordReset(email);
      if (success) {
        this.showForgotPassword.set(false);
        this.forgotPasswordForm.reset();
      }
    } finally {
      this.isSubmittingAuth.set(false);
    }
  }

  // --- Gestion des règles de tirage forcé (Organisateur uniquement) ---
  async submitForcedAssignment(): Promise<void> {
    if (this.forcedMatchForm.invalid) return;
    const { giverId, forcedReceiverId } = this.forcedMatchForm.getRawValue();
    if (!giverId || !forcedReceiverId || giverId === forcedReceiverId) {
      this.store.showToast('Veuillez sélectionner deux participants différents.');
      return;
    }
    await this.store.setForcedAssignment(giverId, forcedReceiverId);
  }

  async removeForcedAssignment(giverId: string): Promise<void> {
    await this.store.removeForcedAssignment(giverId);
  }

  setSection(section: ActiveSection): void {
    this.activeSection.set(section);
  }

  onImageError(key: string): void {
    this.brokenImages.update((prev) => ({ ...prev, [key]: true }));
  }

  onEventChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (select && select.value) {
      this.store.selectEvent(select.value);
      this.unlockedParticipantId.set(null);
      this.selectedParticipantForPin.set(null);
    }
  }

  openNewEventModal(): void {
    this.showNewEventModal.set(true);
  }

  closeNewEventModal(): void {
    this.showNewEventModal.set(false);
  }

  async submitNewEvent(): Promise<void> {
    if (this.newEventForm.invalid) return;
    const val = this.newEventForm.getRawValue();
    await this.store.createEvent({
      title: val.title,
      subtitle: val.subtitle,
      eventDate: val.eventDate,
      location: val.location,
      budget: Number(val.budget),
    });
    this.showNewEventModal.set(false);
    this.unlockedParticipantId.set(null);
    this.activeSection.set('workshop');
  }

  confirmDeleteEvent(evt: SecretSantaEvent): void {
    this.eventToDelete.set(evt);
  }

  cancelDeleteEvent(): void {
    this.eventToDelete.set(null);
  }

  async executeDeleteEvent(eventId: string): Promise<void> {
    this.isDeletingEvent.set(true);
    try {
      const success = await this.store.deleteEvent(eventId);
      if (success) {
        this.eventToDelete.set(null);
        this.unlockedParticipantId.set(null);
        this.selectedParticipantForPin.set(null);
      }
    } finally {
      this.isDeletingEvent.set(false);
    }
  }

  async submitAddParticipant(): Promise<void> {
    if (this.participantForm.invalid) return;
    const val = this.participantForm.getRawValue();
    await this.store.addParticipant({
      name: val.name,
      roleNote: val.roleNote,
      pinCode: val.pinCode,
    });
    this.participantForm.reset({
      name: '',
      roleNote: '',
      pinCode: '1234',
    });
  }

  async submitExclusionRule(): Promise<void> {
    if (this.exclusionForm.invalid) return;
    const val = this.exclusionForm.getRawValue();
    if (!val.giverId || !val.excludedId || val.giverId === val.excludedId) {
      this.store.showToast('Veuillez choisir deux participants différents.');
      return;
    }
    await this.store.toggleExclusionRule(val.giverId, val.excludedId, val.bidirectional);
  }

  async removeExclusionPair(giverId: string, excludedId: string, isMutual: boolean): Promise<void> {
    await this.store.toggleExclusionRule(giverId, excludedId, isMutual);
  }

  async handleExecuteDraw(): Promise<void> {
    const ok = await this.store.executeSecretDraw();
    if (ok) {
      this.unlockedParticipantId.set(null);
      this.selectedParticipantForPin.set(null);
    }
  }

  openPinModal(participant: Participant): void {
    this.pinError.set(null);
    if (this.unlockedParticipantId() === participant.id) {
      this.selectedParticipantForPin.set(null);
      return;
    }
    this.selectedParticipantForPin.set(participant);
    this.pinUnlockForm.reset({ pinCode: '' });
  }

  closePinModal(): void {
    this.selectedParticipantForPin.set(null);
    this.pinError.set(null);
  }

  fillDemoPin(pin: string): void {
    this.pinUnlockForm.patchValue({ pinCode: pin });
  }

  async submitPinUnlock(): Promise<void> {
    const target = this.selectedParticipantForPin();
    if (!target || this.pinUnlockForm.invalid) return;

    const enteredPin = this.pinUnlockForm.getRawValue().pinCode.trim();
    if (enteredPin !== target.pinCode) {
      this.pinError.set('Code PIN incorrect. Vérifiez votre code personnel à 4 chiffres.');
      return;
    }

    this.pinError.set(null);
    this.unlockedParticipantId.set(target.id);
    this.selectedParticipantForPin.set(null);
    this.changePinForm.patchValue({ newPinCode: target.pinCode });
    await this.store.markRevealed(target.id);
  }

  lockCurrentSession(): void {
    this.unlockedParticipantId.set(null);
    this.selectedParticipantForPin.set(null);
    this.store.showToast('Enveloppe secrète refermée et verrouillée.');
  }

  async submitChangePin(): Promise<void> {
    const me = this.unlockedParticipant();
    if (!me || this.changePinForm.invalid) return;
    const nextPin = this.changePinForm.getRawValue().newPinCode.trim();
    await this.store.markRevealed(me.id, nextPin);
    this.store.showToast(`Votre nouveau code PIN (${nextPin}) est enregistré.`);
  }

  copySecretParticipantLink(participant: Participant): void {
    if (!this.isBrowser) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const evtId = this.store.activeEvent()?.id ?? '';
    const link = `${baseUrl}?event=${encodeURIComponent(evtId)}&participant=${encodeURIComponent(participant.id)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(link);
    }
    this.store.showToast(`Lien individuel de ${participant.name} copié dans le presse-papiers !`);
  }

  async setMyGiftStatus(status: GiftStatus): Promise<void> {
    const me = this.unlockedParticipant();
    if (!me) return;
    await this.store.updateGiftStatus(me.id, status);
  }

  async submitWishItem(): Promise<void> {
    if (this.wishForm.invalid) return;
    const val = this.wishForm.getRawValue();
    const participantId =
      val.participantId ||
      this.unlockedParticipant()?.id ||
      this.store.participants()[0]?.id ||
      '';
    if (!participantId) return;

    await this.store.addWishItem({
      participantId,
      title: val.title,
      details: val.details,
      linkUrl: val.linkUrl,
      estimatedPrice: Number(val.estimatedPrice),
      priority: val.priority,
    });

    this.wishForm.patchValue({
      title: '',
      details: '',
      linkUrl: '',
      estimatedPrice: 25,
      priority: 'high',
    });
  }

  useQuickPrompt(text: string): void {
    this.messageForm.patchValue({ content: text });
  }

  async submitAnonymousMessage(): Promise<void> {
    const me = this.unlockedParticipant();
    if (!me || this.messageForm.invalid) return;

    const channel = this.activeChatChannel();
    const targetParticipantId = channel === 'to_target' ? me.assignedToId : me.id;
    const senderRole: AnonymousSenderRole = channel === 'to_target' ? 'santa' : 'recipient';

    if (!targetParticipantId) {
      this.store.showToast('Effectuez d’abord le tirage au sort pour discuter avec votre cible.');
      return;
    }

    const content = this.messageForm.getRawValue().content;
    await this.store.sendAnonymousMessage({
      targetParticipantId,
      senderRole,
      content,
    });
    this.messageForm.reset({ content: '' });
  }

  getParticipantName(participantId: string): string {
    return (
      this.store.participants().find((p) => p.id === participantId)?.name ?? 'Participant mystère'
    );
  }

  getParticipantInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getGiftStatusLabel(status: GiftStatus): string {
    switch (status) {
      case 'idea':
        return 'En réflexion';
      case 'bought':
        return 'Cadeau acheté';
      case 'wrapped':
        return 'Emballé';
      case 'ready':
        return 'Prêt sous le sapin';
    }
  }

  getPriorityLabel(priority: WishPriority): string {
    switch (priority) {
      case 'dream':
        return 'Rêve absolu';
      case 'high':
        return 'Coup de cœur';
      case 'normal':
        return 'Idée classique';
    }
  }

  formatEventDate(isoDate: string): string {
    if (!isoDate) return '';
    const parsed = Date.parse(isoDate);
    if (Number.isNaN(parsed)) return isoDate;
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(parsed));
  }

  formatMessageTime(isoDate?: string): string {
    if (!isoDate) return 'À l’instant';
    const parsed = Date.parse(isoDate);
    if (Number.isNaN(parsed)) return 'À l’instant';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(parsed));
  }
}
