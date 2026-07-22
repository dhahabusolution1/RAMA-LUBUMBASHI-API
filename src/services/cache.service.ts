import { redis, CACHE_KEYS, CACHE_TTL } from '../config/redis.js';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Recupere une valeur du cache Redis.
 * Retourne null si la cle n'existe pas ou en cas d'erreur.
 */
async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn('Erreur lecture Redis', { key, error });
    return null;
  }
}

/**
 * Stocke une valeur dans Redis avec un TTL en secondes.
 */
async function set(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.warn('Erreur ecriture Redis', { key, error });
  }
}

/**
 * Supprime une ou plusieurs cles du cache.
 */
async function invalidate(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug('Cache invalide', { keys });
    }
  } catch (error) {
    logger.warn('Erreur invalidation Redis', { keys, error });
  }
}

// ─── Verset du Jour ──────────────────────────────────────────

export async function getCachedVersetDuJour() {
  const cached = await get(CACHE_KEYS.VERSET_DU_JOUR);
  if (cached) return cached;

  const verset = await prisma.versetJour.findFirst({ where: { estActif: true } });
  if (verset) {
    await set(CACHE_KEYS.VERSET_DU_JOUR, verset, CACHE_TTL.VERSET_DU_JOUR);
  }
  return verset;
}

export async function invalidateVersetCache() {
  await invalidate(CACHE_KEYS.VERSET_DU_JOUR, CACHE_KEYS.ACCUEIL_MOBILE);
}

// ─── Page d'Accueil ──────────────────────────────────────────

export async function getCachedAccueil() {
  const cached = await get(CACHE_KEYS.ACCUEIL_MOBILE);
  if (cached) return cached;

  const [
    configApp,
    versetDuJour,
    citationDuJour,
    dernierSermon,
    prochainEvenements,
    programmesCulte,
    culteEnDirect,
  ] = await Promise.all([
    prisma.configurationApp.findUnique({
      where: { id: 'GLOBAL_CONFIG' },
      include: {
        imagesAccueil: {
          where: { estActif: true },
          orderBy: { ordre: 'asc' },
        },
      },
    }),
    prisma.versetJour.findFirst({ where: { estActif: true } }),
    prisma.citation.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.sermon.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.evenement.findMany({
      where: {
        type: 'EVENEMENT',
        statut: 'PUBLIE',
        dateDebut: { gte: new Date() },
      },
      orderBy: { dateDebut: 'asc' },
      take: 3,
    }),
    prisma.evenement.findMany({
      where: {
        type: 'PROGRAMME_CULTE',
        statut: 'PUBLIE',
        dateDebut: { gte: new Date() },
      },
      orderBy: { dateDebut: 'asc' },
      take: 5,
    }),
    prisma.culte.findFirst({ where: { statut: 'EN_DIRECT' } }),
  ]);

  const data = {
    imagesAccueil: configApp?.imagesAccueil ?? [],
    programmeHebdomadaire: configApp?.programmeHebdomadaire ?? null,
    programmeDimanche: configApp?.programmeDimanche ?? null,
    versetDuJour,
    citationDuJour,
    dernierSermon,
    prochainEvenements,
    programmesCulte,
    estEnDirect: !!culteEnDirect,
  };

  await set(CACHE_KEYS.ACCUEIL_MOBILE, data, CACHE_TTL.ACCUEIL_MOBILE);
  return data;
}

export async function invalidateAccueilCache() {
  await invalidate(CACHE_KEYS.ACCUEIL_MOBILE);
}

// ─── Eglises ─────────────────────────────────────────────────

export async function getCachedEglises() {
  const cached = await get(CACHE_KEYS.EGLISES);
  if (cached) return cached;

  const eglises = await prisma.eglise.findMany({ orderBy: { nom: 'asc' } });
  await set(CACHE_KEYS.EGLISES, eglises, CACHE_TTL.EGLISES);
  return eglises;
}

export async function invalidateEglisesCache() {
  await invalidate(CACHE_KEYS.EGLISES, CACHE_KEYS.ACCUEIL_MOBILE);
}

// ─── Departements ─────────────────────────────────────────────

