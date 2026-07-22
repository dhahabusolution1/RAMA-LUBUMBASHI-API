import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arche Source de Vie API',
      version: '2.0.0',
      description: 'Documentation des endpoints REST du backend (Uploads, Health)',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Serveur de developpement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/rest/*.ts'], // Fichiers contenant des annotations Swagger
};

export const swaggerSpec = swaggerJsdoc(options);
