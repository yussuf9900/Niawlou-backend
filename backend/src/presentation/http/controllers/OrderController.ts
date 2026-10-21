import { Request, Response, NextFunction } from 'express';
import { PrismaOrderRepository } from '../../../infrastructure/database/PrismaOrderRepository.js';
import { PrismaTailorRepository } from '../../../infrastructure/database/PrismaTailorRepository.js';
import { ConsoleNotificationService } from '../../../infrastructure/notifications/ConsoleNotificationService.js';
import { CreateOrderUseCase } from '../../../core/use-cases/orders/CreateOrderUseCase.js';
import { AcceptQuotationUseCase } from '../../../core/use-cases/orders/AcceptQuotationUseCase.js';
import { UpdateConfectionStepUseCase } from '../../../core/use-cases/orders/UpdateConfectionStepUseCase.js';
import { ConfirmDeliveryUseCase } from '../../../core/use-cases/orders/ConfirmDeliveryUseCase.js';
import { OpenDisputeUseCase } from '../../../core/use-cases/orders/OpenDisputeUseCase.js';
import { ValidateOrderAndIssueQuotationUseCase } from '../../../core/use-cases/orders/ValidateOrderAndIssueQuotationUseCase.js';
import { ProposeDelayUseCase } from '../../../core/use-cases/orders/ProposeDelayUseCase.js';
import { RespondToDelayUseCase } from '../../../core/use-cases/orders/RespondToDelayUseCase.js';
import { ConfectionStep } from '../../../core/domain/value-objects/Statuses.js';

const orderRepo = new PrismaOrderRepository();
const tailorRepo = new PrismaTailorRepository();
const notifier = new ConsoleNotificationService();

const createOrderUseCase = new CreateOrderUseCase(orderRepo, tailorRepo, notifier);
const validateOrderUseCase = new ValidateOrderAndIssueQuotationUseCase(orderRepo, notifier);
const acceptQuotationUseCase = new AcceptQuotationUseCase(orderRepo, notifier);
const updateConfectionStepUseCase = new UpdateConfectionStepUseCase(orderRepo, notifier);
const proposeDelayUseCase = new ProposeDelayUseCase(orderRepo, notifier);
const respondToDelayUseCase = new RespondToDelayUseCase(orderRepo, notifier);
const confirmDeliveryUseCase = new ConfirmDeliveryUseCase(orderRepo, notifier);
const openDisputeUseCase = new OpenDisputeUseCase(orderRepo, notifier);

export class OrderController {
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const order = await createOrderUseCase.execute({
        clientId: req.user.userId,
        tailorId: req.body.tailorId,
        modelId: req.body.modelId,
        title: req.body.title,
        description: req.body.description,
        clothingPrice: Number(req.body.clothingPrice),
        deliveryMode: req.body.deliveryMode,
        deliveryAddress: req.body.deliveryAddress,
        deliveryFee: req.body.deliveryFee ? Number(req.body.deliveryFee) : undefined,
        measurements: req.body.measurements,
        targetDeliveryDate: req.body.targetDeliveryDate
      });

      res.status(201).json({
        message: 'Commande initiée avec succès',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const filter: Record<string, unknown> = {};
      if (req.user.role === 'CLIENT') {
        filter.clientId = req.user.userId;
      } else if (req.user.role === 'COUTURIER') {
        filter.tailorId = req.user.userId;
      }

      if (req.query.status) {
        filter.status = req.query.status as string;
      }

      const result = await orderRepo.findMany(filter);
      res.status(200).json({
        orders: result.orders.map((o) => o.toJSON()),
        total: result.total
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await orderRepo.findById(id);
      if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Commande introuvable.' } });
        return;
      }

      res.status(200).json({ order: order.toJSON() });
    } catch (err) {
      next(err);
    }
  }

  public static async validateAndIssueQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'COUTURIER') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Seul le couturier peut valider cette commande et émettre le devis.' } });
        return;
      }

      const order = await validateOrderUseCase.execute({
        orderId: req.params.id,
        tailorId: req.user.userId,
        confirmedClothingPrice: req.body.confirmedClothingPrice ? Number(req.body.confirmedClothingPrice) : undefined,
        advanceAmount: req.body.advanceAmount ? Number(req.body.advanceAmount) : undefined,
        targetDeliveryDate: req.body.targetDeliveryDate,
        notes: req.body.notes
      });

      res.status(200).json({
        message: 'Commande validée par l\'atelier. Devis émis et transmis au client.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async acceptQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const order = await acceptQuotationUseCase.execute({
        orderId: req.params.id,
        clientId: req.user.userId,
        customAdvanceAmount: req.body.customAdvanceAmount ? Number(req.body.customAdvanceAmount) : undefined
      });

      res.status(200).json({
        message: 'Devis accepté. Vous pouvez maintenant procéder au règlement de l\'acompte via Orange Money.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async proposeDelay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'COUTURIER') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Seul le couturier peut proposer un report de délai.' } });
        return;
      }

      const order = await proposeDelayUseCase.execute({
        orderId: req.params.id,
        tailorId: req.user.userId,
        newDate: req.body.newDate,
        reason: req.body.reason
      });

      res.status(200).json({
        message: 'Proposition de report envoyée au client.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async respondToDelay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const order = await respondToDelayUseCase.execute({
        orderId: req.params.id,
        clientId: req.user.userId,
        accepted: Boolean(req.body.accepted)
      });

      res.status(200).json({
        message: req.body.accepted ? 'Report accepté avec succès.' : 'Report refusé par le client.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'COUTURIER') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Seul le couturier peut faire évoluer les étapes.' } });
        return;
      }

      const order = await updateConfectionStepUseCase.execute({
        orderId: req.params.id,
        tailorId: req.user.userId,
        step: req.body.step as ConfectionStep
      });

      res.status(200).json({
        message: 'Étape de confection mise à jour avec succès',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async confirmDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const order = await confirmDeliveryUseCase.execute({
        orderId: req.params.id,
        userId: req.user.userId
      });

      res.status(200).json({
        message: 'Remise physique du vêtement enregistrée. Le solde est maintenant dû.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async openDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const order = await openDisputeUseCase.execute({
        orderId: req.params.id,
        userId: req.user.userId,
        reason: req.body.reason
      });

      res.status(200).json({
        message: 'Signalement enregistré sous 48h. L\'atelier et l\'administration ont été notifiés pour retouche sans frais.',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }
}
