import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { IPaymentGateway } from '../../ports/IPaymentGateway.js';
import { INotificationService } from '../../ports/INotificationService.js';
import { OrderNotFoundError } from '../../domain/errors/DomainErrors.js';
import { Order } from '../../domain/entities/Order.js';

export interface ProcessPaymentCallbackInput {
  transactionReference: string;
}

export class ProcessOrangeMoneyCallbackUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private paymentGateway: IPaymentGateway,
    private notifier: INotificationService
  ) {}

  public async execute(input: ProcessPaymentCallbackInput): Promise<Order> {
    const verification = await this.paymentGateway.verifyPayment(input.transactionReference);
    if (verification.status !== 'SUCCESS') {
      throw new Error(`Paiement non confirmé par Orange Money. Statut actuel: ${verification.status}`);
    }

    // Extraction de la référence de commande depuis transactionReference (ex: OM-NIA-0248-ADV-1234)
    const parts = input.transactionReference.split('-');
    // format: OM - NIA - XXXX - TYPE - TS
    let orderRef = '';
    let isAdvance = false;
    if (parts.length >= 4) {
      orderRef = `${parts[1]}-${parts[2]}`;
      isAdvance = parts[3] === 'ADV';
    }

    const order = await this.orderRepo.findByReference(orderRef);
    if (!order) {
      throw new OrderNotFoundError(orderRef);
    }

    if (isAdvance) {
      order.confirmAdvancePayment(input.transactionReference);
      await this.orderRepo.update(order);

      await this.notifier.sendPush({
        recipientId: order.tailorId,
        title: 'Acompte Orange Money confirmé ! 💰',
        body: `L'acompte de ${order.advanceAmount.format()} pour la commande ${order.orderReference} est validé. Vous pouvez démarrer la coupe !`,
        data: { orderId: order.id, transactionRef: input.transactionReference }
      });
    } else {
      order.confirmBalancePayment(input.transactionReference);
      await this.orderRepo.update(order);

      await this.notifier.sendPush({
        recipientId: order.clientId,
        title: 'Commande finalisée avec succès ! 🎉',
        body: `Votre paiement du solde de ${order.balanceAmount.format()} est validé. Merci d'avoir utilisé NIAWLOU !`,
        data: { orderId: order.id, transactionRef: input.transactionReference }
      });

      await this.notifier.sendPush({
        recipientId: order.tailorId,
        title: 'Solde Orange Money reçu ! 💰',
        body: `Le solde de ${order.balanceAmount.format()} pour la commande ${order.orderReference} a été crédité sur votre compte Orange Money.`,
        data: { orderId: order.id, transactionRef: input.transactionReference }
      });
    }

    return order;
  }
}
