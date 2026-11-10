import { Injectable } from '@angular/core';
import { DrawValidationResult, Participant } from '../models/secret-santa.model';

@Injectable({
  providedIn: 'root',
})
export class DrawEngine {
  /**
   * Mélange de Fisher-Yates pour garantir l'équité aléatoire du tirage.
   */
  private shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Vérifie si un participant donneur peut offrir à un destinataire donné
   * en tenant compte des règles d'exclusion et des règles de tirage forcé.
   */
  private canAssign(
    giver: Participant,
    receiver: Participant,
    participants: readonly Participant[]
  ): boolean {
    if (giver.id === receiver.id) {
      return false;
    }
    if (giver.excludedIds.includes(receiver.id)) {
      return false;
    }
    // Si le donneur a une règle de tirage forcé, son destinataire doit impérativement correspondre
    if (giver.forcedReceiverId && giver.forcedReceiverId.trim() !== '') {
      return giver.forcedReceiverId === receiver.id;
    }
    // Si un autre donneur a une règle de tirage forcé sur ce destinataire, le donneur actuel ne peut pas le prendre
    const isReservedByAnother = participants.some(
      (other) =>
        other.id !== giver.id &&
        other.forcedReceiverId &&
        other.forcedReceiverId === receiver.id
    );
    if (isReservedByAnother) {
      return false;
    }

    return true;
  }

  /**
   * Résout le tirage au sort Secret Santa sous contraintes d'exclusion et de tirage forcé.
   * Privilégie un cycle hamiltonien unique quand c'est possible, puis bascule sur un dérangement
   * général par backtracking avec heuristique MRV.
   */
  solveSecretSantaDraw(participants: readonly Participant[]): DrawValidationResult {
    if (participants.length < 3) {
      return {
        isValid: false,
        errorMessage:
          'Il faut au moins 3 participants pour organiser un tirage Secret Santa anonyme.',
      };
    }

    const validIdSet = new Set(participants.map((p) => p.id));

    // Vérification de cohérence des tirages forcés
    const forcedReceiverCount: Record<string, string> = {};
    for (const giver of participants) {
      if (giver.forcedReceiverId && giver.forcedReceiverId.trim() !== '') {
        const forcedTarget = giver.forcedReceiverId.trim();
        if (forcedTarget === giver.id) {
          return {
            isValid: false,
            errorMessage: `${giver.name} ne peut pas être forcé(e) à s'offrir un cadeau à soi-même.`,
          };
        }
        if (!validIdSet.has(forcedTarget)) {
          return {
            isValid: false,
            errorMessage: `La règle de tirage forcé pour ${giver.name} cible un participant introuvable.`,
          };
        }
        if (giver.excludedIds.includes(forcedTarget)) {
          return {
            isValid: false,
            errorMessage: `Incompatibilité : ${giver.name} a une règle d'exclusion ET un tirage forcé sur la même personne.`,
          };
        }
        if (forcedReceiverCount[forcedTarget]) {
          return {
            isValid: false,
            errorMessage: `Conflit de tirage forcé : ${giver.name} et un autre participant ont le même destinataire imposé.`,
          };
        }
        forcedReceiverCount[forcedTarget] = giver.id;
      }
    }

    for (const giver of participants) {
      const allowedReceivers = participants.filter((receiver) =>
        this.canAssign(giver, receiver, participants)
      );
      if (allowedReceivers.length === 0) {
        return {
          isValid: false,
          errorMessage: `${giver.name} n'a aucun destinataire possible avec les règles d'exclusion et de tirage forcé actuelles.`,
        };
      }
    }

    for (const receiver of participants) {
      const allowedGivers = participants.filter((giver) =>
        this.canAssign(giver, receiver, participants)
      );
      if (allowedGivers.length === 0) {
        return {
          isValid: false,
          errorMessage: `Personne ne peut tirer au sort ${receiver.name} avec les règles actuelles.`,
        };
      }
    }

    // Étape 1 : Si aucun tirage forcé n'est défini, tentative d'un cycle hamiltonien complet
    const hasAnyForced = participants.some(
      (p) => p.forcedReceiverId && p.forcedReceiverId.trim() !== ''
    );

    if (!hasAnyForced) {
      const shuffledParticipants = this.shuffle(participants);
      const startParticipant = shuffledParticipants[0];
      const visited = new Set<string>([startParticipant.id]);
      const path: Participant[] = [startParticipant];

      const findHamiltonianCycle = (current: Participant): boolean => {
        if (path.length === participants.length) {
          return this.canAssign(current, startParticipant, participants);
        }

        const candidates = this.shuffle(
          participants.filter(
            (candidate) =>
              !visited.has(candidate.id) &&
              this.canAssign(current, candidate, participants)
          )
        );

        for (const next of candidates) {
          visited.add(next.id);
          path.push(next);
          if (findHamiltonianCycle(next)) {
            return true;
          }
          path.pop();
          visited.delete(next.id);
        }
        return false;
      };

      if (findHamiltonianCycle(startParticipant)) {
        const assignments: Record<string, string> = {};
        for (let i = 0; i < path.length; i++) {
          const giver = path[i];
          const receiver = path[(i + 1) % path.length];
          if (validIdSet.has(giver.id) && validIdSet.has(receiver.id)) {
            assignments[giver.id] = receiver.id;
          }
        }
        return {
          isValid: true,
          assignments,
        };
      }
    }

    // Étape 2 : Backtracking déterministe avec heuristique MRV (Minimum Remaining Values)
    // Les participants ayant un tirage forcé (1 seul choix possible) ou des exclusions strictes sont placés en premier.
    const shuffledParticipants = this.shuffle(participants);
    const giversSorted = [...shuffledParticipants].sort((a, b) => {
      const aOptions = participants.filter((r) => this.canAssign(a, r, participants)).length;
      const bOptions = participants.filter((r) => this.canAssign(b, r, participants)).length;
      return aOptions - bOptions;
    });

    const assignedReceivers = new Set<string>();
    const assignments: Record<string, string> = {};

    const backtrackDerangement = (index: number): boolean => {
      if (index === giversSorted.length) {
        return true;
      }

      const giver = giversSorted[index];
      const candidates = this.shuffle(
        participants.filter(
          (receiver) =>
            !assignedReceivers.has(receiver.id) &&
            this.canAssign(giver, receiver, participants)
        )
      );

      // Évite autant que possible les paires réciproques directes (A <-> B) quand N >= 4 si non forcées
      const nonReciprocal = candidates.filter((c) => assignments[c.id] !== giver.id);
      const reciprocal = candidates.filter((c) => assignments[c.id] === giver.id);
      const orderedCandidates = [...nonReciprocal, ...reciprocal];

      for (const receiver of orderedCandidates) {
        assignments[giver.id] = receiver.id;
        assignedReceivers.add(receiver.id);
        if (backtrackDerangement(index + 1)) {
          return true;
        }
        delete assignments[giver.id];
        assignedReceivers.delete(receiver.id);
      }

      return false;
    };

    if (backtrackDerangement(0)) {
      return {
        isValid: true,
        assignments,
      };
    }

    return {
      isValid: false,
      errorMessage:
        "Combinaison impossible : les règles d'exclusion et de tirage forcé actuelles bloquent toutes les permutations valides. Assouplissez une règle.",
    };
  }
}
