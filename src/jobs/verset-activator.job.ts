import cron from 'node-cron';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { invalidateVersetCache } from '../services/cache.service.js';
import { envoyerNotificationVersetDuJour } from '../services/notification.service.js';

/**
 * Job de minuit : Active le verset prevu pour aujourd'hui.
 */
export function setupVersetActivator() {
  // 00:01 chaque jour
  cron.schedule('1 0 * * *', async () => {
    logger.info('Execution du job VersetActivator...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const versetToActivate = await prisma.versetJour.findFirst({
      where: {
        datePublication: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (versetToActivate) {
      await prisma.$transaction([
        prisma.versetJour.updateMany({ where: { estActif: true }, data: { estActif: false } }),
        prisma.versetJour.update({ where: { id: versetToActivate.id }, data: { estActif: true } }),
      ]);
      await invalidateVersetCache();
      logger.info(`Verset active pour aujourd'hui : ${versetToActivate.reference}`);
    } else {
      logger.warn('Aucun verset prevu pour aujourd\'hui');
    }
  });

  // 07:00 chaque jour : Envoie la notification push
  cron.schedule('0 7 * * *', async () => {
    logger.info('Execution du job MorningVersetPush...');
    await envoyerNotificationVersetDuJour();
  });
}
