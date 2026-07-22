import DataLoader from 'dataloader';
import type { User } from '@prisma/client';
import prisma from '../../config/database.js';

/**
 * DataLoader pour les utilisateurs par ID.
 * Groupe toutes les requetes d'un meme tick d'execution en une seule requete SQL.
 * Eliminates le probleme N+1 sur les champs User dans les resolvers.
 */
export function createUserLoader(): DataLoader<string, User | null> {
  return new DataLoader<string, User | null>(
    async (ids: readonly string[]) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });

      const userMap = new Map(users.map((u: User) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? null);
    },
    { cache: true }
  );
}

/**
 * Cree tous les DataLoaders pour un cycle de requete GraphQL.
 * Appele une fois par requete dans la fonction de contexte d'Apollo Server.
 */
export function createLoaders() {
  return {
    userById: createUserLoader(),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