export async function getCachedDepartements() {
  const cached = await get(CACHE_KEYS.DEPARTEMENTS);
  if (cached) return cached;

  const departements = await prisma.departement.findMany({ orderBy: { nom: 'asc' } });
  await set(CACHE_KEYS.DEPARTEMENTS, departements, CACHE_TTL.DEPARTEMENTS);
  return departements;
}

export async function invalidateDepartementsCache() {
  await invalidate(CACHE_KEYS.DEPARTEMENTS);
}

// ─── Dashboard KPIs ───────────────────────────────────────────

export async function getCachedDashboard() {
  const cached = await get<Record<string, unknown>>(CACHE_KEYS.DASHBOARD_KPIS);
  // Invalide le cache si des champs introduits recemment sont absents
  if (cached && cached['totalRequetesEnAttente'] !== undefined && cached['distributionInteractions'] !== undefined) {
    return cached;
  }

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalUtilisateurs,
    totalAdmins,
    totalEvenementsActifs,
    totalSermons,
    totalEglises,
    totalCellules,
    totalDepartements,
    totalShorts,
    totalRequetesEnAttente,
    totalRendezVousEnAttente,
    totalMessagesNonLus,
    requetesParType,
    prochainEvenements,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'FIDELE', deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null } }),
    prisma.evenement.count({ where: { statut: 'PUBLIE', dateDebut: { gte: now } } }),
    prisma.sermon.count(),
    prisma.eglise.count(),
    prisma.cellule.count(),
    prisma.departement.count(),
    prisma.shortVideo.count(),
    prisma.requete.count({ where: { statut: 'EN_ATTENTE' } }),
    prisma.rendezVous.count({ where: { statut: 'EN_ATTENTE' } }),
    prisma.message.count({ where: { statut: 'ENVOYE' } }),
    prisma.requete.groupBy({ by: ['type'], _count: { id: true } }),
    prisma.evenement.findMany({
      where: {
        statut: 'PUBLIE',
        dateDebut: { gte: now, lte: thirtyDaysLater },
      },
      orderBy: { dateDebut: 'asc' },
      take: 5,
    }),
  ]);

  const totalFideles = totalUtilisateurs;

  const TYPE_LABELS: Record<string, string> = {
    PRIERE: 'Prières',
    PRIERE_SALUT: 'Prières du Salut',
    RENOUVELLEMENT: 'Renouvellements',
    INTEGRATION: 'Intégrations',
    DEMANDE_INFO: 'Demandes info',
    BAPTEME: 'Baptêmes',
  };

  const distributionInteractions = [
    ...requetesParType.map((r: any) => ({
      type: TYPE_LABELS[r.type] ?? r.type,
      total: r._count.id,
    })),
  ];

  const data = {
    totalUtilisateurs: totalFideles + totalAdmins,
    totalFideles,
    totalAdmins,
    totalEvenementsActifs,
    totalSermons,
    totalEglises,
    totalCellules,
    totalDepartements,
    totalShorts,
    totalRequetesEnAttente,
    totalRendezVousEnAttente,
    totalMessagesNonLus,
    distributionInteractions,
    prochainEvenements,
  };

  await set(CACHE_KEYS.DASHBOARD_KPIS, data, CACHE_TTL.DASHBOARD_KPIS);
  return data;
}

export async function invalidateDashboardCache() {
  await invalidate(CACHE_KEYS.DASHBOARD_KPIS);
}

// ─── Statut Live ──────────────────────────────────────────────

export async function getCachedEstEnDirect(): Promise<boolean> {
  const cached = await get<boolean>(CACHE_KEYS.EST_EN_DIRECT);
  if (cached !== null) return cached;

  const culte = await prisma.culte.findFirst({ where: { statut: 'EN_DIRECT' } });
  const estEnDirect = !!culte;
  await set(CACHE_KEYS.EST_EN_DIRECT, estEnDirect, CACHE_TTL.EST_EN_DIRECT);
  return estEnDirect;
}

export async function invalidateLiveCache() {
  await invalidate(CACHE_KEYS.EST_EN_DIRECT, CACHE_KEYS.ACCUEIL_MOBILE);
}
