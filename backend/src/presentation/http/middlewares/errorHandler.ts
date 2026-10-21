import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../../core/domain/errors/DomainErrors.js';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erreurs du domaine métier
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Erreurs de validation Zod (DTO)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Les données fournies dans la requête sont invalides.',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message
        })),
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Erreurs inattendues
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur inattendue est survenue sur le serveur.',
      timestamp: new Date().toISOString()
    }
  });
}
