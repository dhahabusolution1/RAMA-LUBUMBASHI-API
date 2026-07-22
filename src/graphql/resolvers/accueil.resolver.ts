import type { GraphQLContext } from '../../types/context.js';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/rbac.js';
import { 
  getCachedAccueil, 
  getCachedDashboard, 
  invalidateAccueilCache, 
  invalidateDashboardCache 
} from '../../services/cache.service.js';
import prisma from '../../config/database.js';

export const accueilResolvers = {
  Query: {
    async getAccueil() {
      return getCachedAccueil();
    },

    async getDashboard(_: unknown, __: unknown, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return getCachedDashboard();
    },

    async getAuditLogs(_: unknown, { entite, acteurId, limit, offset }: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      const where: any = {};
      if (entite) where.entite = entite;
      if (acteurId) where.acteurId = acteurId;

      return prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { acteur: true },
      });
    },
  },

  Mutation: {
    async modifierConfigurationAccueil(
      _: unknown,
      {
        programmeHebdomadaire,
        programmeDimanche,
        imagesAccueil,
      }: { 
        programmeHebdomadaire?: string; 
        programmeDimanche?: string; 
        imagesAccueil?: any[] 
      },
      ctx: GraphQLContext
    ) {
      requireSuperAdmin(ctx);

      await prisma.$transaction(async (tx: any) => {
        await tx.configurationApp.update({
          where: { id: 'GLOBAL_CONFIG' },
          data: {
            programmeHebdomadaire: programmeHebdomadaire ?? null,
            programmeDimanche: programmeDimanche ?? null,
          },
        });

        if (imagesAccueil) {
          // Purger et recreer les images
          await tx.imageAccueil.deleteMany({ where: { configId: 'GLOBAL_CONFIG' } });
          await tx.imageAccueil.createMany({
            data: imagesAccueil.map((img, index) => ({
              configId: 'GLOBAL_CONFIG',
              imageUrl: img.imageUrl,
              cloudinaryPublicId: img.cloudinaryPublicId,
              ordre: img.ordre ?? index,
              estActif: img.estActif ?? true,
            })),
          });
        }
      });

      await invalidateAccueilCache();

      const config = await prisma.configurationApp.findUnique({
        where: { id: 'GLOBAL_CONFIG' },
        include: { imagesAccueil: { orderBy: { ordre: 'asc' } } },
      });

      return {
        programmeHebdomadaire: config?.programmeHebdomadaire,
        programmeDimanche: config?.programmeDimanche,
        imagesAccueil: config?.imagesAccueil ?? [],
      };
    },
  },
};
