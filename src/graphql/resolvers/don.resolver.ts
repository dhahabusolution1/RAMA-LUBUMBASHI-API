import type { GraphQLContext } from '../../types/context.js';
import { requireAuth, requireAdmin } from '../../middlewares/rbac.js';
import { GraphQLError } from 'graphql';
import prisma from '../../config/database.js';
import { initierDon } from '../../services/don.service.js';
import { phoneOptionalSchema, normalizePhone } from '../../validators/phone.validator.js';
import type { StatutDon } from '@prisma/client';

function validateTelephone(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const result = phoneOptionalSchema.safeParse(value);
  if (!result.success) {
    throw new GraphQLError(`telephone : ${result.error.issues[0]?.message}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return normalizePhone(value);
}

async function getDonAutorise(id: string, ctx: GraphQLContext) {
  const user = requireAuth(ctx);
  const don = await prisma.donTransaction.findUnique({
    where: { id },
    include: { user: { select: { id: true, nom: true, prenom: true, numeroWhatsapp: true } } },
  });
  if (!don) return null;

  const isOwner = don.userId === user.id;
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  if (!isOwner && !isAdmin) {
    throw new GraphQLError('Accès refusé', { extensions: { code: 'FORBIDDEN' } });
  }

  return don;
}

export const donResolvers = {
  DonTransaction: {
    user(parent: { userId?: string | null; user?: { id: string; nom: string; prenom: string | null; numeroWhatsapp: string | null } | null }) {
      if (parent.user) return parent.user;
      return null;
    },
  },

  Query: {
    async getMesDons(_: unknown, { limit, offset }: { limit: number; offset: number }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const where = { userId: user.id };

      const [items, totalCount] = await Promise.all([
        prisma.donTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: { user: { select: { id: true, nom: true, prenom: true, numeroWhatsapp: true } } },
        }),
        prisma.donTransaction.count({ where }),
      ]);

      return { items, totalCount };
    },

    async getDon(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      return getDonAutorise(id, ctx);
    },

    async getDonParReference(_: unknown, { reference }: { reference: string }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const don = await prisma.donTransaction.findUnique({
        where: { reference },
        include: { user: { select: { id: true, nom: true, prenom: true, numeroWhatsapp: true } } },
      });
      if (!don) return null;

      const isOwner = don.userId === user.id;
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) {
        throw new GraphQLError('Accès refusé', { extensions: { code: 'FORBIDDEN' } });
      }

      return don;
    },

    async getDonsAdmin(
      _: unknown,
      { statut, limit, offset }: { statut?: StatutDon; limit: number; offset: number },
      ctx: GraphQLContext,
    ) {
      requireAdmin(ctx);
      const where = statut ? { statut } : {};

      const [items, totalCount] = await Promise.all([
        prisma.donTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: { user: { select: { id: true, nom: true, prenom: true, numeroWhatsapp: true } } },
        }),
        prisma.donTransaction.count({ where }),
      ]);

      return { items, totalCount };
    },
  },

  Mutation: {
    async initierDon(_: unknown, { input }: { input: any }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);

      try {
        const result = await initierDon(user.id, user.numeroWhatsapp, {
          montant: Number(input.montant),
          devise: input.devise,
          message: input.message,
          telephone: validateTelephone(input.telephone),
        });

        return {
          transactionId: result.transaction.id,
          reference: result.transaction.reference,
          paymentUrl: result.paymentUrl,
          statut: result.transaction.statut,
        };
      } catch (error) {
        throw new GraphQLError(
          error instanceof Error ? error.message : 'Impossible d’initier le don',
          { extensions: { code: 'PAYMENT_INIT_FAILED' } },
        );
      }
    },
  },
};
