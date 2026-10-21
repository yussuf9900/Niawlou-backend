import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { ConfectionStep } from '../../domain/value-objects/Statuses.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface UpdateConfectionStepInput {
  orderId: string;
  tailorId: string;
  step: ConfectionStep;
}

export class UpdateConfectionStepUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: UpdateConfectionStepInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.tailorId !== input.tailorId) {
      throw new UnauthorizedActionError('Seul le couturier assigné peut mettre à jour l\'étape de confection.');
    }

    order.updateConfectionStep(input.step);
    await this.orderRepo.update(order);

    let notifTitle = 'Progression de votre tenue ✂️';
    let notifBody = `Votre vêtement (${order.orderReference}) passe à l'étape: ${input.step}`;
    if (input.step === ConfectionStep.VETEMENT_PRET) {
      notifTitle = 'Votre vêtement est prêt ! ✨';
      notifBody = order.deliveryMode === 'DOMICILE'
        ? `Votre tenue (${order.orderReference}) est prête. La livraison à domicile va être organisée.`
        : `Votre tenue (${order.orderReference}) vous attend à l'atelier pour essayage et remise.`;
    }

    await this.notifier.sendPush({
      recipientId: order.clientId,
      title: notifTitle,
      body: notifBody,
      data: { orderId: order.id, step: input.step }
    });

    return order;
  }
}
