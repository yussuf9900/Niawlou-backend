import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVEUR NIAWLOU ACTIF SUR LE PORT : ${PORT}`);
  console.log(`📖 DOCUMENTATION SWAGGER INTERACTIVE : http://localhost:${PORT}/api/docs`);
  console.log(`🌐 SPÉCIFICATION OPENAPI JSON        : http://localhost:${PORT}/api/docs.json`);
  console.log(`======================================================\n`);
});

process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu. Fermeture gracieuse du serveur...');
  server.close(() => {
    console.log('Serveur arrêté.');
    process.exit(0);
  });
});
