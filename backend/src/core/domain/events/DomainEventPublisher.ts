/**
 * Événements du Domaine (Domain Events)
 * Permettent le découplage via le pattern Observer / PubSub.
 */

export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
}

export type EventHandler<T extends IDomainEvent = IDomainEvent> = (event: T) => Promise<void> | void;

export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  public subscribe<T extends IDomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler as EventHandler);
    this.handlers.set(eventName, list);
  }

  public async publish(event: IDomainEvent): Promise<void> {
    const list = this.handlers.get(event.eventName) || [];
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Erreur lors du traitement de l'événement ${event.eventName}:`, err);
      }
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
