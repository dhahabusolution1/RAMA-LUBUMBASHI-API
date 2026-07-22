import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express from 'express';
import { setupGraphQL } from './app.js';
import { typeDefs } from './graphql/typeDefs/index.js';
import { resolvers } from './graphql/resolvers/index.js';
import { connectDatabase } from './config/database.js';
import { testRedisConnection } from './config/redis.js';
import { initFirebase } from './config/firebase.js';
import { logger } from './utils/logger.js';
import { setupVersetActivator } from './jobs/verset-activator.job.js';
import { setupEvenementCleanup } from './jobs/evenement-status.job.js';
import { extractUserFromWsParams } from './middlewares/auth.middleware.js';
import { createLoaders } from './graphql/loaders/index.js';
import prisma from './config/database.js';
import { setUserOnline, setUserOffline } from './services/messagerie.service.js';

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;

async function bootstrap() {
  try {
    // 1. Connexions Infrastructure
    await connectDatabase();
    await testRedisConnection();
    initFirebase();

    // 2. Initialisation Express & Apollo
    const app = express();
    const httpServer = createServer(app);
    const { apolloServer } = await setupGraphQL(app, httpServer);

    // 3. Configuration WebSocket pour Subscriptions (graphql-ws)
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    });

    const serverCleanup = useServer(
      {
        schema,
        context: async (ctx) => {
          const user = await extractUserFromWsParams(ctx.connectionParams || {});
          return {
            user,
            db: prisma,
            loaders: createLoaders(),
            clientIp: 'ws',
          };
        },
        onConnect: async (ctx: any) => {
          const user = await extractUserFromWsParams(ctx.connectionParams || {});
          if (user) {
            await setUserOnline(user.id);
          }
        },
        onDisconnect: async (ctx: any) => {
          const user = await extractUserFromWsParams(ctx.connectionParams || {});
          if (user) {
            await setUserOffline(user.id);
          }
        },
      },
      wsServer
    );

    // 4. Jobs Planifies
    setupVersetActivator();
    setupEvenementCleanup();

    // 5. Demarrage
    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`Serveur pret sur http://localhost:${PORT}/graphql`);
      logger.info(`Subscriptions prêtes sur ws://localhost:${PORT}/graphql`);
      logger.info(`Health check disponible sur http://localhost:${PORT}/health`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Le port ${PORT} est déjà utilisé. Veuillez libérer le port ou choisir un autre PORT.`);
        process.exit(1);
      } else {
        logger.error('Erreur lors du démarrage du serveur HTTP', err);
        process.exit(1);
      }
    });

    // Gestion de l'arret propre
    const shutdown = async () => {
      logger.info('Arret du serveur...');
      await serverCleanup.dispose();
      httpServer.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error('Erreur critique lors du demarrage', { 
      message: error.message,
      stack: error.stack,
      error 
    });
    process.exit(1);
  }
}

bootstrap();
