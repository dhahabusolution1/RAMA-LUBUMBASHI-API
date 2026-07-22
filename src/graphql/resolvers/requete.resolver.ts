import type { GraphQLContext } from '../../types/context.js';
import { requireAuth, requireAdmin } from '../../middlewares/rbac.js';
import { 
  soumettreRequete, 
  updateStatutRequete, 
  getRequetes 
} from '../../services/requete.service.js';
import { RequeteSchema } from '../../validators/requete.validator.js';
import prisma from '../../config/database.js';
import { 
  envoyerNotificationUtilisateur, 
  envoyerNotificationParTelephone,
  enregistrerEtNotifierFidele 
} from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';

export const requeteResolvers = {
  Query: {
    async mesRequetes(_: unknown, { limit, offset }: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return prisma.requete.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { eglise: true },
      });
    },

    async getRequetes(_: unknown, params: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return getRequetes(params);
    },

    async getRequeteById(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.requete.findUnique({
        where: { id },
        include: { user: true, eglise: true },
      });
    },
  },

  Mutation: {
    async soumettreRequete(_: unknown, { input }: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const validated = RequeteSchema.parse(input);
      return soumettreRequete(user.id, validated);
    },

    async updateStatutRequete(_: unknown, { id, statut }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return updateStatutRequete(id, statut);
    },

    async repondreRequete(_: unknown, { id, reponse }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const updated = await prisma.requete.update({
        where: { id },
        data: {
          reponseAdmin: reponse,
          statut: 'REPONDU'
        },
        include: { user: true, eglise: true }
      });
      
      const titre = `Réponse à votre requête (${updated.type})`;
      const body = reponse.length > 100 ? reponse.slice(0, 100) + '...' : reponse;
      
      enregistrerEtNotifierFidele({
        userId: updated.userId,
        telephoneDest: updated.whatsappVisiteur,
        titre,
        corps: body,
        type: 'REQUETE_REPONDUE',
        metaId: id,
      }).catch((err) => logger.error('Erreur notification reponse requete persistee', err));
      
      return updated;
    },
  },

  Requete: {
    async lienGroupeIntegration(parent: { type: string }) {
      if (parent.type !== 'INTEGRATION') {
        return null;
      }
      const config = await prisma.configurationApp.findUnique({
        where: { id: 'GLOBAL_CONFIG' },
        select: { lienGroupeWhatsapp: true },
      });
      return config?.lienGroupeWhatsapp ?? null;
    },
  },
};
