import type { GraphQLContext } from '../../types/context.js';
import {
  registerFidele,
  loginFidele,
  loginAdmin,
  refreshUserToken,
  changeMotDePasse,
} from '../../services/auth.service.js';
import { enregistrerFcmToken } from '../../services/notification.service.js';
import { requireAuth } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';
import { z } from 'zod';
import { phoneSchema, normalizePhone } from '../../validators/phone.validator.js';

const registerSchema = z.object({
  nom: z.string().min(1).max(100),
  postnom: z.string().max(100).optional(),
  prenom: z.string().max(100).optional(),
  numeroWhatsapp: phoneSchema,
  motDePasse: z.string().min(8, 'Minimum 8 caracteres'),
});

export const authResolvers = {
  Mutation: {
    async registerFidele(_: unknown, { input }: { input: unknown }, _ctx: GraphQLContext) {
      const validated = registerSchema.parse(input);
      return registerFidele({
        ...validated,
        numeroWhatsapp: normalizePhone(validated.numeroWhatsapp),
      });
    },

    async loginFidele(
      _: unknown,
      { numeroWhatsapp, motDePasse }: { numeroWhatsapp: string; motDePasse: string }
    ) {
      // Normalise 0XXXXXXXXX → +243XXXXXXXXX avant la recherche en base
      return loginFidele(normalizePhone(numeroWhatsapp), motDePasse);
    },

    async loginAdmin(
      _: unknown,
      { email, motDePasse }: { email: string; motDePasse: string }
    ) {
      return loginAdmin(email, motDePasse);
    },

    async refreshToken(_: unknown, { refreshToken }: { refreshToken: string }) {
      return refreshUserToken(refreshToken);
    },

    async updateProfil(
      _: unknown,
      { input }: { input: Record<string, string> },
      ctx: GraphQLContext
    ) {
      const user = requireAuth(ctx);
      const rawNumero = input['numeroWhatsapp'];
      if (rawNumero) {
        phoneSchema.parse(rawNumero);
      }
      return prisma.user.update({
        where: { id: user.id },
        data: {
          ...(input['nom'] && { nom: input['nom'] }),
          postnom: input['postnom'] ?? null,
          prenom: input['prenom'] ?? null,
          photoUrl: input['photoUrl'] ?? null,
          ...(rawNumero && { numeroWhatsapp: normalizePhone(rawNumero) }),
        },
      });
    },

    async changeMotDePasse(
      _: unknown,
      { ancienMotDePasse, nouveauMotDePasse }: { ancienMotDePasse: string; nouveauMotDePasse: string },
      ctx: GraphQLContext
    ) {
      const user = requireAuth(ctx);
      await changeMotDePasse(user.id, ancienMotDePasse, nouveauMotDePasse);
      return true;
    },

    async updateFcmToken(
      _: unknown,
      { token, plateforme }: { token: string; plateforme: 'IOS' | 'ANDROID' },
      ctx: GraphQLContext
    ) {
      await enregistrerFcmToken(token, plateforme, ctx.user?.id);
      return true;
    },
  },
};
