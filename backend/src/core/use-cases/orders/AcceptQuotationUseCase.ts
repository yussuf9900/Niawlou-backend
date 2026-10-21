import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { Money } from '../../domain/value-objects/Money.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface AcceptQuotationInput {
  orderId: string;
  clientId: string;
  customAdvanceAmount?: number;
}

export class AcceptQuotationUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: AcceptQuotationInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.clientId !== input.clientId) {
      throw new UnauthorizedActionError('Seul le client émetteur peut accepter ce devis.');
    }

    const advance = input.customAdvanceAmount ? Money.from(input.customAdvanceAmount) : undefined;
    order.acceptQuotation(advance);

    await this.orderRepo.update(order);

    await this.notifier.sendPush({
      recipientId: order.tailorId,
      title: 'Devis accepté !',
      body: `Le client a accepté le devis pour la commande ${order.orderReference}. En attente du versement de l'acompte.`,
      data: { orderId: order.id }
    });

    return order;
  }
}
