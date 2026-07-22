import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { typeDefs } from './graphql/typeDefs/index.js';
import { resolvers } from './graphql/resolvers/index.js';
import { createLoaders } from './graphql/loaders/index.js';
import { extractUserFromRequest } from './middlewares/auth.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimit.middleware.js';
import prisma from './config/database.js';
import uploadRoutes from './rest/upload.routes.js';
import donRoutes from './rest/don.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger.js';
import { redis } from './config/redis.js';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import type { Server } from 'http';
import type { Express } from 'express';
import type { GraphQLContext } from './types/context.js';

export async function setupGraphQL(app: Express, httpServer: Server) {

  // Sécurité et Middlewares de base
  app.use(helmet({
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production' ? true : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || '*',
    credentials: true,
  }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(globalRateLimiter);

  // Documentation REST
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Routes REST — auth middleware injecté avant upload pour populer req.user
  app.use('/api/upload', async (req: any, _res, next) => {
    req.user = await extractUserFromRequest(req);
    next();
  }, uploadRoutes);

  // Dons MaxiCash — webhooks et pages de retour (sans auth JWT)
  app.use('/api/dons', donRoutes);

  // Health Check - Verification de l'etat des dependances
  app.get('/health', async (_req, res) => {
    try {
      // Verification rapide des connexions
      await prisma.$queryRaw`SELECT 1`;
      
      res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: 'CONNECTED',
          redis: redis.status === 'ready' ? 'CONNECTED' : redis.status,
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Apollo Server 5.5.0
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: process.env['NODE_ENV'] !== 'production',
    // Securite renforcee (AS5 default)
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const user = await extractUserFromRequest(req);
        // Injecter l'utilisateur dans req pour les routes REST (comme upload)
        (req as any).user = user;

        return {
          user,
          db: prisma,
          loaders: createLoaders(),
          clientIp: req.ip || 'unknown',
          // Node 24 / Express 5 : Signal d'annulation pour les requetes longues
          signal: (req as any).signal,
          res
        };
      },
    })
  );

  return { apolloServer: server };
}
