import { GraphQLError } from 'graphql';
import type { Requete, StatutRequete } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { invalidateDashboardCache } from './cache.service.js';
import { 
  envoyerNotificationUtilisateur, 
  envoyerNotificationParTelephone,
  enregistrerEtNotifierFidele
} from './notification.service.js';

/** Statuts déclenchant une push fidèle (hors EN_ATTENTE initial et LU interne admin). */
const STATUTS_REQUETE_NOTIFIABLES = new Set<StatutRequete>([
  'EN_PRIERE',
  'REPONDU',
  'TERMINE',
  'CONTACTE',
  'INTEGRE',
  'ABANDONNE',
  'CONFIRME',
  'REALISE',
  'ANNULE',
]);

const STATUT_REQUETE_LABELS: Record<StatutRequete, string> = {
  EN_ATTENTE: 'En attente',
  LU: 'Lu',
  REPONDU: 'Répondu',
  EN_PRIERE: 'En prière',
  TERMINE: 'Terminé',
  CONTACTE: 'Contacté',
  INTEGRE: 'Intégré',
  ABANDONNE: 'Abandonné',
  CONFIRME: 'Confirmé',
  REALISE: 'Réalisé',
  ANNULE: 'Annulé',
};

function notifierChangementStatutRequete(requete: Requete, requeteId: string, statut: StatutRequete): void {
  const label = STATUT_REQUETE_LABELS[statut];
  const titre = 'Mise à jour de votre demande';
  const body = `Votre demande est maintenant : ${label}`;

  enregistrerEtNotifierFidele({
    userId: requete.userId,
    telephoneDest: requete.whatsappVisiteur,
    titre,
    corps: body,
    type: 'REQUETE_STATUT',
    metaId: requeteId,
  }).catch((err) => logger.error('Erreur push statut requete persistee', err));
}

export async function soumettreRequete(userId: string, input: {
  type: string;
  egliseId?: string | null | undefined;
  egliseNom?: string | null | undefined;
  message?: string | undefined;
  typePriere?: any | undefined;
  estMembre?: boolean | undefined;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new GraphQLError('Utilisateur introuvable', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  const egliseNom = input.egliseNom?.trim() || null;

  const requete = await prisma.requete.create({
    data: {
      type: input.type as any,
      userId,
      nomVisiteur: user.nom,
      prenomVisiteur: user.prenom,
      whatsappVisiteur: user.numeroWhatsapp || '',
      emailVisiteur: user.email,
      ...(input.egliseId && { egliseId: input.egliseId }),
      ...(egliseNom && { egliseNom }),
      ...(input.message && { message: input.message }),
      ...(input.typePriere && { typePriere: input.typePriere }),
      ...(input.estMembre !== undefined && { estMembre: input.estMembre }),
      statut: 'EN_ATTENTE',
    },
    include: { user: true, eglise: true },
  });

  logger.info('Nouvelle requete creee', { type: input.type, userId });
  await invalidateDashboardCache();

  // Notification de réception instantanée (Persistance + Push FCM)
  const nomComplet = [user.prenom, user.nom].filter(Boolean).join(' ') || 'Fidèle';
  let notifTitre = '';
  let notifCorps = '';

  if (requete.type === 'PRIERE') {
    notifTitre = 'Demande de prière reçue';
    notifCorps = `Shalom bien-aimé (e) ${nomComplet} que la paix du Seigneur soit avec vous! Nous avons reçu votre demande de prière \nQue Dieu vous bénisse !!\nArche Source de Vie`;
  } else if (requete.type === 'PRIERE_SALUT') {
    notifTitre = 'Demande de prière du salut reçue';
    notifCorps = `Shalom bien-aimé (e) ${nomComplet} que la paix du Seigneur soit avec vous! Nous avons reçu votre demande de prière du salut \nQue Dieu vous bénisse !!\nArche Source de Vie`;
  } else if (requete.type === 'RENOUVELLEMENT') {
    notifTitre = 'Demande de prière de renouvellement reçue';
    notifCorps = `Shalom bien-aimé (e) ${nomComplet} que la paix du Seigneur soit avec vous! Nous avons reçu votre demande de prière de renouvellement \nQue Dieu vous bénisse !!\nArche Source de Vie`;
  }

  if (notifTitre && notifCorps) {
    enregistrerEtNotifierFidele({
      userId,
      telephoneDest: user.numeroWhatsapp,
      titre: notifTitre,
      corps: notifCorps,
      type: `REQUETE_RECEPTION_${requete.type}`,
      metaId: requete.id,
    }).catch((err) => logger.error('Erreur lors de l’envoi de la notification de réception de requête', err));
  }

  return requete;
}


/**
 * Met a jour le statut d'une requete.
 */
export async function updateStatutRequete(id: string, statut: string) {
  const existing = await prisma.requete.findUnique({ where: { id } });
  if (!existing) {
    throw new GraphQLError('Requete introuvable', { extensions: { code: 'NOT_FOUND' } });
  }

  // Si c'est une requête d'intégration, seuls les statuts EN_ATTENTE, INTEGRE et ABANDONNE sont autorisés
  if (existing.type === 'INTEGRATION') {
    const listesAutorisees = ['EN_ATTENTE', 'INTEGRE', 'ABANDONNE'];
    if (!listesAutorisees.includes(statut)) {
      throw new GraphQLError(
        `Statut invalide pour une intégration. Statuts autorisés : ${listesAutorisees.join(', ')}`,
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
  }
  
  const updated = await prisma.requete.update({
    where: { id },
    data: { statut: statut as StatutRequete },
    include: { user: true, eglise: true },
  });

  const statutNotifiable = statut as StatutRequete;
  if (
    existing.statut !== statutNotifiable &&
    STATUTS_REQUETE_NOTIFIABLES.has(statutNotifiable)
  ) {
    notifierChangementStatutRequete(updated, id, statutNotifiable);
  }

  logger.info('Statut requete mis a jour', { id, type: existing.type, statut });
  return updated;
}

/**
 * Recupere les requetes avec pagination et filtres.
 */
export async function getRequetes(params: {
  type?: string;
  statut?: string;
  typePriere?: string;
  search?: string;
  dateDebut?: Date;
  dateFin?: Date;
  limit: number;
  offset: number;
}) {
  const where: any = {};
  
  if (params.type) where.type = params.type;
  if (params.statut) where.statut = params.statut;
  if (params.typePriere) where.typePriere = params.typePriere;
  
  if (params.search) {
    where.OR = [
      { nomVisiteur: { contains: params.search, mode: 'insensitive' } },
      { whatsappVisiteur: { contains: params.search } },
      { egliseNom: { contains: params.search, mode: 'insensitive' } },
      { user: { nom: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  if (params.dateDebut || params.dateFin) {
    where.createdAt = {};
    if (params.dateDebut) where.createdAt.gte = params.dateDebut;
    if (params.dateFin) where.createdAt.lte = params.dateFin;
  }

  const [items, total] = await Promise.all([
    prisma.requete.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      skip: params.offset,
      include: { user: true, eglise: true },
    }),
    prisma.requete.count({ where }),
  ]);

  return {
    items,
    pagination: {
      total,
      count: items.length,
      limit: params.limit,
      offset: params.offset,
      hasNextPage: params.offset + params.limit < total,
    },
  };
}
