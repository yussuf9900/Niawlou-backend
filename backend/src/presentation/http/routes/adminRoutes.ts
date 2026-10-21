import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { z } from 'zod';

const router = Router();

const resolveDisputeSchema = z.object({
  resolution: z.string().min(5, 'La décision administrative doit être motivée et explicite'),
  status: z.enum(['RESOLU', 'CLOTURE']).optional()
});

// Toutes les routes admin sont protégées par authMiddleware et requireRole('ADMIN')
router.use(authMiddleware, requireRole('ADMIN'));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Tableau de bord administratif global (KPIs plateforme, volume OM, litiges)
 *     tags: [Supervision & Administration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques d'activité et volumes financiers
 *       403:
 *         description: Accès refusé (rôle ADMIN requis)
 */
router.get('/stats', AdminController.getGlobalStats);

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     summary: Liste des dossiers de litiges et demandes de retouches pour examen
 *     tags: [Supervision & Administration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste complète des réclamations
 */
router.get('/disputes', AdminController.listDisputes);

/**
 * @openapi
 * /admin/disputes/{id}/resolve:
 *   patch:
 *     summary: Consigner la décision administrative sur un litige
 *     tags: [Supervision & Administration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resolution]
 *             properties:
 *               resolution: { type: string, example: 'Retouche gratuite accordée sous 48h par l atelier Maison Aïssatou' }
 *               status: { type: string, enum: [RESOLU, CLOTURE], example: 'RESOLU' }
 *     responses:
 *       200:
 *         description: Décision enregistrée et historisée
 */
router.patch('/disputes/:id/resolve', validateBody(resolveDisputeSchema), AdminController.resolveDispute);

export default router;
