import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './presentation/swagger/swaggerConfig.js';
import authRoutes from './presentation/http/routes/authRoutes.js';
import tailorRoutes from './presentation/http/routes/tailorRoutes.js';
import orderRoutes from './presentation/http/routes/orderRoutes.js';
import paymentRoutes from './presentation/http/routes/paymentRoutes.js';
import adminRoutes from './presentation/http/routes/adminRoutes.js';
import { errorHandler } from './presentation/http/middlewares/errorHandler.js';

export function createApp(): express.Application {
  const app = express();

  // Middlewares globaux
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Documentation interactive Swagger / OpenAPI 3.0
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'NIAWLOU API — Documentation Swagger',
      customCss: `
        .swagger-ui .topbar { background-color: #FF7900; }
        .swagger-ui .topbar .topbar-wrapper img { content: url('https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg'); width: 40px; }
      `
    })
  );

  // Exposition du fichier JSON OpenAPI brut
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Page d'accueil racine / Healthcheck
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'NIAWLOU Backend API',
      version: '1.0.0',
      description: 'API Clean Architecture pour la mini-app Max It (Challenge ODC)',
      documentation: '/api/docs',
      status: 'HEALTHY',
      timestamp: new Date().toISOString()
    });
  });

  // Enregistrement des routes préfixées (/api/v1)
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/tailors`, tailorRoutes);
  app.use(`${apiPrefix}/orders`, orderRoutes);
  app.use(`${apiPrefix}/payments`, paymentRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);

  // Gestionnaire d'erreurs centralisé
  app.use(errorHandler);

  return app;
}
