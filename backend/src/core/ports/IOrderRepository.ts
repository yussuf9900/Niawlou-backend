import { Order } from '../domain/entities/Order.js';

export interface OrderFilter {
  clientId?: string;
  tailorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByReference(reference: string): Promise<Order | null>;
  findMany(filter: OrderFilter): Promise<{ orders: Order[]; total: number }>;
  save(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  countByTailorId(tailorId: string): Promise<{ newRequests: number; inProgress: number; readyForDelivery: number }>;
}
