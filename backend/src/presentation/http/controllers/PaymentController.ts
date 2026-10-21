import { Request, Response, NextFunction } from 'express';
import { PrismaOrderRepository } from '../../../infrastructure/database/PrismaOrderRepository.js';
import { PrismaUserRepository } from '../../../infrastructure/database/PrismaUserRepository.js';
import { OrangeMoneyGatewayAdapter } from '../../../infrastructure/payments/OrangeMoneyGatewayAdapter.js';
import { ConsoleNotificationService } from '../../../infrastructure/notifications/ConsoleNotificationService.js';
import { InitOrangeMoneyPaymentUseCase } from '../../../core/use-cases/payments/InitOrangeMoneyPaymentUseCase.js';
import { ProcessOrangeMoneyCallbackUseCase } from '../../../core/use-cases/payments/ProcessOrangeMoneyCallbackUseCase.js';
import { getPrismaClient } from '../../../infrastructure/database/PrismaClientSingleton.js';

const orderRepo = new PrismaOrderRepository();
const userRepo = new PrismaUserRepository();
const paymentGateway = new OrangeMoneyGatewayAdapter();
const notifier = new ConsoleNotificationService();
const prisma = getPrismaClient();

const initPaymentUseCase = new InitOrangeMoneyPaymentUseCase(orderRepo, userRepo, paymentGateway);
const processCallbackUseCase = new ProcessOrangeMoneyCallbackUseCase(orderRepo, paymentGateway, notifier);

export class PaymentController {
  public static async initPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const result = await initPaymentUseCase.execute({
        orderId: req.body.orderId,
        userId: req.user.userId,
        type: req.body.type
      });

      res.status(200).json({
        message: 'Transaction Orange Money initialisée',
        payment: result
      });
    } catch (err) {
      next(err);
    }
  }

  public static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionReference } = req.body;
      if (!transactionReference) {
        res.status(400).json({ error: { code: 'MISSING_TRANSACTION_REF', message: 'Référence de transaction manquante.' } });
        return;
      }

      const order = await processCallbackUseCase.execute({ transactionReference });

      res.status(200).json({
        message: 'Notification Orange Money traitée avec succès',
        orderReference: order.orderReference,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Endpoint de démo / hackathon pour simuler le retour positif d'Orange Money
   */
  public static async simulatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionReference } = req.body;
      if (!transactionReference) {
        res.status(400).json({ error: { code: 'MISSING_REF', message: 'transactionReference requise' } });
        return;
      }

      await paymentGateway.simulateSuccess(transactionReference);
      const order = await processCallbackUseCase.execute({ transactionReference });

      res.status(200).json({
        message: 'Simulation Orange Money confirmée avec succès !',
        order: order.toJSON()
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const order = await orderRepo.findById(orderId);
      if (!order) {
        res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Commande introuvable' } });
        return;
      }

      const [client, tailor, transactions] = await Promise.all([
        userRepo.findById(order.clientId),
        userRepo.findById(order.tailorId),
        prisma.paymentTransaction.findMany({ where: { orderId: order.id } })
      ]);

      const receipt = {
        receiptNumber: `REC-${order.orderReference}-${Date.now().toString().slice(-4)}`,
        orderReference: order.orderReference,
        issuedAt: new Date().toISOString(),
        client: {
          name: client?.name || 'Client Max It',
          phone: client?.phone || ''
        },
        atelier: {
          name: tailor?.name || 'Maison Aïssatou',
          phone: tailor?.phone || ''
        },
        item: {
          title: order.title,
          clothingPrice: order.clothingPrice.format(),
          deliveryFee: order.deliveryFee.format(),
          deliveryMode: order.deliveryMode,
          totalAmount: order.totalAmount.format()
        },
        paymentsBreakdown: {
          advanceAmount: order.advanceAmount.format(),
          advanceRef: order.advancePaymentRef || 'Non réglé',
          balanceAmount: order.balanceAmount.format(),
          balanceRef: order.balancePaymentRef || 'Non réglé',
          status: order.paymentStatus
        },
        transactions: transactions.map((t) => ({
          ref: t.transactionRef,
          type: t.type,
          amount: `${t.amount} FCFA`,
          status: t.status,
          date: t.confirmedAt ? t.confirmedAt.toISOString() : t.createdAt.toISOString()
        })),
        securitySeal: {
          provider: 'Orange Money Sonatel SN',
          signature: 'VERIFIED_OM_MAXIT_PAYMENT'
        }
      };

      res.status(200).json({ receipt });
    } catch (err) {
      next(err);
    }
  }
}
