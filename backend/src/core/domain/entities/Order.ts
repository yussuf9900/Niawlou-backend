import { Money } from '../value-objects/Money.js';
import { Measurements } from '../value-objects/Measurements.js';
import {
  OrderStatus,
  PaymentStatus,
  DeliveryMode,
  DeliveryStatus,
  ConfectionStep
} from '../value-objects/Statuses.js';
import {
  InvalidOrderStateTransitionError,
  DisputeDeadlineExceededError
} from '../errors/DomainErrors.js';
import {
  DomainEventPublisher
} from '../events/DomainEventPublisher.js';
import {
  OrderCreatedEvent,
  QuotationAcceptedEvent,
  AdvancePaymentConfirmedEvent,
  ConfectionStepUpdatedEvent,
  DeliveryConfirmedEvent,
  BalancePaymentConfirmedEvent
} from '../events/OrderEvents.js';

export interface OrderProps {
  id: string;
  orderReference: string; // ex: NIA-0248
  clientId: string;
  tailorId: string;
  modelId?: string;
  title: string;
  description?: string;
  clothingPrice: Money;
  deliveryFee: Money;
  advanceAmount: Money;
  balanceAmount: Money;
  deliveryMode: DeliveryMode;
  deliveryAddress?: string;
  measurementsSnapshot: Measurements;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  confectionStep: ConfectionStep;
  deliveryStatus: DeliveryStatus;
  targetDeliveryDate?: Date;
  deliveredAt?: Date;
  advancePaymentRef?: string;
  balancePaymentRef?: string;
  notes?: string;
  delayReason?: string;
  proposedDeliveryDate?: Date;
  delayStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  private props: OrderProps;

  constructor(props: OrderProps) {
    this.props = { ...props };
  }

  public static create(params: {
    id: string;
    orderReference: string;
    clientId: string;
    tailorId: string;
    modelId?: string;
    title: string;
    description?: string;
    clothingPrice: Money;
    deliveryMode: DeliveryMode;
    deliveryAddress?: string;
    deliveryFee?: Money;
    measurementsSnapshot: Measurements;
    targetDeliveryDate?: Date;
  }): Order {
    const deliveryFee = params.deliveryFee || (params.deliveryMode === DeliveryMode.DOMICILE ? Money.from(1500) : Money.zero());
    const total = params.clothingPrice.add(deliveryFee);
    // Par défaut, l'acompte est d'environ 40% (ou montant fixé par devis)
    const advance = total.percentage(40);
    const balance = total.subtract(advance);

    const order = new Order({
      id: params.id,
      orderReference: params.orderReference,
      clientId: params.clientId,
      tailorId: params.tailorId,
      modelId: params.modelId,
      title: params.title,
      description: params.description,
      clothingPrice: params.clothingPrice,
      deliveryFee,
      advanceAmount: advance,
      balanceAmount: balance,
      deliveryMode: params.deliveryMode,
      deliveryAddress: params.deliveryAddress,
      measurementsSnapshot: params.measurementsSnapshot,
      orderStatus: OrderStatus.EN_ATTENTE_COUTURIER,
      paymentStatus: PaymentStatus.AUCUN_PAIEMENT,
      confectionStep: ConfectionStep.NON_COMMENCEE,
      deliveryStatus: DeliveryStatus.A_DEFINIR,
      targetDeliveryDate: params.targetDeliveryDate,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    DomainEventPublisher.getInstance().publish(
      new OrderCreatedEvent(order.id, {
        clientId: order.clientId,
        tailorId: order.tailorId,
        modelId: order.modelId
      })
    );

    return order;
  }

  public get id(): string { return this.props.id; }
  public get orderReference(): string { return this.props.orderReference; }
  public get clientId(): string { return this.props.clientId; }
  public get tailorId(): string { return this.props.tailorId; }
  public get modelId(): string | undefined { return this.props.modelId; }
  public get title(): string { return this.props.title; }
  public get description(): string | undefined { return this.props.description; }
  public get clothingPrice(): Money { return this.props.clothingPrice; }
  public get deliveryFee(): Money { return this.props.deliveryFee; }
  public get totalAmount(): Money { return this.props.clothingPrice.add(this.props.deliveryFee); }
  public get advanceAmount(): Money { return this.props.advanceAmount; }
  public get balanceAmount(): Money { return this.props.balanceAmount; }
  public get deliveryMode(): DeliveryMode { return this.props.deliveryMode; }
  public get deliveryAddress(): string | undefined { return this.props.deliveryAddress; }
  public get measurementsSnapshot(): Measurements { return this.props.measurementsSnapshot; }
  public get orderStatus(): OrderStatus { return this.props.orderStatus; }
  public get paymentStatus(): PaymentStatus { return this.props.paymentStatus; }
  public get confectionStep(): ConfectionStep { return this.props.confectionStep; }
  public get deliveryStatus(): DeliveryStatus { return this.props.deliveryStatus; }
  public get targetDeliveryDate(): Date | undefined { return this.props.targetDeliveryDate; }
  public get deliveredAt(): Date | undefined { return this.props.deliveredAt; }
  public get advancePaymentRef(): string | undefined { return this.props.advancePaymentRef; }
  public get balancePaymentRef(): string | undefined { return this.props.balancePaymentRef; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Validation de la commande et émission du devis chiffré par le couturier
   * Fait passer la commande de EN_ATTENTE_COUTURIER à DEVIS_A_ACCEPTER
   */
  public tailorValidateAndIssueQuotation(params: {
    confirmedClothingPrice?: Money;
    advanceAmount?: Money;
    targetDeliveryDate?: Date;
    notes?: string;
  }): void {
    if (this.props.orderStatus !== OrderStatus.EN_ATTENTE_COUTURIER) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        OrderStatus.DEVIS_A_ACCEPTER,
        'La commande doit être en attente de validation du couturier pour émettre le devis.'
      );
    }

    if (params.confirmedClothingPrice) {
      this.props.clothingPrice = params.confirmedClothingPrice;
    }
    const total = this.totalAmount;
    this.props.advanceAmount = params.advanceAmount || total.percentage(40);
    this.props.balanceAmount = total.subtract(this.props.advanceAmount);

    if (params.targetDeliveryDate) {
      this.props.targetDeliveryDate = params.targetDeliveryDate;
    }
    if (params.notes) {
      this.props.notes = params.notes;
    }

    this.props.orderStatus = OrderStatus.DEVIS_A_ACCEPTER;
    this.props.updatedAt = new Date();
  }

  /**
   * Validation / Acceptation formelle du devis par le client
   */
  public acceptQuotation(advanceAmount?: Money): void {
    if (this.props.orderStatus !== OrderStatus.DEVIS_A_ACCEPTER) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        OrderStatus.EN_ATTENTE_PAIEMENT_INITIAL,
        'Le devis a déjà été traité ou la commande n\'est plus en phase de devis.'
      );
    }

