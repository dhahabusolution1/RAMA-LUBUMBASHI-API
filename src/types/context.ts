import type { PrismaClient } from '@prisma/client';
import type DataLoader from 'dataloader';
import type { User } from '@prisma/client';

/**
 * Payload extrait du JWT apres verification.
 */
export interface JwtPayload {
  userId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FIDELE';
  iat: number;
  exp: number;
}

/**
 * Contexte GraphQL injecte dans chaque resolver.
 * L'utilisateur est null pour les requetes publiques non authentifiees.
 */
export interface GraphQLContext {
  /** Utilisateur authentifie, ou null si la requete est publique */
  user: User | null;
  /** Client Prisma */
  db: PrismaClient;
  /** DataLoaders pour l'optimisation N+1 */
  loaders: {
    userById: DataLoader<string, User | null>;
  };
  /** Adresse IP du client (pour le rate limiting) */
  clientIp: string;
}
