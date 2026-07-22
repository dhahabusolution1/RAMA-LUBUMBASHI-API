import type { GraphQLContext } from '../../types/context.js';
import { requireAuth, requireSuperAdmin } from '../../middlewares/rbac.js';
import { envoyerNotificationManuelle } from '../../services/notification.service.js';
import prisma from '../../config/database.js';

export const notificationResolvers = {
  Query: {
    async mesNotifications(_: unknown, { limit, offset }: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit ?? 20,
        skip: offset ?? 0,
      });
    },

    async nombreNotificationsNonLues(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return prisma.notification.count({
        where: { userId: user.id, lu: false },
      });
    },
  },

  Mutation: {
    async envoyerNotification(
      _: unknown,
      { titre, corps, cible }: { titre: string; corps: string; cible: 'TOUS' | 'FIDELES' },
      ctx: GraphQLContext
    ) {
      requireSuperAdmin(ctx);
      return envoyerNotificationManuelle(titre, corps, cible);
    },

    async marquerNotificationLue(_: unknown, { id }: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const notif = await prisma.notification.findUnique({ where: { id } });
      if (!notif) {
        throw new Error('Notification introuvable');
      }
      if (notif.userId !== user.id) {
        throw new Error('Non autorisé');
      }
      return prisma.notification.update({
        where: { id },
        data: { lu: true },
      });
    },

    async marquerToutesNotificationsLues(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      await prisma.notification.updateMany({
        where: { userId: user.id, lu: false },
        data: { lu: true },
      });
      return true;
    },
  },
};
