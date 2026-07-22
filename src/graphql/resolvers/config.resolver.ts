import type { GraphQLContext } from '../../types/context.js';
import { requireSuperAdmin } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';

export const configResolvers = {
  Query: {
    async getConfigurationWhatsApp() {
      const config = await prisma.configurationApp.findUnique({
        where: { id: 'GLOBAL_CONFIG' },
        select: {
          lienGroupeWhatsapp: true,
          numeroWhatsappBookshop: true,
        },
      });
      return {
        lienGroupeWhatsapp: config?.lienGroupeWhatsapp ?? null,
        numeroWhatsappBookshop: config?.numeroWhatsappBookshop ?? null,
      };
    },
  },

  Mutation: {
    async modifierConfigurationWhatsApp(
      _: unknown,
      {
        lienGroupeWhatsapp,
        numeroWhatsappBookshop,
      }: { lienGroupeWhatsapp?: string; numeroWhatsappBookshop?: string },
      ctx: GraphQLContext
    ) {
      requireSuperAdmin(ctx);

      const normalizedNumber = numeroWhatsappBookshop
        ? (numeroWhatsappBookshop.startsWith('0')
            ? `+243${numeroWhatsappBookshop.slice(1)}`
            : numeroWhatsappBookshop).trim()
        : null;

      const updated = await prisma.configurationApp.update({
        where: { id: 'GLOBAL_CONFIG' },
        data: {
          ...(lienGroupeWhatsapp !== undefined && { lienGroupeWhatsapp: lienGroupeWhatsapp ?? null }),
          ...(numeroWhatsappBookshop !== undefined && { numeroWhatsappBookshop: normalizedNumber }),
        },
      });

      return {
        lienGroupeWhatsapp: updated.lienGroupeWhatsapp,
        numeroWhatsappBookshop: updated.numeroWhatsappBookshop,
      };
    },
  },
};
