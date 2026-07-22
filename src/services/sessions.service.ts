import { TypeSession, StatutInscription, SessionFormulaire, InscriptionSession, Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import prisma from '../config/database.js';
import { envoyerNotificationParTelephone } from './notification.service.js';
import { logger } from '../utils/logger.js';
import {
  InscriptionBaptemeSchema,
  InscriptionMembreSchema,
  ModifierStatutInscriptionSchema,
} from '../validators/sessions.validator.js';

type InscriptionWithRelations = Prisma.InscriptionSessionGetPayload<{
  include: {
    eglise: true;
    departements: { include: { departement: true } };
    sessionFormulaire: true;
  };
}>;

const inscriptionInclude = {
  eglise: true,
  departements: {
    include: { departement: true },
    orderBy: { ordre: 'asc' as const },
  },
  sessionFormulaire: true,
};

function ajouterUnAn(date: Date): Date {
  const expireAt = new Date(date);
  expireAt.setFullYear(expireAt.getFullYear() + 1);
  return expireAt;
}

function extraireSequenceMatricule(matricule: string | null): number {
  if (!matricule) return 0;

  const nouveauFormat = matricule.match(/^ASV(\d+)$/i);
  if (nouveauFormat?.[1]) {
    return Number.parseInt(nouveauFormat[1], 10) || 0;
  }

  const ancienFormat = matricule.match(/^ASV-\d{4}-(\d+)$/i);
  if (ancienFormat?.[1]) {
    return Number.parseInt(ancienFormat[1], 10) || 0;
  }

  // Compatibilité si des matricules LPE existent encore en base de test
  const legacyFormat = matricule.match(/^LPE(\d+)$/i);
  if (legacyFormat?.[1]) {
    return Number.parseInt(legacyFormat[1], 10) || 0;
  }

  const legacyAncien = matricule.match(/^LPE-\d{4}-(\d+)$/i);
  if (legacyAncien?.[1]) {
    return Number.parseInt(legacyAncien[1], 10) || 0;
  }

  const suffixeNumerique = matricule.match(/(\d+)$/);
  return suffixeNumerique?.[1] ? Number.parseInt(suffixeNumerique[1], 10) || 0 : 0;
}

async function genererMatricule(): Promise<string> {
  const prefix = process.env['MATRICULE_PREFIX'] ?? 'ASV';

  const matricules = await prisma.inscriptionSession.findMany({
    where: { matricule: { startsWith: prefix } },
    select: { matricule: true },
  });

  const lastNum = matricules.reduce(
    (max, item) => Math.max(max, extraireSequenceMatricule(item.matricule)),
    0,
  );

  const next = lastNum + 1;
  const numberPart = String(next).padStart(7, '0');
  return `${prefix}${numberPart}`;
}

async function genererNumeroCarte(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CARTE-${year}-`;

  const last = await prisma.inscriptionSession.findFirst({
    where: { numeroCarteMembre: { startsWith: prefix } },
    orderBy: { numeroCarteMembre: 'desc' },
    select: { numeroCarteMembre: true },
  });

  const lastNum = last?.numeroCarteMembre
    ? parseInt(last.numeroCarteMembre.replace(prefix, ''), 10)
    : 0;

  return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}

export class SessionsService {
  async getSessions(type?: TypeSession): Promise<SessionFormulaire[]> {
    return prisma.sessionFormulaire.findMany({
      ...(type && { where: { type } }),
      orderBy: { createdAt: 'desc' },
      include: { inscriptions: true },
    });
  }

  async getSessionActive(type: TypeSession): Promise<SessionFormulaire | null> {
    const now = new Date();

    return prisma.sessionFormulaire.findFirst({
      where: {
        type,
        estActif: true,
        dateDebut: { lte: now },
        dateFin: { gte: now },
      },
      orderBy: { dateDebut: 'desc' },
    });
  }

  async getInscriptions(sessionId: string, search?: string): Promise<InscriptionWithRelations[]> {
    const whereClause: Prisma.InscriptionSessionWhereInput = {
      sessionFormulaireId: sessionId,
    };

    if (search && search.trim() !== '') {
      const query = search.trim();
      whereClause.OR = [
        { nom: { contains: query, mode: 'insensitive' } },
        { postnom: { contains: query, mode: 'insensitive' } },
        { prenom: { contains: query, mode: 'insensitive' } },
        { telephone: { contains: query, mode: 'insensitive' } },
        { telephone2: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { matricule: { contains: query, mode: 'insensitive' } },
        { numeroCarteMembre: { contains: query, mode: 'insensitive' } },
        { egliseNom: { contains: query, mode: 'insensitive' } },
        { profession: { contains: query, mode: 'insensitive' } },
        { adressePhysique: { contains: query, mode: 'insensitive' } },
        { ville: { contains: query, mode: 'insensitive' } },
        { commune: { contains: query, mode: 'insensitive' } },
        { quartier: { contains: query, mode: 'insensitive' } },
      ];
    }

    return prisma.inscriptionSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: inscriptionInclude,
    });
  }

  async getInscriptionById(id: string): Promise<InscriptionWithRelations | null> {
    return prisma.inscriptionSession.findUnique({
      where: { id },
      include: inscriptionInclude,
    });
  }

  async creerSession(input: Prisma.SessionFormulaireCreateInput): Promise<SessionFormulaire> {
    return prisma.sessionFormulaire.create({ data: input });
  }

  async modifierSession(id: string, input: Prisma.SessionFormulaireUpdateInput): Promise<SessionFormulaire> {
    return prisma.sessionFormulaire.update({ where: { id }, data: input });
  }

  async supprimerSession(id: string): Promise<boolean> {
    await prisma.sessionFormulaire.delete({ where: { id } });
    return true;
  }

  async soumettreInscription(userId: string, input: unknown): Promise<InscriptionWithRelations> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new GraphQLError('Utilisateur introuvable', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    const raw = input as { sessionFormulaireId: string };
    const session = await prisma.sessionFormulaire.findUnique({
      where: { id: raw.sessionFormulaireId },
    });

    if (!session) {
      throw new GraphQLError('Session introuvable', { extensions: { code: 'NOT_FOUND' } });
    }

    const now = new Date();
    if (!session.estActif || session.dateDebut > now || session.dateFin < now) {
      throw new GraphQLError('Cette session est fermée ou inactive', { extensions: { code: 'SESSION_CLOSED' } });
    }

    const exist = await prisma.inscriptionSession.findFirst({
      where: { sessionFormulaireId: raw.sessionFormulaireId, userId: user.id },
    });

    if (exist) {
      throw new GraphQLError('Vous êtes déjà inscrit à cette session', { extensions: { code: 'CONFLICT' } });
    }

    if (session.type === TypeSession.BAPTEME) {
      return this.soumettreInscriptionBapteme(user, session.id, input);
    }

    if (session.type === TypeSession.ENREGISTREMENT_MEMBRE) {
      return this.soumettreInscriptionMembre(user, session.id, input);
    }

    throw new GraphQLError('Type de session non supporté', { extensions: { code: 'BAD_REQUEST' } });
  }

  private async soumettreInscriptionBapteme(
    user: { id: string; nom: string; postnom: string | null; prenom: string | null; numeroWhatsapp: string | null },
    sessionId: string,
    input: unknown,
  ): Promise<InscriptionWithRelations> {
    const parsed = InscriptionBaptemeSchema.safeParse(input);
    if (!parsed.success) {
      throw new GraphQLError(parsed.error.issues[0]?.message ?? 'Données invalides', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const { adresse, egliseId } = parsed.data;

    return prisma.inscriptionSession.create({
      data: {
        sessionFormulaireId: sessionId,
        userId: user.id,
        nom: user.nom,
        postnom: user.postnom,
        prenom: user.prenom ?? '',
        telephone: user.numeroWhatsapp ?? '',
        ...(adresse != null && { adresse }),
        ...(egliseId != null && { egliseId }),
        statut: StatutInscription.EN_ATTENTE,
      },
      include: inscriptionInclude,
    });
  }

  async verifierMatriculeEnrolement(matricule: string): Promise<boolean> {
    const clean = matricule.trim();
    if (!clean) return false;

    // Doit exister, avoir le statut en_attente (c'est-à-carte pré-généré sans données utilisateur), et ne pas avoir de prenom associé
    const slot = await prisma.inscriptionSession.findUnique({
      where: { matricule: clean },
    });

    if (!slot) {
      throw new GraphQLError('Ce numéro matricule est inexistant ou invalide', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (slot.statut !== StatutInscription.EN_ATTENTE || slot.userId !== null) {
      throw new GraphQLError('Ce numéro matricule a déjà été utilisé pour un enrôlement', {
        extensions: { code: 'CONFLICT' },
      });
    }

    if (slot.matriculeExpireAt && slot.matriculeExpireAt <= new Date()) {
      throw new GraphQLError('Ce numéro matricule a expiré', {
        extensions: { code: 'EXPIRED' },
      });
    }

    return true;
  }

  async preGenererMatricule(sessionId: string): Promise<InscriptionWithRelations> {
    const session = await prisma.sessionFormulaire.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new GraphQLError('Session introuvable', { extensions: { code: 'NOT_FOUND' } });
    }

    const matricule = await genererMatricule();
    const numeroCarteMembre = await genererNumeroCarte();

    return prisma.inscriptionSession.create({
      data: {
        sessionFormulaireId: sessionId,
        matricule,
        numeroCarteMembre,
        matriculeExpireAt: ajouterUnAn(new Date()),
        nom: 'PRE_GENERE',
        prenom: 'PRE_GENERE',
        telephone: 'PRE_GENERE',
        statut: StatutInscription.EN_ATTENTE,
      },
      include: inscriptionInclude,
    });
  }

  private async soumettreInscriptionMembre(
    user: { id: string; nom: string; postnom: string | null; prenom: string | null; numeroWhatsapp: string | null },
    sessionId: string,
    input: unknown,
  ): Promise<InscriptionWithRelations> {
    const parsed = InscriptionMembreSchema.safeParse(input);
    if (!parsed.success) {
      throw new GraphQLError(parsed.error.issues[0]?.message ?? 'Données invalides', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const { profilMembre, matriculeSaisi } = parsed.data;
    const { departements, email, telephone2, captureFicheUrl, captureFichePublicId, egliseId: _egliseId, ...profil } = profilMembre;

    const slot = await prisma.inscriptionSession.findUnique({
      where: { matricule: matriculeSaisi.trim() },
    });

    if (!slot || slot.sessionFormulaireId !== sessionId) {
      throw new GraphQLError('Le numéro de matricule fourni est introuvable ou incorrect pour cette session', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (slot.statut !== StatutInscription.EN_ATTENTE || slot.userId !== null) {
      throw new GraphQLError('Ce numéro de matricule a déjà été utilisé ou complété par un autre membre', {
        extensions: { code: 'CONFLICT' },
      });
    }

    if (slot.matriculeExpireAt && slot.matriculeExpireAt <= new Date()) {
      throw new GraphQLError('Ce numéro de matricule a expiré', {
        extensions: { code: 'EXPIRED' },
      });
    }

    if (departements?.length) {
      for (const dep of departements) {
        if (dep.departementId) {
          const exists = await prisma.departement.findUnique({ where: { id: dep.departementId } });
          if (!exists) {
            throw new GraphQLError('Département introuvable', { extensions: { code: 'NOT_FOUND' } });
          }
        }
      }
    }

    const dateAdhesion = profil.dateAdhesion || new Date();

    return prisma.inscriptionSession.update({
      where: { id: slot.id },
      data: {
        userId: user.id,
        nom: user.nom,
        postnom: user.postnom,
        prenom: user.prenom ?? '',
        telephone: user.numeroWhatsapp ?? '',
        ...(telephone2 != null && { telephone2 }),
        ...(email && { email }),
        sexe: profil.sexe,
        dateNaissance: profil.dateNaissance,
        lieuNaissance: profil.lieuNaissance,
        etatCivil: profil.etatCivil,
        ...(profil.dateBapteme != null && { dateBapteme: profil.dateBapteme }),
        ...(profil.lieuBapteme != null && { lieuBapteme: profil.lieuBapteme }),
        dateAdhesion,
        matriculeExpireAt: ajouterUnAn(dateAdhesion),
        ...(profil.niveauEtudes != null && { niveauEtudes: profil.niveauEtudes }),
        ...(profil.profession != null && { profession: profil.profession }),
        adressePhysique: profil.adressePhysique,
        ...(profil.ville != null && { ville: profil.ville }),
        ...(profil.commune != null && { commune: profil.commune }),
        ...(profil.quartier != null && { quartier: profil.quartier }),
        egliseNom: profil.egliseNom.trim(),
        ...(captureFicheUrl != null && { captureFicheUrl }),
        ...(captureFichePublicId != null && { captureFichePublicId }),
        ...(profil.formationEglise != null && { formationEglise: profil.formationEglise }),
        ...(profil.autresSavoirFaire != null && { autresSavoirFaire: profil.autresSavoirFaire }),
        ...(profil.nomConjoint != null && { nomConjoint: profil.nomConjoint }),
        ...(profil.nombreEnfants != null && { nombreEnfants: profil.nombreEnfants }),
        statut: StatutInscription.VALIDE, // Valide directement à la soumission car lié au matricule pré-généré valide
        ...(departements?.length && {
          departements: {
            create: departements.map((dep, index) => ({
              ...(dep.departementId != null && { departementId: dep.departementId }),
              fonction: dep.fonction ?? null,
              depuis: dep.depuis ?? null,
              ordre: index + 1,
            })),
          },
        }),
      },
      include: inscriptionInclude,
    });
  }

  async modifierStatutInscription(
    id: string,
    statut: StatutInscription,
    options?: { matricule?: string | null; numeroCarteMembre?: string | null },
  ): Promise<InscriptionWithRelations> {
    const parsed = ModifierStatutInscriptionSchema.safeParse({ id, statut, ...options });
    if (!parsed.success) {
      throw new GraphQLError(parsed.error.issues[0]?.message ?? 'Données invalides', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const existing = await prisma.inscriptionSession.findUnique({
      where: { id },
      include: { sessionFormulaire: true },
    });

    if (!existing) {
      throw new GraphQLError('Inscription introuvable', { extensions: { code: 'NOT_FOUND' } });
    }

    const updateData: Prisma.InscriptionSessionUpdateInput = { statut };

    if (statut === StatutInscription.VALIDE) {
      if (existing.sessionFormulaire.type === TypeSession.ENREGISTREMENT_MEMBRE) {
        updateData.matricule = options?.matricule ?? existing.matricule ?? (await genererMatricule());
        updateData.numeroCarteMembre =
          options?.numeroCarteMembre ?? existing.numeroCarteMembre ?? (await genererNumeroCarte());
        updateData.dateAdhesion = existing.dateAdhesion ?? new Date();
        // When assigning/validating a matricule, ensure expiry date is set to one year from dateAdhesion
        const adhesion = existing.dateAdhesion ?? new Date();
        updateData.matriculeExpireAt = ajouterUnAn(adhesion);
      }
    }

    const updated = await prisma.inscriptionSession.update({
      where: { id },
      data: updateData,
      include: inscriptionInclude,
    });

    if (statut === StatutInscription.VALIDE || statut === StatutInscription.REFUSE) {
      const titre = `Inscription ${statut === StatutInscription.VALIDE ? 'validée' : 'refusée'}`;
      let body = `Votre inscription à la session « ${updated.sessionFormulaire.titre} » a été ${statut === StatutInscription.VALIDE ? 'validée' : 'refusée'}.`;

      if (statut === StatutInscription.VALIDE && updated.matricule) {
        body += ` Matricule : ${updated.matricule}.`;
      }

      envoyerNotificationParTelephone(updated.telephone, {
        title: titre,
        body,
        data: { type: 'INSCRIPTION_STATUT', inscriptionId: id },
      }).catch((err) => logger.error('Erreur push statut inscription', err));
    }

    return updated;
  }
}

export const sessionsService = new SessionsService();
