import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { normalizePhone } from '../validators/phone.validator.js';
import type { JwtPayload } from '../types/context.js';

const BCRYPT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET non configure');
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env['JWT_REFRESH_SECRET'];
  if (!secret) throw new Error('JWT_REFRESH_SECRET non configure');
  return secret;
}

function generateTokenPair(userId: string, role: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { userId, role },
    getJwtSecret(),
    { expiresIn: process.env['JWT_ACCESS_EXPIRY'] ?? '15m' } as jwt.SignOptions
  );
  const refreshToken = jwt.sign(
    { userId, role },
    getJwtRefreshSecret(),
    { expiresIn: process.env['JWT_REFRESH_EXPIRY'] ?? '30d' } as jwt.SignOptions
  );
  return { accessToken, refreshToken };
}

/**
 * Verifie un access token JWT et retourne le payload decode.
 * Lance une GraphQLError si le token est invalide ou expire.
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    throw new GraphQLError('Token invalide ou expire', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

/**
 * Inscription d'un nouveau fidele.
 */
export async function registerFidele(input: {
  nom: string;
  postnom?: string | undefined;
  prenom?: string | undefined;
  numeroWhatsapp: string;
  motDePasse: string;
}) {
  const numeroWhatsapp = normalizePhone(input.numeroWhatsapp);
  const numeroLocal = numeroWhatsapp.startsWith('+243')
    ? `0${numeroWhatsapp.slice(4)}`
    : numeroWhatsapp;

  const existing = await prisma.user.findFirst({
    where: {
      numeroWhatsapp: { in: [numeroWhatsapp, numeroLocal] },
      deletedAt: null,
    },
  });

  if (existing) {
    throw new GraphQLError('Ce numéro WhatsApp est déjà utilisé', {
      extensions: { code: 'CONFLICT' },
    });
  }

  const motDePasseHash = await bcrypt.hash(input.motDePasse, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      nom: input.nom.trim(),
      postnom: input.postnom?.trim() || null,
      prenom: input.prenom?.trim() || null,
      numeroWhatsapp,
      motDePasseHash,
      role: 'FIDELE',
    },
  });

  logger.info('Nouveau fidele inscrit', { userId: user.id });
  return { ...generateTokenPair(user.id, user.role), user };
}

/**
 * Connexion d'un fidele via numero WhatsApp et mot de passe.
 */
export async function loginFidele(numeroWhatsapp: string, motDePasse: string) {
  const normalized = normalizePhone(numeroWhatsapp);
  const local = normalized.startsWith('+243') ? `0${normalized.slice(4)}` : normalized;

  const user = await prisma.user.findFirst({
    where: {
      numeroWhatsapp: { in: [normalized, local, numeroWhatsapp] },
      deletedAt: null,
    },
  });

  if (!user || !user.motDePasseHash) {
    throw new GraphQLError('Identifiants invalides', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const isValid = await bcrypt.compare(motDePasse, user.motDePasseHash);
  if (!isValid) {
    throw new GraphQLError('Identifiants invalides', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  logger.info('Fidele connecte', { userId: user.id });
  return { ...generateTokenPair(user.id, user.role), user };
}

/**
 * Connexion d'un administrateur via email et mot de passe.
 */
export async function loginAdmin(email: string, motDePasse: string) {
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
  });

  if (!user || !user.motDePasseHash) {
    throw new GraphQLError('Identifiants invalides', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  if (user.role === 'FIDELE') {
    throw new GraphQLError('Acces refuse — utilisez la connexion fidele', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  const isValid = await bcrypt.compare(motDePasse, user.motDePasseHash);
  if (!isValid) {
    throw new GraphQLError('Identifiants invalides', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  logger.info('Admin connecte', { userId: user.id, role: user.role });
  return { ...generateTokenPair(user.id, user.role), user };
}

/**
 * Renouvelle les tokens a partir d'un refresh token valide.
 */
export async function refreshUserToken(refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, getJwtRefreshSecret()) as JwtPayload;
  } catch {
    throw new GraphQLError('Refresh token invalide ou expire', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, deletedAt: null },
  });

  if (!user) {
    throw new GraphQLError('Utilisateur introuvable', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  return { ...generateTokenPair(user.id, user.role), user };
}

/**
 * Change le mot de passe d'un utilisateur apres verification de l'ancien.
 */
export async function changeMotDePasse(
  userId: string,
  ancienMotDePasse: string,
  nouveauMotDePasse: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.motDePasseHash) {
    throw new GraphQLError('Utilisateur introuvable', { extensions: { code: 'NOT_FOUND' } });
  }

  const isValid = await bcrypt.compare(ancienMotDePasse, user.motDePasseHash);
  if (!isValid) {
    throw new GraphQLError('Ancien mot de passe incorrect', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const newHash = await bcrypt.hash(nouveauMotDePasse, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { motDePasseHash: newHash },
  });
}

/**
 * Suppression du compte de l'utilisateur connecte (Guideline Apple 5.1.1v).
 * Soft-delete + anonymisation PII + liberation des identifiants uniques + purge FCM.
 */
export async function supprimerMonCompte(userId: string, motDePasse: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user?.motDePasseHash) {
    throw new GraphQLError('Utilisateur introuvable', { extensions: { code: 'NOT_FOUND' } });
  }

  const isValid = await bcrypt.compare(motDePasse, user.motDePasseHash);
  if (!isValid) {
    throw new GraphQLError('Mot de passe incorrect', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (user.role === 'SUPER_ADMIN') {
    throw new GraphQLError(
      'Un Super Admin ne peut pas supprimer son compte depuis l’application. Contactez un autre Super Admin.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }

  await prisma.$transaction([
    prisma.fcmToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        nom: 'Compte supprimé',
        postnom: null,
        prenom: null,
        email: null,
        numeroWhatsapp: null,
        photoUrl: null,
        motDePasseHash: null,
      },
    }),
  ]);

  logger.info('Compte utilisateur supprime', { userId, role: user.role });
}
