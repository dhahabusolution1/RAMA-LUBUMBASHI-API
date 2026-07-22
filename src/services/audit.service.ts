import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function createAuditLog(payload: {
  acteurId: string;
  action: string;
  entite: string;
  entiteId?: string;
  details?: any;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        acteurId: payload.acteurId,
        action: payload.action,
        entite: payload.entite,
        entiteId: payload.entiteId ?? null,
        details: payload.details ?? null,
      },
    });
  } catch (error) {
    logger.error('Erreur creation audit log', { error, payload });
    // On ne bloque pas l'action principale si l'audit echoue
    return null;
  }
}

export async function getAuditLogs(params: {
  acteurId?: string;
  entite?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (params.acteurId) where.acteurId = params.acteurId;
  if (params.entite) where.entite = params.entite;

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
    include: { acteur: true },
  });
}
