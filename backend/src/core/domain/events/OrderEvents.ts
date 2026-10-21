import { IDomainEvent } from './DomainEventPublisher.js';

export class OrderCreatedEvent implements IDomainEvent {
  public readonly eventName = 'OrderCreated';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { clientId: string; tailorId: string; modelId?: string }
  ) {}
}

export class QuotationAcceptedEvent implements IDomainEvent {
  public readonly eventName = 'QuotationAccepted';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { totalAmount: number; advanceAmount: number; balanceAmount: number }
  ) {}
}

export class AdvancePaymentConfirmedEvent implements IDomainEvent {
  public readonly eventName = 'AdvancePaymentConfirmed';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { transactionRef: string; amount: number }
  ) {}
}

export class ConfectionStepUpdatedEvent implements IDomainEvent {
  public readonly eventName = 'ConfectionStepUpdated';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { step: string; tailorId: string }
  ) {}
}

export class DeliveryConfirmedEvent implements IDomainEvent {
  public readonly eventName = 'DeliveryConfirmed';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { deliveredAt: Date; mode: string }
  ) {}
}

export class BalancePaymentConfirmedEvent implements IDomainEvent {
  public readonly eventName = 'BalancePaymentConfirmed';
  public readonly occurredOn = new Date();
  constructor(
    public readonly aggregateId: string,
    public readonly payload: { transactionRef: string; amount: number }
  ) {}
}
