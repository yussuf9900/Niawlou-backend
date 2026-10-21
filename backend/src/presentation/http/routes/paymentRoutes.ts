import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { z } from 'zod';

const router = Router();

const initPaymentSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(['ADVANCE', 'BALANCE'])
});

const webhookSchema = z.object({
  transactionReference: z.string().min(5)
});

/**
 * @openapi
 * /payments/init:
 *   post:
 *     summary: Initialiser un paiement Orange Money (Acompte ou Solde)
 *     tags: [Paiements Orange Money]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, type]
 *             properties:
 *               orderId: { type: string, format: uuid }
 *               type: { type: string, enum: [ADVANCE, BALANCE], example: 'ADVANCE' }
 *     responses:
 *       200:
 *         description: Paiement initialisé avec lien de redirection et token Orange Money
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   type: object
 *                   properties:
 *                     paymentToken: { type: string, example: 'OM-TOKEN-ABC123XYZ' }
 *                     paymentUrl: { type: string, example: 'https://api.orange.sn/om/pay?token=...' }
 *                     qrCodeUrl: { type: string, example: 'https://api.qrserver.com/...' }
 *                     transactionReference: { type: string, example: 'OM-NIA-0248-ADV-1234' }
 */
router.post('/init', authMiddleware, validateBody(initPaymentSchema), PaymentController.initPayment);

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Callback / Webhook de notification sécurisée Orange Money
 *     tags: [Paiements Orange Money]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionReference]
 *             properties:
 *               transactionReference: { type: string, example: 'OM-NIA-0248-ADV-1234' }
 *     responses:
 *       200:
 *         description: Notification reçue et validée, état de la commande mis à jour
 */
router.post('/webhook', validateBody(webhookSchema), PaymentController.handleWebhook);

/**
 * @openapi
 * /payments/simulate:
 *   post:
 *     summary: Simuler la validation instantanée par Orange Money (Idéal pour Pitch / Démo Jury)
 *     tags: [Paiements Orange Money]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionReference]
 *             properties:
 *               transactionReference: { type: string, example: 'OM-NIA-0248-ADV-1234' }
 *     responses:
 *       200:
 *         description: Simulation réussie, virement d'acompte ou de solde validé
 */
router.post('/simulate', validateBody(webhookSchema), PaymentController.simulatePayment);

/**
 * @openapi
 * /payments/{orderId}/receipt:
 *   get:
 *     summary: Obtenir le reçu de paiement numérique certifié Orange Money / NIAWLOU
 *     tags: [Paiements Orange Money]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reçu horodaté avec détails de transaction et sceau de sécurité
 */
router.get('/:orderId/receipt', PaymentController.getReceipt);

export default router;
