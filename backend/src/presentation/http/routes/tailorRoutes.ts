import { Router } from 'express';
import { TailorController } from '../controllers/TailorController.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { z } from 'zod';

const router = Router();

const createModelSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  category: z.enum(['FEMME', 'HOMME', 'CEREMONIE', 'BOUBOU', 'ENFANT']),
  price: z.number().positive(),
  fabricOption: z.enum(['PROVIDED_BY_CLIENT', 'PROVIDED_BY_TAILOR', 'CHOICE_AT_ATELIER']).optional(),
  images: z.array(z.string()).min(1)
});

/**
 * @openapi
 * /tailors:
 *   get:
 *     summary: Recherche et liste géolocalisée des ateliers couturiers
 *     tags: [Ateliers & Modèles]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: "Filtrer par quartier/ville (ex: Sacré-Cœur, Dakar)"
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *         description: "Filtrer par spécialité (ex: Bazin, Broderie)"
 *     responses:
 *       200:
 *         description: Liste des ateliers avec notes et coordonnées
 */
router.get('/', TailorController.searchTailors);

/**
 * @openapi
 * /tailors/dashboard:
 *   get:
 *     summary: Tableau de bord atelier (KPIs confections, nouvelles demandes, remises)
 *     tags: [Atelier & Confection]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KPIs et file d'actions prioritaires
 */
router.get('/dashboard', authMiddleware, requireRole('COUTURIER'), TailorController.getAtelierDashboard);

/**
 * @openapi
 * /tailors/models:
 *   get:
 *     summary: Parcourir le catalogue des créations et modèles d'inspiration
 *     tags: [Ateliers & Modèles]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [TOUT, FEMME, HOMME, CEREMONIE, BOUBOU, ENFANT] }
 *       - in: query
 *         name: tailorId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Catalogue des modèles avec photos et tarifs indicatifs
 */
router.get('/models', TailorController.getModels);

/**
 * @openapi
 * /tailors/models:
 *   post:
 *     summary: Publier un nouveau modèle dans son catalogue (Espace Couturier)
 *     tags: [Atelier & Confection]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, price, images]
 *             properties:
 *               title: { type: string, example: 'Robe Nala en bazin' }
 *               description: { type: string, example: 'Bazin riche terracotta avec broderies dorées' }
 *               category: { type: string, enum: [FEMME, HOMME, CEREMONIE, BOUBOU, ENFANT], example: 'CEREMONIE' }
 *               price: { type: integer, example: 35000 }
 *               fabricOption: { type: string, enum: [PROVIDED_BY_CLIENT, PROVIDED_BY_TAILOR, CHOICE_AT_ATELIER], example: 'PROVIDED_BY_TAILOR' }
 *               images: { type: array, items: { type: string }, example: ['https://example.com/photo1.jpg'] }
 *     responses:
 *       201:
 *         description: Modèle publié avec succès
 */
router.post('/models', authMiddleware, requireRole('COUTURIER'), validateBody(createModelSchema), TailorController.createModel);

/**
 * @openapi
 * /tailors/models/{id}:
 *   get:
 *     summary: Fiche détaillée d'un modèle de tenue
 *     tags: [Ateliers & Modèles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détail du modèle
 */
router.get('/models/:id', TailorController.getModelById);

/**
 * @openapi
 * /tailors/{id}:
 *   get:
 *     summary: Consulter la fiche complète d'un atelier couturier
 *     tags: [Ateliers & Modèles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Profil atelier, notation et modèles réalisés
 */
router.get('/:id', TailorController.getTailorById);

export default router;
