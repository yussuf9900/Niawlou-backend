import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { IPaymentGateway, PaymentInitializationResult } from '../../ports/IPaymentGateway.js';
import { IUserRepository } from '../../ports/IUserRepository.js';
import { OrderNotFoundError, InvalidOrderStateTransitionError, UnauthorizedActionError } from '../../domain/errors/DomainErrors.js';
import { PaymentStatus, DeliveryStatus } from '../../domain/value-objects/Statuses.js';

export interface InitPaymentInput {
  orderId: string;
  userId: string;
  type: 'ADVANCE' | 'BALANCE';
}

export class InitOrangeMoneyPaymentUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private userRepo: IUserRepository,
    private paymentGateway: IPaymentGateway
  ) {}

  public async execute(input: InitPaymentInput): Promise<PaymentInitializationResult> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.clientId !== input.userId) {
      throw new UnauthorizedActionError('Seul le client peut effectuer le règlement pour cette commande.');
    }

    const customer = await this.userRepo.findById(input.userId);
    if (!customer) {
      throw new Error('Profil utilisateur introuvable.');
    }

    let amount = order.advanceAmount;
    if (input.type === 'ADVANCE') {
      if (order.paymentStatus === PaymentStatus.ACOMPTE_CONFIRME || order.paymentStatus === PaymentStatus.PAYE_INTEGRALEMENT) {
        throw new InvalidOrderStateTransitionError(order.paymentStatus, PaymentStatus.ACOMPTE_EN_ATTENTE, 'L\'acompte a déjà été réglé.');
      }
      amount = order.advanceAmount;
    } else if (input.type === 'BALANCE') {
      if (order.deliveryStatus !== DeliveryStatus.REMISE_EFFECTUEE) {
        throw new InvalidOrderStateTransitionError(
          order.deliveryStatus,
          DeliveryStatus.REMISE_EFFECTUEE,
          'Le solde ne peut être réglé qu\'après la remise et vérification physique de la tenue.'
        );
      }
      if (order.paymentStatus === PaymentStatus.PAYE_INTEGRALEMENT) {
        throw new InvalidOrderStateTransitionError(order.paymentStatus, PaymentStatus.PAYE_INTEGRALEMENT, 'Le solde a déjà été intégralement réglé.');
      }
      amount = order.balanceAmount;
    }

    const initResult = await this.paymentGateway.initializePayment({
      orderId: order.id,
      orderReference: order.orderReference,
      amount,
      customerPhone: customer.phone,
      customerName: customer.name,
      type: input.type
    });

    return initResult;
  }
}
