import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface ProposeDelayInput {
  orderId: string;
  tailorId: string;
  newDate: string;
  reason: string;
}

export class ProposeDelayUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: ProposeDelayInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) throw new OrderNotFoundError(input.orderId);

    if (order.tailorId !== input.tailorId) {
      throw new UnauthorizedActionError('Seul le couturier assigné peut proposer un report de délai.');
    }

    order.proposeDelay(new Date(input.newDate), input.reason);
    await this.orderRepo.update(order);

    await this.notifier.sendPush({
      recipientId: order.clientId,
      title: 'Information de confection — Report proposé 📅',
      body: `L'atelier propose une nouvelle date pour votre commande ${order.orderReference}. Motif: "${input.reason}"`,
      data: { orderId: order.id, newDate: input.newDate, reason: input.reason }
    });

    return order;
  }
}
