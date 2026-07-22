import type { GraphQLContext } from '../../types/context.js';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';
import bcrypt from 'bcrypt';
import { GraphQLError } from 'graphql';

export const userResolvers = {
  Query: {
    async getUtilisateurs(
      _: unknown,
      { search, role, limit, offset }: { search?: string; role?: any; limit: number; offset: number },
      ctx: GraphQLContext
    ) {
      requireAdmin(ctx);
      
      const where: any = { deletedAt: null };
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { nom: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { numeroWhatsapp: { contains: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);

      return {
        items,
        pagination: {
          total,
          count: items.length,
          limit,
          offset,
          hasNextPage: offset + limit < total,
        },
      };
    },

    async getUtilisateurById(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return ctx.loaders.userById.load(id);
    },
  },

  Mutation: {
    async changerRoleUtilisateur(_: unknown, { id, role }: { id: string; role: any }, ctx: GraphQLContext) {
      const actor = requireSuperAdmin(ctx);
      
      if (actor.id === id) {
        throw new GraphQLError('Vous ne pouvez pas modifier votre propre role', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return prisma.user.update({
        where: { id },
        data: { role },
      });
    },

    async supprimerUtilisateur(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      const actor = requireAdmin(ctx);
      
      if (actor.id === id) {
        throw new GraphQLError('Vous ne pouvez pas vous supprimer vous-meme', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Soft delete
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return true;
    },

    async creerCompteAdmin(
      _: unknown,
      { email, motDePasse, nom, postnom, prenom, role }: any,
      ctx: GraphQLContext
    ) {
      requireSuperAdmin(ctx);

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new GraphQLError('Cet email est deja utilise', {
          extensions: { code: 'CONFLICT' },
        });
      }

      const motDePasseHash = await bcrypt.hash(motDePasse, 12);

      return prisma.user.create({
        data: {
          email,
          motDePasseHash,
          nom,
          postnom: postnom ?? null,
          prenom: prenom ?? null,
          role,
        },
      });
    },
  },
};
