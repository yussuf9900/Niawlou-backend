import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  userId: string;
  role: 'CLIENT' | 'COUTURIER' | 'ADMIN';
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token d\'authentification manquant ou invalide.'
      }
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'niawlou_super_secret_jwt_token_key_change_in_production_2026';

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: 'Le token de session a expiré ou n\'est pas valide.'
      }
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Accès restreint aux profils autorisés.'
        }
      });
      return;
    }
    next();
  };
}
