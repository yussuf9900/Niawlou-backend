import { describe, it, expect } from 'vitest';
import { Order } from '../core/domain/entities/Order.js';
import { Money } from '../core/domain/value-objects/Money.js';
import { Measurements } from '../core/domain/value-objects/Measurements.js';
import {
  DeliveryMode,
  OrderStatus,
  PaymentStatus,
  ConfectionStep,
  DeliveryStatus
} from '../core/domain/value-objects/Statuses.js';
import { InvalidOrderStateTransitionError } from '../core/domain/errors/DomainErrors.js';

describe('Aggregate: Order (Invariants & Transitions d\'état)', () => {
  const measurements = new Measurements({
    tourPoitrine: 92,
    tourTaille: 74,
    tourBassin: 102
  });

  function createTestOrder(): Order {
    return Order.create({
      id: 'order-123',
      orderReference: 'NIA-TEST',
      clientId: 'client-1',
      tailorId: 'tailor-1',
      title: 'Robe de Cérémonie',
      clothingPrice: Money.from(35000),
      deliveryMode: DeliveryMode.DOMICILE,
      deliveryFee: Money.from(1500),
      measurementsSnapshot: measurements
    });
  }

  it('initialise la commande en attente de validation du couturier', () => {
    const order = createTestOrder();
    expect(order.totalAmount.amount).toBe(36500);
    expect(order.orderStatus).toBe(OrderStatus.EN_ATTENTE_COUTURIER);
    expect(order.paymentStatus).toBe(PaymentStatus.AUCUN_PAIEMENT);
    expect(order.confectionStep).toBe(ConfectionStep.NON_COMMENCEE);
  });

  it('permet au couturier de valider la commande et émettre le devis chiffré', () => {
    const order = createTestOrder();
    order.tailorValidateAndIssueQuotation({
      confirmedClothingPrice: Money.from(35000),
      advanceAmount: Money.from(15000),
      notes: 'Mesures vérifiées avec la cliente'
    });

    expect(order.orderStatus).toBe(OrderStatus.DEVIS_A_ACCEPTER);
    expect(order.advanceAmount.amount).toBe(15000);
    expect(order.balanceAmount.amount).toBe(21500);

    // Le client peut maintenant accepter le devis
    order.acceptQuotation();
    expect(order.orderStatus).toBe(OrderStatus.EN_ATTENTE_PAIEMENT_INITIAL);
    expect(order.paymentStatus).toBe(PaymentStatus.ACOMPTE_EN_ATTENTE);
  });

  it('gère le cycle complet : acompte OM -> confection -> report -> remise -> solde', () => {
    const order = createTestOrder();
    order.tailorValidateAndIssueQuotation({ advanceAmount: Money.from(15000) });
    order.acceptQuotation();

    // Confirmation de l'acompte Orange Money
    order.confirmAdvancePayment('OM-TX-ADV-123');
    expect(order.paymentStatus).toBe(PaymentStatus.ACOMPTE_CONFIRME);
    expect(order.orderStatus).toBe(OrderStatus.EN_CONFECTION);
    expect(order.confectionStep).toBe(ConfectionStep.COUPE_ASSEMBLAGE);

    // Proposition d'un report de délai par le couturier
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 3);
    order.proposeDelay(newDate, 'Attente des boutons dorés');
    expect(order.toJSON().delayProposal).toBeDefined();

    // Client accepte le report
    order.respondToDelay(true);
    expect(order.toJSON().statuses).toHaveProperty('delayStatus', 'ACCEPTEE');

    // Progression des étapes
    order.updateConfectionStep(ConfectionStep.FINITIONS_CONTROLE);
    order.updateConfectionStep(ConfectionStep.VETEMENT_PRET);
    expect(order.orderStatus).toBe(OrderStatus.PRETE);

    // Remise physique effectuée
    order.confirmDelivery();
    expect(order.deliveryStatus).toBe(DeliveryStatus.REMISE_EFFECTUEE);
    expect(order.paymentStatus).toBe(PaymentStatus.SOLDE_EN_ATTENTE);

    // Paiement du solde via Orange Money
    order.confirmBalancePayment('OM-TX-BAL-456');
    expect(order.paymentStatus).toBe(PaymentStatus.PAYE_INTEGRALEMENT);
    expect(order.orderStatus).toBe(OrderStatus.TERMINEE);
  });
});
