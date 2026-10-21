import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validateDto.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  phone: z.string().min(9, 'Numéro de téléphone sénégalais invalide (ex: +221771234567)'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  role: z.enum(['CLIENT', 'COUTURIER', 'ADMIN']).optional()
});

const loginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1)
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur (Client ou Couturier)
 *     tags: [Auth & Profil]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, email, password]
 *             properties:
 *               name: { type: string, example: 'Awa Diop' }
 *               phone: { type: string, example: '+221771234542' }
 *               email: { type: string, example: 'awa.diop@example.sn' }
 *               password: { type: string, example: 'passer123' }
 *               role: { type: string, enum: ['CLIENT', 'COUTURIER'], example: 'CLIENT' }
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès et jeton JWT retourné
 *       409:
 *         description: Numéro de téléphone déjà utilisé
 */
router.post('/register', validateBody(registerSchema), AuthController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur via téléphone et mot de passe
 *     tags: [Auth & Profil]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone: { type: string, example: '+221771234542' }
 *               password: { type: string, example: 'passer123' }
 *     responses:
 *       200:
 *         description: Connexion réussie avec token JWT
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', validateBody(loginSchema), AuthController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Récupération du profil et du carnet de mesures de l'utilisateur connecté
 *     tags: [Auth & Profil]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Détails du profil et mesures
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authMiddleware, AuthController.getMe);

/**
 * @openapi
 * /auth/measurements:
 *   put:
 *     summary: Mise à jour du carnet de mesures personnel
 *     tags: [Auth & Profil]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Measurements'
 *     responses:
 *       200:
 *         description: Mesures mises à jour avec succès
 */
router.put('/measurements', authMiddleware, AuthController.updateMeasurements);

export default router;
