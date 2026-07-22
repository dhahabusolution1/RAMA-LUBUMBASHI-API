import type { GraphQLContext } from '../../types/context.js';
import { requireSuperAdmin } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';
import { getCachedEglises, getCachedDepartements, invalidateEglisesCache, invalidateDepartementsCache } from '../../services/cache.service.js';
import { phoneOptionalSchema, normalizePhone } from '../../validators/phone.validator.js';
import { GraphQLError } from 'graphql';

/** Valide et normalise un champ telephone optionnel. Leve une GraphQLError si invalide. */
function validatePhone(value: string | undefined | null, champ: string): string | undefined | null {
  if (!value) return value;
  const result = phoneOptionalSchema.safeParse(value);
  if (!result.success) {
    throw new GraphQLError(`${champ} : ${result.error.issues[0]?.message}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return normalizePhone(value);
}

export const egliseResolvers = {
  Query: {
    async getEglises() {
      return getCachedEglises();
    },
    async getEgliseById(_: unknown, { id }: { id: string }) {
      return prisma.eglise.findUnique({
        where: { id },
        include: { cellules: true },
      });
    },
    async getCellules(_: unknown, { egliseId }: { egliseId?: string }) {
      const where: any = {};
      if (egliseId) where.egliseId = egliseId;
      return prisma.cellule.findMany({ where, include: { eglise: true } });
    },
    async getDepartements() {
      return getCachedDepartements();
    },
  },

  Mutation: {
    async creerEglise(_: unknown, input: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      if (input.telephone) input.telephone = validatePhone(input.telephone, 'telephone');
      const eglise = await prisma.eglise.create({ data: input });
      await invalidateEglisesCache();
      return eglise;
    },
    async modifierEglise(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      if (data.telephone) data.telephone = validatePhone(data.telephone, 'telephone');
      const eglise = await prisma.eglise.update({ where: { id }, data });
      await invalidateEglisesCache();
      return eglise;
    },
    async supprimerEglise(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      await prisma.eglise.delete({ where: { id } });
      await invalidateEglisesCache();
      return true;
    },

    // ── Cellules ─────────────────────────────────────────────
    async creerCellule(_: unknown, input: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      if (input.telephone1) input.telephone1 = validatePhone(input.telephone1, 'telephone1');
      if (input.telephone2) input.telephone2 = validatePhone(input.telephone2, 'telephone2');
      const cellule = await prisma.cellule.create({ data: input, include: { eglise: true } });
      await invalidateEglisesCache();
      return cellule;
    },
    async modifierCellule(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      if (data.telephone1) data.telephone1 = validatePhone(data.telephone1, 'telephone1');
      if (data.telephone2) data.telephone2 = validatePhone(data.telephone2, 'telephone2');
      const cellule = await prisma.cellule.update({ where: { id }, data, include: { eglise: true } });
      await invalidateEglisesCache();
      return cellule;
    },
    async supprimerCellule(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      await prisma.cellule.delete({ where: { id } });
      await invalidateEglisesCache();
      return true;
    },

    // ── Départements ──────────────────────────────────────────
    async creerDepartement(_: unknown, input: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      const dep = await prisma.departement.create({ data: input });
      await invalidateDepartementsCache();
      return dep;
    },
    async modifierDepartement(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      const dep = await prisma.departement.update({ where: { id }, data });
      await invalidateDepartementsCache();
      return dep;
    },
    async supprimerDepartement(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      await prisma.departement.delete({ where: { id } });
      await invalidateDepartementsCache();
      return true;
    },
  },

  Eglise: {
    async cellules(parent: any) {
      return prisma.cellule.findMany({ where: { egliseId: parent.id } });
    },
  },
};
