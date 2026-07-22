import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => logger.error('Redis Cache Error', err));

// Cles de cache centralisees — eviter les typos
export const CACHE_KEYS = {
  VERSET_DU_JOUR: 'verset_du_jour',
  ACCUEIL_MOBILE: 'accueil_mobile',
  EGLISES: 'eglises_liste',
  CELLULES: (egliseId?: string) => egliseId ? `cellules_${egliseId}` : 'cellules_toutes',
  DEPARTEMENTS: 'departements_liste',
  DASHBOARD_KPIS: 'dashboard_kpis',
  EST_EN_DIRECT: 'culte_est_en_direct',
  DERNIER_SERMON: 'dernier_sermon',
} as const;

// TTL en secondes
export const CACHE_TTL = {
  VERSET_DU_JOUR: 86400,      // 24h (invalide a minuit par le cron)
  ACCUEIL_MOBILE: 300,         // 5 min
  EGLISES: 3600,               // 1h
  CELLULES: 3600,              // 1h
  DEPARTEMENTS: 3600,          // 1h
  DASHBOARD_KPIS: 300,         // 5 min
  EST_EN_DIRECT: 30,           // 30 sec
  DERNIER_SERMON: 3600,        // 1h
} as const;

export async function testRedisConnection(): Promise<void> {
  try {
    await redis.ping();
    logger.info('Connexion Redis (ioredis) etablie');
  } catch (error) {
    logger.error('Echec de connexion Redis', { error });
    process.exit(1);
  }
}
