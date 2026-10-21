import { Request, Response, NextFunction } from 'express';
import { PrismaTailorRepository } from '../../../infrastructure/database/PrismaTailorRepository.js';
import { PrismaOrderRepository } from '../../../infrastructure/database/PrismaOrderRepository.js';

const tailorRepo = new PrismaTailorRepository();
const orderRepo = new PrismaOrderRepository();

export class TailorController {
  public static async searchTailors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { location, specialty, limit } = req.query;
      const tailors = await tailorRepo.searchTailors({
        location: location as string,
        specialty: specialty as string,
        limit: limit ? Number(limit) : 20
      });

      res.status(200).json({ tailors, total: tailors.length });
    } catch (err) {
      next(err);
    }
  }

  public static async getTailorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tailor = await tailorRepo.findTailorById(id);
      if (!tailor) {
        res.status(404).json({ error: { code: 'TAILOR_NOT_FOUND', message: 'Atelier couturier introuvable.' } });
        return;
      }

      const models = await tailorRepo.findModels({ tailorId: tailor.id });
      res.status(200).json({ tailor, models });
    } catch (err) {
      next(err);
    }
  }

  public static async getModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, tailorId, limit } = req.query;
      const models = await tailorRepo.findModels({
        category: category as string,
        tailorId: tailorId as string,
        limit: limit ? Number(limit) : 30
      });

      res.status(200).json({ models, total: models.length });
    } catch (err) {
      next(err);
    }
  }

  public static async getModelById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const model = await tailorRepo.findModelById(id);
      if (!model) {
        res.status(404).json({ error: { code: 'MODEL_NOT_FOUND', message: 'Modèle introuvable.' } });
        return;
      }

      res.status(200).json({ model });
    } catch (err) {
      next(err);
    }
  }

  public static async createModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'COUTURIER') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Seul un couturier peut publier un modèle.' } });
        return;
      }

      const tailor = await tailorRepo.findTailorByUserId(req.user.userId);
      if (!tailor) {
        res.status(404).json({ error: { code: 'TAILOR_PROFILE_NOT_FOUND', message: 'Profil atelier introuvable.' } });
        return;
      }

      const newModel = await tailorRepo.createModel({
        tailorId: tailor.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        price: Number(req.body.price),
        fabricOption: req.body.fabricOption || 'CHOICE_AT_ATELIER',
        images: req.body.images || [],
        isActive: true
      });

      res.status(201).json({ message: 'Modèle publié avec succès', model: newModel });
    } catch (err) {
      next(err);
    }
  }

  public static async getAtelierDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'COUTURIER') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux couturiers.' } });
        return;
      }

      const tailor = await tailorRepo.findTailorByUserId(req.user.userId);
      if (!tailor) {
        res.status(404).json({ error: { code: 'TAILOR_NOT_FOUND', message: 'Profil atelier introuvable.' } });
        return;
      }

      const counts = await orderRepo.countByTailorId(req.user.userId);
      const recentOrders = await orderRepo.findMany({ tailorId: req.user.userId, limit: 5 });

      res.status(200).json({
        atelier: tailor,
        kpis: {
          newRequests: counts.newRequests,
          inProgress: counts.inProgress,
          readyForDelivery: counts.readyForDelivery
        },
        priorityQueue: recentOrders.orders.map((o) => o.toJSON())
      });
    } catch (err) {
      next(err);
    }
  }
}
