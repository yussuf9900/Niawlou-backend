import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface ConfirmDeliveryInput {
  orderId: string;
  userId: string; // client ou couturier
}

export class ConfirmDeliveryUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: ConfirmDeliveryInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.clientId !== input.userId && order.tailorId !== input.userId) {
      throw new UnauthorizedActionError('Seul le client ou le couturier peut enregistrer la remise du vêtement.');
    }

    order.confirmDelivery();
    await this.orderRepo.update(order);

    await this.notifier.sendPush({
      recipientId: order.clientId,
      title: 'Réception du vêtement confirmée 👗',
      body: `Veuillez procéder au règlement du solde (${order.balanceAmount.format()}) via Orange Money.`,
      data: { orderId: order.id }
    });

    return order;
  }
}
