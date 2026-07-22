import type { GraphQLContext } from '../../types/context.js';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';
import { phoneOptionalSchema, normalizePhone } from '../../validators/phone.validator.js';
import { GraphQLError } from 'graphql';

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

export const bookshopResolvers = {
  Query: {
    async getArticles(_: unknown, { categorie, typeArticle, limit, offset }: any) {
      const where: any = { estDisponible: true };
      if (categorie) where.categorie = categorie;
      if (typeArticle) where.typeArticle = typeArticle;

      const [items, totalCount] = await Promise.all([
        prisma.articleBookshop.findMany({
          where,
          orderBy: { titre: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.articleBookshop.count({ where }),
      ]);
      return { items, totalCount };
    },

    async getArticlesAdmin(_: unknown, { search, categorie, typeArticle, limit, offset }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const where: any = {};
      if (categorie) where.categorie = categorie;
      if (typeArticle) where.typeArticle = typeArticle;
      
      if (search) {
        where.OR = [
          { titre: { contains: search, mode: 'insensitive' } },
          { auteur: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, totalCount] = await Promise.all([
        prisma.articleBookshop.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.articleBookshop.count({ where }),
      ]);
      return { items, totalCount };
    },

    async getConfigurationDons() {
      const config = await prisma.configurationApp.findUnique({
        where: { id: 'GLOBAL_CONFIG' },
        include: { coordonneesDons: { orderBy: { ordre: 'asc' } } },
      });

      return {
        numeroWhatsappContact: config?.numeroWhatsappContact,
        coordonnees: config?.coordonneesDons ?? [],
      };
    },
  },

  Mutation: {
    async creerArticle(_: unknown, input: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      if (input.numeroWhatsappAchat) {
        input.numeroWhatsappAchat = validatePhone(input.numeroWhatsappAchat, 'numeroWhatsappAchat');
      }
      return prisma.articleBookshop.create({ data: input });
    },

    async modifierArticle(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      if (data.numeroWhatsappAchat) {
        data.numeroWhatsappAchat = validatePhone(data.numeroWhatsappAchat, 'numeroWhatsappAchat');
      }
      return prisma.articleBookshop.update({ where: { id }, data });
    },

    async supprimerArticle(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.articleBookshop.delete({ where: { id } });
      return true;
    },

    async signalerVente(_: unknown, { id, quantite }: { id: string, quantite: number }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const article = await prisma.articleBookshop.findUnique({ where: { id } });
      if (!article) {
        throw new GraphQLError(`Article non trouvé`, { extensions: { code: 'NOT_FOUND' } });
      }
      if (article.stock < quantite) {
        throw new GraphQLError(`Stock insuffisant. Actuel: ${article.stock}`, { extensions: { code: 'BAD_USER_INPUT' } });
      }

      return prisma.articleBookshop.update({
        where: { id },
        data: {
          stock: { decrement: quantite },
          ventes: { increment: quantite },
        }
      });
    },

    async modifierConfigurationDons(_: unknown, { numeroWhatsappContact, coordonnees }: any, ctx: GraphQLContext) {
      requireSuperAdmin(ctx);
      const numeroNormalise = validatePhone(numeroWhatsappContact, 'numeroWhatsappContact');

      return prisma.$transaction(async (tx: any) => {
        // Mettre a jour le numero WhatsApp
        const config = await tx.configurationApp.update({
          where: { id: 'GLOBAL_CONFIG' },
          data: { numeroWhatsappContact: numeroNormalise },
        });

        if (coordonnees) {
          // Purger et recreer les coordonnees
          await tx.coordonneesDon.deleteMany({ where: { configId: 'GLOBAL_CONFIG' } });
          await tx.coordonneesDon.createMany({
            data: coordonnees.map((c: any) => ({ ...c, configId: 'GLOBAL_CONFIG' })),
          });
        }

        const updatedConfig = await tx.configurationApp.findUnique({
          where: { id: 'GLOBAL_CONFIG' },
          include: { coordonneesDons: { orderBy: { ordre: 'asc' } } },
        });

        return {
          numeroWhatsappContact: updatedConfig?.numeroWhatsappContact,
          coordonnees: updatedConfig?.coordonneesDons ?? [],
        };
      });
    },
  },

  ArticleBookshop: {
    async whatsappAchatUrl(parent: any) {
      const config = await prisma.configurationApp.findUnique({
        where: { id: 'GLOBAL_CONFIG' },
        select: { numeroWhatsappBookshop: true, numeroWhatsappContact: true },
      });
      const numero = parent.numeroWhatsappAchat || config?.numeroWhatsappBookshop || config?.numeroWhatsappContact || '';
      const text = encodeURIComponent(`Je suis intéresse par l'article : ${parent.titre}`);
      return `https://wa.me/${numero.replace(/\+/g, '')}?text=${text}`;
    },
  },
};
