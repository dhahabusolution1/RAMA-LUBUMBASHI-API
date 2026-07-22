import type { GraphQLContext } from '../../types/context.js';
import { requireAuth, requireAdmin } from '../../middlewares/rbac.js';
import {
  getDisponibiliteJour,
  getDisponibilitesPeriode,
  getProchainJourDisponible,
  prendreRendezVous,
  updateStatutRendezVous,
} from '../../services/rendezvous.service.js';
import { PrendreRendezVousSchema } from '../../validators/rendezvous.validator.js';
import prisma from '../../config/database.js';

export const rendezvousResolvers = {
  Query: {
    async getDisponibiliteJour(_: unknown, { date }: { date: string }) {
      return getDisponibiliteJour(date);
    },

    async getDisponibilitesPeriode(
      _: unknown,
      { dateDebut, dateFin }: { dateDebut: string; dateFin: string }
    ) {
      return getDisponibilitesPeriode(dateDebut, dateFin);
    },

    async getProchainJourDisponible() {
      return getProchainJourDisponible();
    },

    async mesRendezVous(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return prisma.rendezVous.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
      });
    },

    async getRendezVous(_: unknown, params: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const where: any = {};
      if (params.statut) where.statut = params.statut;
      if (params.dateDebut || params.dateFin) {
        where.date = {};
        if (params.dateDebut) where.date.gte = new Date(params.dateDebut);
        if (params.dateFin) where.date.lte = new Date(params.dateFin);
      }
      if (params.search) {
        where.OR = [
          { nomVisiteur: { contains: params.search, mode: 'insensitive' } },
          { whatsappVisiteur: { contains: params.search } },
          {
            user: {
              OR: [
                { nom: { contains: params.search, mode: 'insensitive' } },
                { numeroWhatsapp: { contains: params.search } },
              ],
            },
          },
        ];
      }

      return prisma.rendezVous.findMany({
        where,
        orderBy: { date: 'desc' },
        take: params.limit,
        skip: params.offset,
        include: { user: true },
      });
    },
  },

  Mutation: {
    async prendreRendezVous(_: unknown, args: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      const validated = PrendreRendezVousSchema.parse(args);

      return prendreRendezVous(
        user.id,
        validated.date,
        validated.heure,
        validated.motif
      );
    },

    async updateStatutRendezVous(_: unknown, { id, statut }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return updateStatutRendezVous(id, statut);
    },
  },
};
