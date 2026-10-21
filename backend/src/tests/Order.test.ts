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

  it('initialise correctement la commande avec ses montants et statuts par défaut', () => {
    const order = createTestOrder();
    expect(order.totalAmount.amount).toBe(36500);
    expect(order.orderStatus).toBe(OrderStatus.DEVIS_A_ACCEPTER);
    expect(order.paymentStatus).toBe(PaymentStatus.AUCUN_PAIEMENT);
    expect(order.confectionStep).toBe(ConfectionStep.NON_COMMENCEE);
  });

  it('accepte le devis et passe en attente de paiement initial', () => {
    const order = createTestOrder();
    order.acceptQuotation(Money.from(15000));
    expect(order.advanceAmount.amount).toBe(15000);
    expect(order.balanceAmount.amount).toBe(21500);
    expect(order.orderStatus).toBe(OrderStatus.EN_ATTENTE_PAIEMENT_INITIAL);
    expect(order.paymentStatus).toBe(PaymentStatus.ACOMPTE_EN_ATTENTE);
  });

  it('passe en confection uniquement après confirmation de l\'acompte Orange Money', () => {
    const order = createTestOrder();
    order.acceptQuotation(Money.from(15000));

    // Impossible de mettre à jour l'étape de confection avant l'acompte
    expect(() => order.updateConfectionStep(ConfectionStep.COUPE_ASSEMBLAGE)).toThrow(
      InvalidOrderStateTransitionError
    );

    // Confirmation de l'acompte
    order.confirmAdvancePayment('OM-TX-12345');
    expect(order.paymentStatus).toBe(PaymentStatus.ACOMPTE_CONFIRME);
    expect(order.orderStatus).toBe(OrderStatus.EN_CONFECTION);
    expect(order.confectionStep).toBe(ConfectionStep.COUPE_ASSEMBLAGE);

    // Maintenant le couturier peut avancer les étapes
    order.updateConfectionStep(ConfectionStep.FINITIONS_CONTROLE);
    expect(order.confectionStep).toBe(ConfectionStep.FINITIONS_CONTROLE);

    order.updateConfectionStep(ConfectionStep.VETEMENT_PRET);
    expect(order.orderStatus).toBe(OrderStatus.PRETE);
    expect(order.deliveryStatus).toBe(DeliveryStatus.REMISE_PLANIFIEE);
  });

  it('exige la remise physique du vêtement avant d\'autoriser le règlement du solde', () => {
    const order = createTestOrder();
    order.acceptQuotation(Money.from(15000));
    order.confirmAdvancePayment('OM-TX-12345');
    order.updateConfectionStep(ConfectionStep.VETEMENT_PRET);

    // Impossible de régler le solde tant que le vêtement n'est pas remis
    expect(() => order.confirmBalancePayment('OM-TX-BALANCE')).toThrow(
      InvalidOrderStateTransitionError
    );

    // Remise physique effectuée
    order.confirmDelivery();
    expect(order.deliveryStatus).toBe(DeliveryStatus.REMISE_EFFECTUEE);
    expect(order.orderStatus).toBe(OrderStatus.REMISE_EFFECTUEE);
    expect(order.paymentStatus).toBe(PaymentStatus.SOLDE_EN_ATTENTE);

    // Règlement du solde
    order.confirmBalancePayment('OM-TX-BALANCE');
    expect(order.paymentStatus).toBe(PaymentStatus.PAYE_INTEGRALEMENT);
    expect(order.orderStatus).toBe(OrderStatus.TERMINEE);
  });
});
