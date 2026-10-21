import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { Money } from '../../domain/value-objects/Money.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface ValidateOrderInput {
  orderId: string;
  tailorId: string;
  confirmedClothingPrice?: number;
  advanceAmount?: number;
  targetDeliveryDate?: string;
  notes?: string;
}

export class ValidateOrderAndIssueQuotationUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: ValidateOrderInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.tailorId !== input.tailorId) {
      throw new UnauthorizedActionError('Seul le couturier assigné peut valider cette commande et émettre le devis.');
    }

    order.tailorValidateAndIssueQuotation({
      confirmedClothingPrice: input.confirmedClothingPrice ? Money.from(input.confirmedClothingPrice) : undefined,
      advanceAmount: input.advanceAmount ? Money.from(input.advanceAmount) : undefined,
      targetDeliveryDate: input.targetDeliveryDate ? new Date(input.targetDeliveryDate) : undefined,
      notes: input.notes
    });

    await this.orderRepo.update(order);

    await this.notifier.sendPush({
      recipientId: order.clientId,
      title: 'Devis de confection reçu ! ✂️',
      body: `L'atelier a validé votre commande (${order.orderReference}). Le devis est prêt pour acceptation et acompte.`,
      data: { orderId: order.id, orderReference: order.orderReference }
    });

    return order;
  }
}
