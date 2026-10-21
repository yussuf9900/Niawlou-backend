import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../../../infrastructure/database/PrismaClientSingleton.js';

const prisma = getPrismaClient();

export class AdminController {
  /**
   * Statistiques globales de la plateforme (Supervision CDC Section 2.2)
   */
  public static async getGlobalStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalClients,
        totalTailors,
        totalOrders,
        activeConfections,
        completedOrders,
        totalDisputes,
        financialVolume
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'CLIENT' } }),
        prisma.tailorProfile.count(),
        prisma.order.count(),
        prisma.order.count({ where: { orderStatus: 'EN_CONFECTION' } }),
        prisma.order.count({ where: { orderStatus: 'TERMINEE' } }),
        prisma.dispute.count({ where: { status: 'OUVERT' } }),
        prisma.paymentTransaction.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true }
        })
      ]);

      res.status(200).json({
        platform: 'NIAWLOU Super-App Max It',
        kpis: {
          totalClients,
          totalTailors,
          totalOrders,
          activeConfections,
          completedOrders,
          openDisputes: totalDisputes,
          totalOrangeMoneyVolume: `${financialVolume._sum.amount || 0} FCFA`
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste des litiges en cours pour arbitrage administratif
   */
  public static async listDisputes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disputes = await prisma.dispute.findMany({
        include: {
          order: {
            include: {
              client: { select: { id: true, name: true, phone: true } },
              tailor: { select: { id: true, name: true, phone: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ disputes, total: disputes.length });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Arbitrage et consignation de décision sur un litige (CDC Section 10)
   */
  public static async resolveDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, status } = req.body;

      const dispute = await prisma.dispute.findUnique({ where: { id } });
      if (!dispute) {
        res.status(404).json({ error: { code: 'DISPUTE_NOT_FOUND', message: 'Dossier de litige introuvable.' } });
        return;
      }

      const updated = await prisma.dispute.update({
        where: { id },
        data: {
          resolution,
          status: status || 'RESOLU',
          resolvedAt: new Date()
        }
      });

      res.status(200).json({
        message: 'Décision administrative enregistrée avec succès.',
        dispute: updated
      });
    } catch (err) {
      next(err);
    }
  }
}
