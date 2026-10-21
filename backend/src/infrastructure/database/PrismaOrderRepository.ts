import { IOrderRepository, OrderFilter } from '../../core/ports/IOrderRepository.js';
import { Order } from '../../core/domain/entities/Order.js';
import { Money } from '../../core/domain/value-objects/Money.js';
import { Measurements } from '../../core/domain/value-objects/Measurements.js';
import {
  OrderStatus,
  PaymentStatus,
  DeliveryMode,
  DeliveryStatus,
  ConfectionStep
} from '../../core/domain/value-objects/Statuses.js';
import { getPrismaClient } from './PrismaClientSingleton.js';
import { Order as PrismaOrder } from '@prisma/client';

export class PrismaOrderRepository implements IOrderRepository {
  private prisma = getPrismaClient();

  private toDomain(row: PrismaOrder): Order {
    let measurementsObj = {};
    try {
      measurementsObj = JSON.parse(row.measurementsSnapshot);
    } catch {
      measurementsObj = {};
    }

    return new Order({
      id: row.id,
      orderReference: row.orderReference,
      clientId: row.clientId,
      tailorId: row.tailorId,
      modelId: row.modelId || undefined,
      title: row.title,
      description: row.description || undefined,
      clothingPrice: Money.from(row.clothingPrice),
      deliveryFee: Money.from(row.deliveryFee),
      advanceAmount: Money.from(row.advanceAmount),
      balanceAmount: Money.from(row.balanceAmount),
      deliveryMode: row.deliveryMode as DeliveryMode,
      deliveryAddress: row.deliveryAddress || undefined,
      measurementsSnapshot: Measurements.fromJSON(measurementsObj),
      orderStatus: row.orderStatus as OrderStatus,
      paymentStatus: row.paymentStatus as PaymentStatus,
      confectionStep: row.confectionStep as ConfectionStep,
      deliveryStatus: row.deliveryStatus as DeliveryStatus,
      targetDeliveryDate: row.targetDeliveryDate || undefined,
      deliveredAt: row.deliveredAt || undefined,
      advancePaymentRef: row.advancePaymentRef || undefined,
      balancePaymentRef: row.balancePaymentRef || undefined,
      notes: row.notes || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }

  public async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  public async findByReference(reference: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { orderReference: reference } });
    if (!row) return null;
    return this.toDomain(row);
  }

  public async findMany(filter: OrderFilter): Promise<{ orders: Order[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.tailorId) where.tailorId = filter.tailorId;
    if (filter.status) where.orderStatus = filter.status;

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        take: filter.limit || 20,
        skip: filter.offset || 0,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      orders: rows.map((r) => this.toDomain(r)),
      total
    };
  }

  public async save(order: Order): Promise<void> {
    await this.prisma.order.create({
      data: {
        id: order.id,
        orderReference: order.orderReference,
        clientId: order.clientId,
        tailorId: order.tailorId,
        modelId: order.modelId,
        title: order.title,
        description: order.description,
        clothingPrice: order.clothingPrice.amount,
        deliveryFee: order.deliveryFee.amount,
        totalAmount: order.totalAmount.amount,
        advanceAmount: order.advanceAmount.amount,
        balanceAmount: order.balanceAmount.amount,
        deliveryMode: order.deliveryMode,
        deliveryAddress: order.deliveryAddress,
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        confectionStep: order.confectionStep,
        measurementsSnapshot: JSON.stringify(order.measurementsSnapshot.toJSON()),
        targetDeliveryDate: order.targetDeliveryDate,
        advancePaymentRef: order.advancePaymentRef,
        balancePaymentRef: order.balancePaymentRef
      }
    });
  }

  public async update(order: Order): Promise<void> {
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        confectionStep: order.confectionStep,
        deliveryStatus: order.deliveryStatus,
        deliveredAt: order.deliveredAt,
        advancePaymentRef: order.advancePaymentRef,
        balancePaymentRef: order.balancePaymentRef,
        advanceAmount: order.advanceAmount.amount,
        balanceAmount: order.balanceAmount.amount,
        updatedAt: order.updatedAt
      }
    });
  }

  public async countByTailorId(tailorId: string): Promise<{ newRequests: number; inProgress: number; readyForDelivery: number }> {
    const [newRequests, inProgress, readyForDelivery] = await Promise.all([
      this.prisma.order.count({
        where: {
          tailorId,
          orderStatus: { in: [OrderStatus.DEVIS_A_ACCEPTER, OrderStatus.EN_ATTENTE_COUTURIER] }
        }
      }),
      this.prisma.order.count({
        where: {
          tailorId,
          orderStatus: OrderStatus.EN_CONFECTION
        }
      }),
      this.prisma.order.count({
        where: {
          tailorId,
          orderStatus: OrderStatus.PRETE
        }
      })
    ]);

    return { newRequests, inProgress, readyForDelivery };
  }
}
