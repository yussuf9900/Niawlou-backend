import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface RespondToDelayInput {
  orderId: string;
  clientId: string;
  accepted: boolean;
}

export class RespondToDelayUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: RespondToDelayInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) throw new OrderNotFoundError(input.orderId);

    if (order.clientId !== input.clientId) {
      throw new UnauthorizedActionError('Seul le client peut accepter ou refuser ce report.');
    }

    order.respondToDelay(input.accepted);
    await this.orderRepo.update(order);

    const title = input.accepted ? 'Report accepté par le client ✅' : 'Report refusé par le client ⚠️';
    const body = input.accepted
      ? `Le client a accepté la nouvelle date de livraison pour la commande ${order.orderReference}.`
      : `Le client n'a pas accepté la date proposée pour la commande ${order.orderReference}. Veuillez le contacter.`;

    await this.notifier.sendPush({
      recipientId: order.tailorId,
      title,
      body,
      data: { orderId: order.id, accepted: input.accepted }
    });

    return order;
  }
}
