/**
 * Erreurs métier du domaine NIAWLOU
 */

export abstract class DomainError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OrderNotFoundError extends DomainError {
  public readonly statusCode = 404;
  public readonly code = 'ORDER_NOT_FOUND';

  constructor(orderId: string) {
    super(`Commande introuvable avec l'identifiant: ${orderId}`);
  }
}

export class InvalidOrderStateTransitionError extends DomainError {
  public readonly statusCode = 400;
  public readonly code = 'INVALID_STATE_TRANSITION';

  constructor(current: string, target: string, reason?: string) {
    super(
      `Transition d'état interdite: impossible de passer de '${current}' à '${target}'.${
        reason ? ` Motif: ${reason}` : ''
      }`
    );
  }
}

export class PaymentAlreadyProcessedError extends DomainError {
  public readonly statusCode = 409;
  public readonly code = 'PAYMENT_ALREADY_PROCESSED';

  constructor(reference: string) {
    super(`Le paiement portant la référence '${reference}' a déjà été validé.`);
  }
}

export class QuotationAlreadyAcceptedError extends DomainError {
  public readonly statusCode = 400;
  public readonly code = 'QUOTATION_ALREADY_ACCEPTED';

  constructor(orderId: string) {
    super(`Le devis de la commande '${orderId}' a déjà été accepté.`);
  }
}

export class UnauthorizedActionError extends DomainError {
  public readonly statusCode = 403;
  public readonly code = 'UNAUTHORIZED_ACTION';

  constructor(message = "Action non autorisée pour ce profil d'utilisateur.") {
    super(message);
  }
}

export class DisputeDeadlineExceededError extends DomainError {
  public readonly statusCode = 400;
  public readonly code = 'DISPUTE_DEADLINE_EXCEEDED';

  constructor(hoursLimit: number) {
    super(
      `Le délai de signalement d'anomalie (${hoursLimit} heures après la réception) est expiré.`
    );
  }
}
