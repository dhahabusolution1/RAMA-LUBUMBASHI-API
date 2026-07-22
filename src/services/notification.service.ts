import prisma from '../config/database.js';
import { sendFcmMulticast, sendFcmToToken } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

/**
 * Envoie une notification push au verset du jour a tous les tokens enregistres.
 * Appele par le cron job MorningVersetPush a 07:00.
 */
export async function envoyerNotificationVersetDuJour(): Promise<void> {
  const verset = await prisma.versetJour.findFirst({ where: { estActif: true } });
  if (!verset) {
    logger.warn('Aucun verset actif — notification annulee');
    return;
  }

  const tokens = await prisma.fcmToken.findMany({ select: { token: true } });
  const tokenList = tokens.map((t: { token: string }) => t.token);

  const sent = await sendFcmMulticast(tokenList, {
    title: `Verset du Jour — ${verset.reference}`,
    body: verset.texte.slice(0, 200),
    data: { type: 'VERSET_DU_JOUR', versetId: verset.id },
  });

  logger.info('Notification verset du jour envoyee', {
    totalTokens: tokenList.length,
    envoyes: sent,
    reference: verset.reference,
  });
}

/**
 * Envoie une notification push pour un evenement publie.
 */
export async function envoyerNotificationEvenement(evenementId: string): Promise<void> {
  const evenement = await prisma.evenement.findUnique({ where: { id: evenementId } });
  if (!evenement) return;

  const tokens = await prisma.fcmToken.findMany({ select: { token: true } });
  const tokenList = tokens.map((t: { token: string }) => t.token);

  await sendFcmMulticast(tokenList, {
    title: 'Nouvel evenement',
    body: evenement.titre,
    data: { type: 'NOUVEL_EVENEMENT', evenementId },
  });
}

/**
 * Envoie une notification push pour un culte en direct.
 */
export async function envoyerNotificationCulteEnDirect(culteId: string): Promise<void> {
  const culte = await prisma.culte.findUnique({ where: { id: culteId } });
  if (!culte) return;

  const tokens = await prisma.fcmToken.findMany({ select: { token: true } });
  const tokenList = tokens.map((t: { token: string }) => t.token);

  await sendFcmMulticast(tokenList, {
    title: 'Culte en Direct',
    body: culte.titre,
    data: { type: 'CULTE_EN_DIRECT', culteId },
  });

  logger.info('Notification culte en direct envoyee', { culteId, titre: culte.titre });
}

/**
 * Envoie une notification push pour une nouvelle émission.
 */
export async function envoyerNotificationEmission(emissionId: string): Promise<void> {
  const emission = await prisma.emission.findUnique({ where: { id: emissionId } });
  if (!emission) return;

  const tokens = await prisma.fcmToken.findMany({ select: { token: true } });
  const tokenList = tokens.map((t: { token: string }) => t.token);

  await sendFcmMulticast(tokenList, {
    title: 'Nouvelle Émission',
    body: emission.titre,
    data: { type: 'NOUVELLE_EMISSION', emissionId },
  });

  logger.info('Notification emission envoyee', { emissionId, titre: emission.titre });
}

/**
 * Envoie une notification manuelle personnalisee.
 * Accessible uniquement par le SUPER_ADMIN via la mutation envoyerNotification.
 */
export async function envoyerNotificationManuelle(
  titre: string,
  corps: string,
  cible: 'TOUS' | 'FIDELES'
): Promise<number> {
  let tokens: { token: string }[];

  if (cible === 'FIDELES') {
    tokens = await prisma.fcmToken.findMany({
      where: {
        user: { role: 'FIDELE', deletedAt: null },
      },
      select: { token: true },
    });
  } else {
    tokens = await prisma.fcmToken.findMany({ select: { token: true } });
  }

  const tokenList = tokens.map((t: { token: string }) => t.token);
  const sent = await sendFcmMulticast(tokenList, { title: titre, body: corps });

  logger.info('Notification manuelle envoyee', { titre, cible, totalTokens: tokenList.length, envoyes: sent });
  return sent;
}

/**
 * Envoie une notification a un utilisateur specifique (pour les messages hors ligne).
 */
export async function envoyerNotificationUtilisateur(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const tokens = await prisma.fcmToken.findMany({
    where: { userId },
    select: { token: true },
  });

  for (const { token } of tokens) {
    await sendFcmToToken(token, payload);
  }
}

/**
 * Envoie une notification à un utilisateur en utilisant son numéro de téléphone
 * (Utile pour les inscriptions/requêtes non authentifiées).
 */
export async function envoyerNotificationParTelephone(
  telephone: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  // Trouver l'utilisateur par son numéro
  const user = await prisma.user.findFirst({
    where: { numeroWhatsapp: telephone },
    select: { id: true }
  });

  if (!user) {
    logger.warn('Utilisateur introuvable par telephone pour notification', { telephone });
    return;
  }

  await envoyerNotificationUtilisateur(user.id, payload);
}

/**
 * Enregistre ou met a jour le token FCM d'un appareil.
 */
export async function enregistrerFcmToken(
  token: string,
  plateforme: 'IOS' | 'ANDROID',
  userId?: string
): Promise<void> {
  await prisma.fcmToken.upsert({
    where: { token },
    update: { 
      plateforme, 
      ...(userId && { userId }), 
      updatedAt: new Date() 
    },
    create: { 
      token, 
      plateforme, 
      ...(userId && { userId }) 
    },
  });
}

/**
 * Enregistre une notification en base de données et l'envoie via FCM à un fidèle.
 */
export async function enregistrerEtNotifierFidele(params: {
  userId?: string | null;
  telephoneDest?: string | null;
  titre: string;
  corps: string;
  type: string;
  metaId?: string;
}): Promise<void> {
  const { userId, telephoneDest, titre, corps, type, metaId } = params;

  let resolvedUserId: string | null = userId || null;

  // Si pas de userId direct mais qu'on a un téléphone, chercher l'utilisateur correspondant
  if (!resolvedUserId && telephoneDest) {
    const matchedUser = await prisma.user.findFirst({
      where: { numeroWhatsapp: telephoneDest },
      select: { id: true },
    });
    if (matchedUser) {
      resolvedUserId = matchedUser.id;
    }
  }

  // 1. Persistance en base de données
  try {
    await prisma.notification.create({
      data: {
        userId: resolvedUserId,
        telephoneDest: telephoneDest || null,
        titre,
        corps,
        type,
        metaId: metaId || null,
      },
    });
    logger.info('Notification persistee avec succes', { userId: resolvedUserId, type });
  } catch (err: any) {
    logger.error('Erreur lors de la persistance de la notification', { error: err.message, type });
  }

  // 2. Envoi Push (FCM)
  const payload = {
    title: titre,
    body: corps,
    data: {
      type,
      ...(metaId && { metaId }),
    },
  };

  try {
    if (resolvedUserId) {
      await envoyerNotificationUtilisateur(resolvedUserId, payload);
    } else if (telephoneDest) {
      await envoyerNotificationParTelephone(telephoneDest, payload);
    } else {
      logger.warn('Aucun destinataire (userId ou telephoneDest) specifie pour la notification push');
    }
  } catch (err: any) {
    logger.error('Erreur lors de l’envoi de la notification push FCM', { error: err.message, type });
  }
}
