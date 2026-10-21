import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { z } from 'zod';

const router = Router();

const createOrderSchema = z.object({
  tailorId: z.string().uuid(),
  modelId: z.string().uuid().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  clothingPrice: z.number().positive(),
  deliveryMode: z.enum(['ATELIER', 'DOMICILE']),
  deliveryAddress: z.string().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  measurements: z.object({
    tourPoitrine: z.number().optional(),
    tourTaille: z.number().optional(),
    tourBassin: z.number().optional(),
    longueurTotale: z.number().optional(),
    carrureEpaule: z.number().optional(),
    longueurManche: z.number().optional(),
    tourCou: z.number().optional(),
    notesParticulieres: z.string().optional()
  }),
  targetDeliveryDate: z.string().optional()
});

const updateStepSchema = z.object({
  step: z.enum(['NON_COMMENCEE', 'COUPE_ASSEMBLAGE', 'FINITIONS_CONTROLE', 'VETEMENT_PRET'])
});

const validateQuotationSchema = z.object({
  confirmedClothingPrice: z.number().positive().optional(),
  advanceAmount: z.number().positive().optional(),
  targetDeliveryDate: z.string().optional(),
  notes: z.string().optional()
});

const proposeDelaySchema = z.object({
  newDate: z.string().min(5),
  reason: z.string().min(5, 'Le motif du report doit être précisé')
});

const respondDelaySchema = z.object({
  accepted: z.boolean()
});

const disputeSchema = z.object({
  reason: z.string().min(5, 'Le motif du litige ou de la retouche doit être précisé')
});

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Créer une commande de couture (modèle catalogue ou demande personnalisée)
 *     tags: [Commandes & Devis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tailorId, title, clothingPrice, deliveryMode, measurements]
 *             properties:
 *               tailorId: { type: string, format: uuid }
 *               modelId: { type: string, format: uuid }
 *               title: { type: string, example: 'Robe Nala en bazin' }
 *               clothingPrice: { type: integer, example: 35000 }
 *               deliveryMode: { type: string, enum: [ATELIER, DOMICILE], example: 'DOMICILE' }
 *               deliveryAddress: { type: string, example: 'Sacré-Cœur 3, Dakar' }
 *               measurements:
 *                 $ref: '#/components/schemas/Measurements'
 *     responses:
 *       201:
 *         description: Commande initiée avec statut DEVIS_A_ACCEPTER
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order: { $ref: '#/components/schemas/Order' }
 */
router.post('/', authMiddleware, validateBody(createOrderSchema), OrderController.createOrder);

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Récupérer la liste des commandes de l'utilisateur connecté
 *     tags: [Commandes & Devis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filtrer par statut (ex: EN_CONFECTION, PRETE, TERMINEE)
 *     responses:
 *       200:
 *         description: Liste des commandes
 */
router.get('/', authMiddleware, OrderController.listOrders);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Détail complet d'une commande (prix, acompte, solde, mesures figées, statuts)
 *     tags: [Commandes & Devis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détail de la commande
 */
router.get('/:id', authMiddleware, OrderController.getOrderById);

/**
 * @openapi
 * /orders/{id}/quotation/validate:
 *   post:
 *     summary: Valider la commande et émettre le devis définitif (Atelier Couturier)
 *     description: Le couturier confirme la faisabilité, ajuste éventuellement le prix et la date de livraison promise.
 *     tags: [Atelier & Confection]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirmedClothingPrice: { type: integer, example: 35000, description: 'Prix convenu façon et tissu' }
 *               advanceAmount: { type: integer, example: 15000, description: 'Montant de l\'acompte requis' }
 *               targetDeliveryDate: { type: string, format: date-time, example: '2026-11-06T18:00:00Z' }
 *               notes: { type: string, example: 'Mesures validées, bazin terracotta sélectionné.' }
 *     responses:
 *       200:
 *         description: Commande validée par l'atelier, devis prêt pour acceptation client
 */
router.post('/:id/quotation/validate', authMiddleware, requireRole('COUTURIER'), validateBody(validateQuotationSchema), OrderController.validateAndIssueQuotation);

/**
 * @openapi
 * /orders/{id}/quotation/accept:
 *   post:
 *     summary: Accepter le devis et engager la commande (Client)
 *     tags: [Commandes & Devis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customAdvanceAmount: { type: integer, example: 15000, description: 'Montant de l\'acompte si ajusté' }
 *     responses:
 *       200:
 *         description: Devis accepté, prêt pour paiement Orange Money
 */
router.post('/:id/quotation/accept', authMiddleware, OrderController.acceptQuotation);

/**
 * @openapi
 * /orders/{id}/step:
 *   patch:
 *     summary: Mettre à jour l'avancement de confection (Atelier Couturier)
 *     tags: [Atelier & Confection]
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
 *             required: [step]
 *             properties:
 *               step: { type: string, enum: [COUPE_ASSEMBLAGE, FINITIONS_CONTROLE, VETEMENT_PRET], example: 'FINITIONS_CONTROLE' }
 *     responses:
 *       200:
 *         description: Étape de confection mise à jour
 */
router.patch('/:id/step', authMiddleware, requireRole('COUTURIER'), validateBody(updateStepSchema), OrderController.updateStep);

/**
 * @openapi
 * /orders/{id}/delay/propose:
 *   post:
 *     summary: Proposer un report de date avec motif en cas de retard (Atelier Couturier)
 *     description: Soumis au consentement du client sans délai obligatoire imposé (CDC Section 7).
 *     tags: [Atelier & Confection]
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
 *             required: [newDate, reason]
 *             properties:
 *               newDate: { type: string, format: date-time, example: '2026-11-10T18:00:00Z' }
 *               reason: { type: string, example: 'Attente réapprovisionnement fil doré de broderie' }
 *     responses:
 *       200:
 *         description: Proposition de report transmise au client
 */
router.post('/:id/delay/propose', authMiddleware, requireRole('COUTURIER'), validateBody(proposeDelaySchema), OrderController.proposeDelay);

/**
 * @openapi
 * /orders/{id}/delay/respond:
 *   post:
 *     summary: Répondre à une proposition de report (Client)
 *     tags: [Commandes & Devis]
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
 *             required: [accepted]
 *             properties:
 *               accepted: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Réponse enregistrée
 */
router.post('/:id/delay/respond', authMiddleware, validateBody(respondDelaySchema), OrderController.respondToDelay);

/**
 * @openapi
 * /orders/{id}/delivery/confirm:
 *   post:
 *     summary: Confirmer la remise physique du vêtement (Atelier ou Domicile)
 *     tags: [Commandes & Devis]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Remise enregistrée, solde en attente de paiement
 */
router.post('/:id/delivery/confirm', authMiddleware, OrderController.confirmDelivery);

/**
 * @openapi
 * /orders/{id}/disputes:
 *   post:
 *     summary: Ouvrir une réclamation ou demander une retouche sous 48h
 *     tags: [Litiges & Retouches]
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: 'Ourlet trop court de 3cm sur le bas de robe' }
 *     responses:
 *       200:
 *         description: Réclamation enregistrée
 */
router.post('/:id/disputes', authMiddleware, validateBody(disputeSchema), OrderController.openDispute);

export default router;
