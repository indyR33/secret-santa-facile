export type EventStatus = 'draft' | 'drawn' | 'completed';
export type GiftStatus = 'idea' | 'bought' | 'wrapped' | 'ready';
export type WishPriority = 'normal' | 'high' | 'dream';
export type AnonymousSenderRole = 'santa' | 'recipient';
export type ActiveSection = 'workshop' | 'reveal' | 'wishes' | 'messages';

export interface SecretSantaEvent {
  id: string;
  title: string;
  subtitle: string;
  eventDate: string;
  location: string;
  budget: number;
  inviteCode: string;
  status: EventStatus;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Participant {
  id: string;
  eventId: string;
  ownerId: string;
  name: string;
  roleNote: string;
  avatarColor: string;
  pinCode: string;
  giftStatus: GiftStatus;
  hasRevealed: boolean;
  assignedToId: string;
  excludedIds: string[];
  forcedReceiverId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WishItem {
  id: string;
  eventId: string;
  participantId: string;
  ownerId: string;
  title: string;
  details: string;
  linkUrl: string;
  estimatedPrice: number;
  priority: WishPriority;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AnonymousMessage {
  id: string;
  eventId: string;
  targetParticipantId: string;
  senderRole: AnonymousSenderRole;
  ownerId: string;
  content: string;
  createdAtIso?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DrawValidationResult {
  isValid: boolean;
  errorMessage?: string;
  assignments?: Record<string, string>;
}

/**
 * Constantes de validation synchronisées avec firebase-blueprint.json et firestore.rules
 */
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  INVITE_CODE_PATTERN: /^[A-Z0-9-]+$/,
  PIN_PATTERN: /^[0-9]{4}$/,
  EVENT_TITLE_MAX: 100,
  EVENT_SUBTITLE_MAX: 240,
  EVENT_LOCATION_MAX: 120,
  EVENT_BUDGET_MIN: 1,
  EVENT_BUDGET_MAX: 10000,
  PARTICIPANT_NAME_MAX: 60,
  PARTICIPANT_NOTE_MAX: 100,
  PARTICIPANT_MAX_EXCLUSIONS: 10,
  WISH_TITLE_MAX: 120,
  WISH_DETAILS_MAX: 300,
  WISH_LINK_MAX: 500,
  MESSAGE_CONTENT_MAX: 500,
} as const;
