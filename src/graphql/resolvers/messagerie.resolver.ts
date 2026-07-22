import type { GraphQLContext } from '../../types/context.js';
import { requireAuth, requireAdmin } from '../../middlewares/rbac.js';
import { 
  getMaConversation, 
  envoyerMessage, 
  marquerMessagesLus, 
  getMessagesNonLus 
} from '../../services/messagerie.service.js';
import prisma from '../../config/database.js';
import { redisPubSub, PUBSUB_CHANNELS } from '../pubsub.js';
import { GraphQLError } from 'graphql';

export const messagerieResolvers = {
  Query: {
    async maConversation(_: unknown, __: unknown, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      if (user.role !== 'FIDELE') {
        throw new GraphQLError('Seuls les fideles ont une conversation personnelle', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return getMaConversation(user.id);
    },

    async getConversations(_: unknown, { statut, limit, offset }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const where: any = {};
      if (statut) where.statut = statut;

      const [items, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
          include: { fidele: true, admin: true },
        }),
        prisma.conversation.count({ where }),
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

    async getMessages(_: unknown, { conversationId, limit, offset }: any, ctx: GraphQLContext) {
      requireAuth(ctx);
      // Optionnel : Verifier que l'utilisateur a acces a cette conversation
      return prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { expediteur: true },
      });
    },
  },

  Mutation: {
    async envoyerMessage(_: unknown, { conversationId, contenu }: any, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      return envoyerMessage(conversationId, user.id, contenu);
    },

    async marquerMessagesLus(_: unknown, { conversationId }: { conversationId: string }, ctx: GraphQLContext) {
      const user = requireAuth(ctx);
      await marquerMessagesLus(conversationId, user.id);
      return true;
    },

    async fermerConversation(_: unknown, { conversationId }: { conversationId: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.conversation.update({
        where: { id: conversationId },
        data: { statut: 'FERMEE' },
        include: { fidele: true, admin: true },
      });
    },

    async assignerAdmin(_: unknown, { conversationId, adminId }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.conversation.update({
        where: { id: conversationId },
        data: { adminId },
        include: { fidele: true, admin: true },
      });
    },
  },

  Subscription: {
    nouveauMessage: {
      subscribe: (_: unknown, { conversationId }: { conversationId: string }, ctx: GraphQLContext) => {
        // La verification d'acces se fait ici lors du handshake de subscription
        // requireAuth(ctx); // Le contexte doit etre populate par le connectionParams du WS
        return redisPubSub.asyncIterator(PUBSUB_CHANNELS.NEW_MESSAGE(conversationId));
      },
    },
  },

  Conversation: {
    async messagesNonLus(parent: any, _: unknown, ctx: GraphQLContext) {
      if (!ctx.user) return 0;
      return getMessagesNonLus(parent.id, ctx.user.id);
    },
    async messages(parent: any) {
      // Retourne les 50 derniers messages si non charges
      if (parent.messages) return parent.messages;
      return prisma.message.findMany({
        where: { conversationId: parent.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { expediteur: true },
      });
    },
  },
};
