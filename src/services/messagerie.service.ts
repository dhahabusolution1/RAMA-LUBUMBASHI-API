import { GraphQLError } from 'graphql';
import prisma from '../config/database.js';
import { redisPubSub, PUBSUB_CHANNELS } from '../graphql/pubsub.js';
import { envoyerNotificationUtilisateur } from './notification.service.js';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';

const ONLINE_USERS_SET = 'parole_eternelle:online_users';

/**
 * Marque un utilisateur comme connecte via WebSocket.
 * Appele lors de la connexion WebSocket.
 */
export async function setUserOnline(userId: string): Promise<void> {
  try {
    await redis.sadd(ONLINE_USERS_SET, userId);
  } catch {
    // Non critique — le fallback FCM gerera les cas hors ligne
  }
}

/**
 * Marque un utilisateur comme deconnecte.
 * Appele lors de la fermeture WebSocket.
 */
export async function setUserOffline(userId: string): Promise<void> {
  try {
    await redis.srem(ONLINE_USERS_SET, userId);
  } catch {
    // Non critique
  }
}

/**
 * Verifie si un utilisateur a une session WebSocket active.
 */
async function isUserOnline(userId: string): Promise<boolean> {
  try {
    return (await redis.sismember(ONLINE_USERS_SET, userId)) === 1;
  } catch {
    return false; // En cas d'erreur Redis, supposer hors ligne
  }
}

/**
 * Recupere ou cree la conversation d'un fidele.
 * Un fidele ne peut avoir qu'une seule conversation active.
 */
export async function getMaConversation(fideleId: string) {
  const existing = await prisma.conversation.findUnique({
    where: { fideleId },
    include: {
      fidele: true,
      admin: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (existing) return existing;

  // Creer une nouvelle conversation
  return prisma.conversation.create({
    data: { fideleId },
    include: {
      fidele: true,
      admin: true,
      messages: true,
    },
  });
}

/**
 * Envoie un message dans une conversation.
 * Diffuse via WebSocket (PubSub) et bascule sur FCM si le destinataire est hors ligne.
 */
export async function envoyerMessage(
  conversationId: string,
  expediteurId: string,
  contenu: string
) {
  // Verifier que la conversation existe
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { fidele: true, admin: true },
  });

  if (!conversation) {
    throw new GraphQLError('Conversation introuvable', { extensions: { code: 'NOT_FOUND' } });
  }

  if (conversation.statut === 'FERMEE') {
    throw new GraphQLError('Cette conversation est fermee', { extensions: { code: 'FORBIDDEN' } });
  }

  // Verifier que l'expediteur est participant
  const estFidele = conversation.fideleId === expediteurId;
  const estAdmin = conversation.adminId === expediteurId;

  // Un admin non assigne peut quand meme repondre
  const isAdmin = await prisma.user.findUnique({
    where: { id: expediteurId },
    select: { role: true },
  });

  if (!estFidele && !estAdmin && isAdmin?.role === 'FIDELE') {
    throw new GraphQLError('Acces refuse', { extensions: { code: 'FORBIDDEN' } });
  }

  // Creer le message
  const message = await prisma.message.create({
    data: { conversationId, expediteurId, contenu },
    include: { expediteur: true, conversation: true },
  });

  // Mettre a jour le timestamp de la conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Diffuser via WebSocket
  await redisPubSub.publish(
    PUBSUB_CHANNELS.NEW_MESSAGE(conversationId),
    { nouveauMessage: message }
  );

  // Identifier le destinataire
  const destinataireId = estFidele
    ? (conversation.adminId ?? null)
    : conversation.fideleId;

  // Fallback FCM si le destinataire est hors ligne
  if (destinataireId) {
    const online = await isUserOnline(destinataireId);
    if (!online) {
      const expediteur = message.expediteur;
      await envoyerNotificationUtilisateur(destinataireId, {
        title: `Message de ${expediteur.nom}`,
        body: contenu.slice(0, 150),
        data: { type: 'NOUVEAU_MESSAGE', conversationId },
      });
    }
  }

  logger.debug('Message envoye', { conversationId, expediteurId });
  return message;
}

/**
 * Marque tous les messages non lus d'une conversation comme lus.
 */
export async function marquerMessagesLus(conversationId: string, userId: string): Promise<void> {
  await prisma.message.updateMany({
    where: {
      conversationId,
      statut: 'ENVOYE',
      // Marquer comme lus uniquement les messages des autres
      expediteurId: { not: userId },
    },
    data: { statut: 'LU' },
  });
}

/**
 * Calcule le nombre de messages non lus pour un utilisateur dans une conversation.
 */
export async function getMessagesNonLus(conversationId: string, userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId,
      statut: 'ENVOYE',
      expediteurId: { not: userId },
    },
  });
}
