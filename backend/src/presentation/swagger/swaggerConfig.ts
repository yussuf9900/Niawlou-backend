import swaggerJsdoc from 'swagger-jsdoc';
import path from 'node:path';

const options: swaggerJsdoc.Options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NIAWLOU API — Mini-App Max It Orange (Challenge ODC)',
      version: '1.0.0',
      description: `
### Plateforme de couture sur-mesure intégrée à Max It (Sonatel)
Cette API REST fournit l'ensemble des services pour la mini-application **NIAWLOU** :
- **Découverte & Modèles** : Ateliers locaux dakarois, catalogue de tenues traditionnelles et modernes (Bazin, Boubou, Cérémonie).
- **Mesures & Commandes** : Carnet de mesures numérique universel et instantané immuable de confection.
- **Paiements Fractionnés Orange Money** : Acompte vérifié (lancement de coupe) et solde final (à la remise du vêtement).
- **Suivi d'Atelier en Temps Réel** : Stepper de progression (Coupe, Assemblage, Finitions, Prêt).
- **Garantie Sérénité** : Signalement des défauts sous 48h avec retouches incluses.

*Architecture logicielle : Clean Architecture (Hexagonale), Principes SOLID, Domain-Driven Design.*
      `,
      contact: {
        name: 'Équipe Projet NIAWLOU',
        email: 'youssuf9900@gmail.com'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Serveur Actif (Détection automatique)'
      },
      {
        url: 'https://niawlou-backend.onrender.com/api/v1',
        description: 'Serveur de Production (Render)'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Serveur de Développement Local'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authentification par jeton JWT. Entrez votre jeton sous le format: Bearer <votre_token>'
        }
      },
      schemas: {
        Money: {
          type: 'object',
          properties: {
            amount: { type: 'integer', example: 35000, description: 'Montant en FCFA' },
            currency: { type: 'string', example: 'FCFA' }
          }
        },
        Measurements: {
          type: 'object',
          properties: {
            tourPoitrine: { type: 'number', example: 92, description: 'Tour de poitrine en cm' },
            tourTaille: { type: 'number', example: 74, description: 'Tour de taille en cm' },
            tourBassin: { type: 'number', example: 102, description: 'Tour de bassin en cm' },
            longueurTotale: { type: 'number', example: 145, description: 'Longueur totale du vêtement en cm' },
            carrureEpaule: { type: 'number', example: 40, description: 'Carrure épaules en cm' },
            longueurManche: { type: 'number', example: 58, description: 'Longueur manche en cm' },
            tourCou: { type: 'number', example: 36, description: 'Tour de cou en cm' },
            notesParticulieres: { type: 'string', example: 'Coupe cintrée, tissu doublé' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderReference: { type: 'string', example: 'NIA-0248' },
            title: { type: 'string', example: 'Robe Nala en bazin' },
            pricing: {
              type: 'object',
              properties: {
                clothingPrice: { type: 'integer', example: 35000 },
                deliveryFee: { type: 'integer', example: 1500 },
                totalAmount: { type: 'integer', example: 36500 },
                advanceAmount: { type: 'integer', example: 15000 },
                balanceAmount: { type: 'integer', example: 21500 },
                currency: { type: 'string', example: 'FCFA' }
              }
            },
            delivery: {
              type: 'object',
              properties: {
                mode: { type: 'string', enum: ['ATELIER', 'DOMICILE'], example: 'DOMICILE' },
                address: { type: 'string', example: 'Sacré-Cœur 3, Dakar' },
                status: { type: 'string', example: 'REMISE_PLANIFIEE' }
              }
            },
            statuses: {
              type: 'object',
              properties: {
                order: { type: 'string', example: 'EN_CONFECTION' },
                payment: { type: 'string', example: 'ACOMPTE_CONFIRME' },
                confectionStep: { type: 'string', example: 'COUPE_ASSEMBLAGE' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INVALID_STATE_TRANSITION' },
                message: { type: 'string', example: 'Description explicite de l\'erreur' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Auth & Profil', description: 'Inscription, connexion JWT et carnet de mesures' },
      { name: 'Ateliers & Modèles', description: 'Recherche d\'ateliers couturiers et catalogue de créations' },
      { name: 'Commandes & Devis', description: 'Cycle de vie des commandes, devis et instantanés de mesures' },
      { name: 'Paiements Orange Money', description: 'Initialisation des flux Orange Money (acompte/solde), webhooks et reçu' },
      { name: 'Atelier & Confection', description: 'Pilotage atelier couturier et avancement des étapes de couture' },
      { name: 'Litiges & Retouches', description: 'Signalement de non-conformité et retouches sous 48h' }
    ]
  },
  // Resolve beside this module in both src (tsx) and dist (Node), regardless of cwd.
  apis: [path.join(__dirname, '../http/routes/*.{ts,js}').replace(/\\/g, '/')]
};

export const swaggerSpec = swaggerJsdoc(options);
