import crypto from 'crypto';
import { IOrderRepository } from '../../ports/IOrderRepository.js';
import { ITailorRepository } from '../../ports/IUserRepository.js';
import { Order } from '../../domain/entities/Order.js';
import { Money } from '../../domain/value-objects/Money.js';
import { Measurements, MeasurementValues } from '../../domain/value-objects/Measurements.js';
import { DeliveryMode } from '../../domain/value-objects/Statuses.js';
import { INotificationService } from '../../ports/INotificationService.js';

export interface CreateOrderInput {
  clientId: string;
  tailorId: string;
  modelId?: string;
  title: string;
  description?: string;
  clothingPrice: number;
  deliveryMode: DeliveryMode;
  deliveryAddress?: string;
  deliveryFee?: number;
  measurements: MeasurementValues;
  targetDeliveryDate?: string;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private tailorRepo: ITailorRepository,
    private notifier: INotificationService
  ) {}

  public async execute(input: CreateOrderInput): Promise<Order> {
    const id = crypto.randomUUID();
    // Génération d'une référence conviviale unique (ex: NIA-8392)
    const orderReference = `NIA-${Math.floor(1000 + Math.random() * 9000)}`;

    const clothingPrice = Money.from(input.clothingPrice);
    const deliveryFee = input.deliveryFee !== undefined
      ? Money.from(input.deliveryFee)
      : input.deliveryMode === DeliveryMode.DOMICILE
      ? Money.from(1500)
      : Money.zero();

    const measurementsSnapshot = new Measurements(input.measurements);
    const targetDate = input.targetDeliveryDate ? new Date(input.targetDeliveryDate) : undefined;

    const order = Order.create({
      id,
      orderReference,
      clientId: input.clientId,
      tailorId: input.tailorId,
      modelId: input.modelId,
      title: input.title,
      description: input.description,
      clothingPrice,
      deliveryMode: input.deliveryMode,
      deliveryAddress: input.deliveryAddress,
      deliveryFee,
      measurementsSnapshot,
      targetDeliveryDate: targetDate
    });

    await this.orderRepo.save(order);

    // Notification au couturier
    await this.notifier.sendPush({
      recipientId: input.tailorId,
      title: 'Nouvelle demande de commande reçue !',
      body: `Une nouvelle commande (${order.orderReference} - ${order.title}) attend votre validation.`,
      data: { orderId: order.id, orderReference: order.orderReference }
    });

    return order;
  }
}
