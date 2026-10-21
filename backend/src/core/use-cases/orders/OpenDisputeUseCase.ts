import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { OrderNotFoundError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { getPrismaClient } from '../../../infrastructure/database/PrismaClientSingleton.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { Order } from '../../domain/entities/Order.js';

export interface OpenDisputeInput {
  orderId: string;
  userId: string;
  reason: string;
}

export class OpenDisputeUseCase {
  private prisma = getPrismaClient();

  constructor(
    private orderRepo: IOrderRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: OpenDisputeInput): Promise<Order> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.clientId !== input.userId && order.tailorId !== input.userId) {
      throw new UnauthorizedActionError('Seules les parties prenantes de la commande peuvent ouvrir un litige.');
    }

    order.openDispute(input.reason);
    await this.orderRepo.update(order);

    await this.prisma.dispute.create({
      data: {
        orderId: order.id,
        initiatorId: input.userId,
        reason: input.reason,
        status: 'OUVERT'
      }
    });

    await this.notifier.sendPush({
      recipientId: order.tailorId,
      title: 'Signalement / Retouche demandée ⚠️',
      body: `Un signalement a été ouvert pour la commande ${order.orderReference}. Motif: "${input.reason}"`,
      data: { orderId: order.id }
    });

    return order;
  }
}
