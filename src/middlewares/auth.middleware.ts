import type { Request } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';
import prisma from '../config/database.js';
import type { User } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Extrait et verifie le token JWT depuis le header Authorization.
 * Retourne l'utilisateur correspondant, ou null si aucun token valide n'est presente.
 * Ne lance pas d'erreur — la gestion des acces se fait dans les directives GraphQL.
 */
export async function extractUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, deletedAt: null },
    });

    return user;
  } catch (error) {
    logger.debug('Token invalide', { error });
    return null;
  }
}

/**
 * Extrait le token JWT depuis les connectionParams WebSocket.
 * Utilise lors de l'initialisation d'une connexion Subscription.
 */
export async function extractUserFromWsParams(
  connectionParams: Record<string, unknown>
): Promise<User | null> {
  const authHeader =
    typeof connectionParams['authorization'] === 'string'
      ? connectionParams['authorization']
      : typeof connectionParams['Authorization'] === 'string'
        ? connectionParams['Authorization']
        : null;

  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    return await prisma.user.findUnique({
      where: { id: payload.userId, deletedAt: null },
    });
  } catch {
    return null;
  }
}
