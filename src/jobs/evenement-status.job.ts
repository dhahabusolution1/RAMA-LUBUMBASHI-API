import cron from 'node-cron';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { invalidateAccueilCache } from '../services/cache.service.js';

/**
 * Job de fin de journee : Bascule les evenements passes en statut TERMINE.
 */
export function setupEvenementCleanup() {
  // 23:59 chaque jour
  cron.schedule('59 23 * * *', async () => {
    logger.info('Execution du job EvenementCleanup...');
    const now = new Date();

    const result = await prisma.evenement.updateMany({
      where: {
        statut: 'PUBLIE',
        dateDebut: { lt: now },
      },
      data: { statut: 'TERMINE' },
    });

    if (result.count > 0) {
      logger.info(`${result.count} evenements bascules en statut TERMINE`);
      await invalidateAccueilCache();
    }
  });
}
