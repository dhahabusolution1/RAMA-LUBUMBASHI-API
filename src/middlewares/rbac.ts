import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types/context.js';
import type { User } from '@prisma/client';

/**
 * Verifie que l'utilisateur est authentifie.
 * Lance UNAUTHENTICATED si non connecte.
 */
export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new GraphQLError('Authentification requise', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

/**
 * Verifie que l'utilisateur a un des roles requis.
 * Lance FORBIDDEN si le role est insuffisant.
 */
export function requireRole(
  context: GraphQLContext,
  roles: Array<'SUPER_ADMIN' | 'ADMIN' | 'FIDELE'>
): User {
  const user = requireAuth(context);
  if (!roles.includes(user.role as 'SUPER_ADMIN' | 'ADMIN' | 'FIDELE')) {
    throw new GraphQLError('Acces refuse — droits insuffisants', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}

/**
 * Verifie que l'utilisateur est ADMIN ou SUPER_ADMIN.
 */
export function requireAdmin(context: GraphQLContext): User {
  return requireRole(context, ['ADMIN', 'SUPER_ADMIN']);
}

/**
 * Verifie que l'utilisateur est SUPER_ADMIN.
 */
export function requireSuperAdmin(context: GraphQLContext): User {
  return requireRole(context, ['SUPER_ADMIN']);
}
