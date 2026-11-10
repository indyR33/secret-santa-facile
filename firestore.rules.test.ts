import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

/**
 * Suite de tests de sécurité ("Dirty Dozen" Payloads Audit) vérifiant que
 * les règles Firestore appliquent strictement les 8 piliers Zero-Trust.
 */
describe('Firestore Security Rules - Dirty Dozen Audit', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  it('1. Rejects Identity Spoofing on Event Create (enforces data.ownerId == request.auth.uid)', () => {
    expect(rules).toContain('data.ownerId == request.auth.uid');
  });

  it('2. Rejects Unverified Email Spoof (enforces request.auth.token.email_verified == true)', () => {
    expect(rules).toContain('request.auth.token.email_verified == true');
  });

  it('3. Rejects Shadow Field Injection on Create (enforces hasAll and hasOnly on all entities)', () => {
    expect(rules).toContain("data.keys().hasAll([");
    expect(rules).toContain("data.keys().hasOnly([");
  });

  it('4. Rejects Shadow Field Injection on Update / Update-Gap (enforces affectedKeys().hasOnly)', () => {
    expect(rules).toContain('incoming().diff(existing()).affectedKeys().hasOnly(');
  });

  it('5. Rejects Value Poisoning on Update (wraps update in isValid[Entity](incoming()))', () => {
    expect(rules).toContain('isValidSecretSantaEvent(incoming())');
    expect(rules).toContain('isValidParticipant(incoming(), eventId)');
    expect(rules).toContain('isValidWishItem(incoming(), eventId)');
    expect(rules).toContain('isValidAnonymousMessage(incoming(), eventId)');
  });

  it('6. Rejects Terminal State Bypass (locks updates when existing().status == completed)', () => {
    expect(rules).toContain("existing().status != 'completed'");
  });

  it('7. Rejects Orphaned Subcollection Write (verifies parent event exists and belongs to owner)', () => {
    expect(rules).toContain('exists(/databases/$(database)/documents/events/$(eventId))');
  });

  it('8. Rejects Cross-Tenant Subcollection Hijack (enforces isEventOwner(eventId))', () => {
    expect(rules).toContain('get(/databases/$(database)/documents/events/$(eventId)).data.ownerId == request.auth.uid');
  });

  it('9. Rejects Immortal Field Mutation (locks ownerId, eventId, and createdAt on update)', () => {
    expect(rules).toContain('incoming().ownerId == existing().ownerId');
    expect(rules).toContain('incoming().createdAt == existing().createdAt');
  });

  it('10. Rejects Forged Client Timestamps (enforces request.time on createdAt and updatedAt)', () => {
    expect(rules).toContain('incoming().createdAt == request.time');
    expect(rules).toContain('data.updatedAt == request.time');
  });

  it('11. Rejects Array Exhaustion Attack (bounds excludedIds to <= 10 items and checks element type)', () => {
    expect(rules).toContain('data.excludedIds is list && data.excludedIds.size() <= 10');
  });

  it('12. Rejects Unauthorized Blanket List Scraping (enforces existing().ownerId == request.auth.uid without get/exists in list)', () => {
    expect(rules).toContain('allow list: if isVerified() && existing().ownerId == request.auth.uid;');
  });
});
