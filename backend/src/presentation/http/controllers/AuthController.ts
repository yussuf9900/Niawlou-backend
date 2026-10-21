import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaUserRepository } from '../../../infrastructure/database/PrismaUserRepository.js';
import crypto from 'crypto';

const userRepo = new PrismaUserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'niawlou_super_secret_jwt_token_key_change_in_production_2026';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone, email, password, role } = req.body;
      const existing = await userRepo.findByPhone(phone);
      if (existing) {
        res.status(409).json({
          error: { code: 'PHONE_ALREADY_USED', message: 'Ce numéro de téléphone est déjà associé à un compte.' }
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepo.create({
        id: crypto.randomUUID(),
        name,
        phone,
        email,
        passwordHash,
        role: role || 'CLIENT'
      });

      const token = jwt.sign(
        { userId: user.id, role: user.role, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Compte créé avec succès',
        token,
        user
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, password } = req.body;
      const user = await userRepo.findByPhone(phone);
      if (!user) {
        res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Numéro de téléphone ou mot de passe incorrect.' }
        });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Numéro de téléphone ou mot de passe incorrect.' }
        });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, phone: user.phone },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { passwordHash: _, ...safeUser } = user;
      res.status(200).json({
        message: 'Connexion réussie',
        token,
        user: safeUser
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      const user = await userRepo.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } });
        return;
      }

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMeasurements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } });
        return;
      }

      await userRepo.updateMeasurements(req.user.userId, req.body);
      res.status(200).json({
        message: 'Carnet de mesures mis à jour avec succès',
        measurements: req.body
      });
    } catch (err) {
      next(err);
    }
  }
}
