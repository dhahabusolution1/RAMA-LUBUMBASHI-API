import { sessionsService } from '../../services/sessions.service.js';
import { TypeSession, StatutInscription } from '@prisma/client';
import type { GraphQLContext } from '../../types/context.js';
import { requireAuth } from '../../middlewares/rbac.js';

export const sessionsResolvers = {
  Query: {
    getSessions: async (_: unknown, args: { type?: TypeSession }) => {
      return sessionsService.getSessions(args.type);
    },
    getSessionActive: async (_: unknown, args: { type: TypeSession }) => {
      return sessionsService.getSessionActive(args.type);
    },
    getInscriptions: async (_: unknown, args: { sessionId: string; search?: string }) => {
      return sessionsService.getInscriptions(args.sessionId, args.search);
    },
    getInscriptionById: async (_: unknown, args: { id: string }) => {
      return sessionsService.getInscriptionById(args.id);
    },
    verifierMatriculeEnrolement: async (_: unknown, args: { matricule: string }) => {
      return sessionsService.verifierMatriculeEnrolement(args.matricule);
    },
  },
  Mutation: {
    creerSession: async (_: unknown, args: { input: Record<string, unknown> }) => {
      return sessionsService.creerSession(args.input as Parameters<typeof sessionsService.creerSession>[0]);
    },
    modifierSession: async (_: unknown, args: { id: string; input: Record<string, unknown> }) => {
      return sessionsService.modifierSession(args.id, args.input as Parameters<typeof sessionsService.modifierSession>[1]);
    },
    supprimerSession: async (_: unknown, args: { id: string }) => {
      return sessionsService.supprimerSession(args.id);
    },
    preGenererMatricule: async (_: unknown, args: { sessionId: string }) => {
      return sessionsService.preGenererMatricule(args.sessionId);
    },
    soumettreInscription: async (_: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return sessionsService.soumettreInscription(user.id, args.input);
    },
    modifierStatutInscription: async (
      _: unknown,
      args: { id: string; statut: StatutInscription; matricule?: string; numeroCarteMembre?: string },
    ) => {
      return sessionsService.modifierStatutInscription(args.id, args.statut, {
        ...(args.matricule !== undefined && { matricule: args.matricule }),
        ...(args.numeroCarteMembre !== undefined && { numeroCarteMembre: args.numeroCarteMembre }),
      });
    },
  },
  InscriptionSession: {
    eglise: (parent: { eglise?: unknown }) => parent.eglise ?? null,
    departements: (parent: { departements?: unknown[] }) => parent.departements ?? [],
  },
  InscriptionDepartement: {
    departement: (parent: { departement?: unknown }) => parent.departement ?? null,
  },
};