    if (advanceAmount) {
      this.props.advanceAmount = advanceAmount;
      this.props.balanceAmount = this.totalAmount.subtract(advanceAmount);
    }

    this.props.orderStatus = OrderStatus.EN_ATTENTE_PAIEMENT_INITIAL;
    this.props.paymentStatus = PaymentStatus.ACOMPTE_EN_ATTENTE;
    this.props.updatedAt = new Date();

    DomainEventPublisher.getInstance().publish(
      new QuotationAcceptedEvent(this.id, {
        totalAmount: this.totalAmount.amount,
        advanceAmount: this.advanceAmount.amount,
        balanceAmount: this.balanceAmount.amount
      })
    );
  }

  /**
   * Confirmation du paiement de l'acompte via Orange Money
   * Déclenche automatiquement le statut EN_CONFECTION
   */
  public confirmAdvancePayment(transactionRef: string): void {
    if (this.props.paymentStatus !== PaymentStatus.ACOMPTE_EN_ATTENTE) {
      throw new InvalidOrderStateTransitionError(
        this.props.paymentStatus,
        PaymentStatus.ACOMPTE_CONFIRME,
        'Aucun acompte en attente pour cette commande.'
      );
    }

    this.props.advancePaymentRef = transactionRef;
    this.props.paymentStatus = PaymentStatus.ACOMPTE_CONFIRME;
    this.props.orderStatus = OrderStatus.EN_CONFECTION;
    this.props.confectionStep = ConfectionStep.COUPE_ASSEMBLAGE;
    this.props.updatedAt = new Date();

    DomainEventPublisher.getInstance().publish(
      new AdvancePaymentConfirmedEvent(this.id, {
        transactionRef,
        amount: this.advanceAmount.amount
      })
    );
  }

  /**
   * Évolution de l'étape de confection par le couturier (Stepper atelier)
   */
  public updateConfectionStep(newStep: ConfectionStep): void {
    if (this.props.orderStatus !== OrderStatus.EN_CONFECTION && this.props.orderStatus !== OrderStatus.PRETE) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        newStep,
        'La commande doit être en cours de confection pour faire évoluer ses étapes.'
      );
    }

    this.props.confectionStep = newStep;
    if (newStep === ConfectionStep.VETEMENT_PRET) {
      this.props.orderStatus = OrderStatus.PRETE;
      this.props.deliveryStatus = DeliveryStatus.REMISE_PLANIFIEE;
    }
    this.props.updatedAt = new Date();

    DomainEventPublisher.getInstance().publish(
      new ConfectionStepUpdatedEvent(this.id, {
        step: newStep,
        tailorId: this.tailorId
      })
    );
  }

  /**
   * Proposition d'un report de délai motivé par le couturier (Section 7 du CDC)
   */
  public proposeDelay(newDate: Date, reason: string): void {
    if (this.props.orderStatus !== OrderStatus.EN_CONFECTION) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        'REPORT_PROPOSE',
        'Un report de délai ne peut être proposé que pendant la confection.'
      );
    }
    this.props.proposedDeliveryDate = newDate;
    this.props.delayReason = reason;
    this.props.delayStatus = 'PROPOSITION_ENVOYEE';
    this.props.updatedAt = new Date();
  }

  /**
   * Réponse du client à la proposition de report (sans contrainte d'échéance)
   */
  public respondToDelay(accepted: boolean): void {
    if (this.props.delayStatus !== 'PROPOSITION_ENVOYEE') {
      throw new InvalidOrderStateTransitionError(
        this.props.delayStatus || 'AUCUN_REPORT',
        'REPONSE_REPORT',
        'Aucune proposition de report en attente de réponse.'
      );
    }

    if (accepted && this.props.proposedDeliveryDate) {
      this.props.targetDeliveryDate = this.props.proposedDeliveryDate;
      this.props.delayStatus = 'ACCEPTEE';
    } else {
      this.props.delayStatus = 'REFUSEE';
    }
    this.props.updatedAt = new Date();
  }

  /**
   * Confirmation de la remise physique du vêtement (indépendante du paiement)
   */
  public confirmDelivery(): void {
    if (this.props.orderStatus !== OrderStatus.PRETE && this.props.orderStatus !== OrderStatus.EN_CONFECTION) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        OrderStatus.REMISE_EFFECTUEE,
        'Le vêtement doit être prêt pour être remis au client.'
      );
    }

    this.props.deliveredAt = new Date();
    this.props.deliveryStatus = DeliveryStatus.REMISE_EFFECTUEE;
    this.props.orderStatus = OrderStatus.REMISE_EFFECTUEE;
    // Dès la remise physique effectuée, le solde passe en attente de règlement
    this.props.paymentStatus = PaymentStatus.SOLDE_EN_ATTENTE;
    this.props.updatedAt = new Date();

    DomainEventPublisher.getInstance().publish(
      new DeliveryConfirmedEvent(this.id, {
        deliveredAt: this.props.deliveredAt,
        mode: this.deliveryMode
      })
    );
  }

  /**
   * Confirmation du paiement du solde via Orange Money
   * Clôture définitivement la commande (Statut TERMINÉE)
   */
  public confirmBalancePayment(transactionRef: string): void {
    if (this.props.deliveryStatus !== DeliveryStatus.REMISE_EFFECTUEE) {
      throw new InvalidOrderStateTransitionError(
        this.props.deliveryStatus,
        DeliveryStatus.REMISE_EFFECTUEE,
        'Le solde ne peut être réglé qu\'après la remise et vérification physique du vêtement.'
      );
    }

    this.props.balancePaymentRef = transactionRef;
    this.props.paymentStatus = PaymentStatus.PAYE_INTEGRALEMENT;
    this.props.orderStatus = OrderStatus.TERMINEE;
    this.props.updatedAt = new Date();

    DomainEventPublisher.getInstance().publish(
      new BalancePaymentConfirmedEvent(this.id, {
        transactionRef,
        amount: this.balanceAmount.amount
      })
    );
  }

  /**
   * Déclaration de litige ou demande de retouche sous 48h
   */
  public openDispute(reason: string): void {
    if (!this.props.deliveredAt) {
      throw new InvalidOrderStateTransitionError(
        this.props.orderStatus,
        OrderStatus.LITIGE,
        'Un litige ne peut être ouvert avant la remise du vêtement.'
      );
    }

    const elapsedHours = (Date.now() - this.props.deliveredAt.getTime()) / (1000 * 60 * 60);
    if (elapsedHours > 48) {
      throw new DisputeDeadlineExceededError(48);
    }

    this.props.orderStatus = OrderStatus.LITIGE;
    this.props.updatedAt = new Date();
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      orderReference: this.props.orderReference,
      clientId: this.props.clientId,
      tailorId: this.props.tailorId,
      modelId: this.props.modelId,
      title: this.props.title,
      description: this.props.description,
      pricing: {
        clothingPrice: this.props.clothingPrice.amount,
        deliveryFee: this.props.deliveryFee.amount,
        totalAmount: this.totalAmount.amount,
        advanceAmount: this.props.advanceAmount.amount,
        balanceAmount: this.props.balanceAmount.amount,
        currency: 'FCFA'
      },
      delivery: {
        mode: this.props.deliveryMode,
        address: this.props.deliveryAddress,
        status: this.props.deliveryStatus,
        targetDeliveryDate: this.props.targetDeliveryDate?.toISOString(),
        deliveredAt: this.props.deliveredAt?.toISOString()
      },
      statuses: {
        order: this.props.orderStatus,
        payment: this.props.paymentStatus,
        confectionStep: this.props.confectionStep,
        delayStatus: this.props.delayStatus || 'AUCUN_REPORT'
      },
      delayProposal: this.props.delayStatus ? {
        status: this.props.delayStatus,
        reason: this.props.delayReason,
        proposedDate: this.props.proposedDeliveryDate?.toISOString()
      } : undefined,
      notes: this.props.notes,
      paymentRefs: {
        advance: this.props.advancePaymentRef,
        balance: this.props.balancePaymentRef
      },
      measurementsSnapshot: this.props.measurementsSnapshot.toJSON(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }
}
