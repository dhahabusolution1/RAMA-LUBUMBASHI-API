import { GraphQLError } from 'graphql';
import type { RendezVous, StatutRendezVous } from '@prisma/client';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import {
  parseDateOnly,
  todayInLubumbashi,
  isPastDate,
  isPastSlot,
  addDays,
} from '../utils/date.js';
import { 
  envoyerNotificationUtilisateur, 
  envoyerNotificationParTelephone,
  enregistrerEtNotifierFidele 
} from './notification.service.js';

const STATUTS_RDV_NOTIFIABLES = new Set<StatutRendezVous>(['CONFIRME', 'EFFECTUE', 'ANNULE']);

export const HEURES_DISPONIBLES = [
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
] as const;

const MAX_RDV_PAR_JOUR = HEURES_DISPONIBLES.length;

type CreneauHoraire = { heure: string; disponible: boolean };

function buildCreneaux(date: Date, heuresPrises: Set<string>, estComplet: boolean): CreneauHoraire[] {
  return HEURES_DISPONIBLES.map((heure) => ({
    heure,
    disponible:
      !estComplet &&
      !heuresPrises.has(heure) &&
      !isPastDate(date) &&
      !isPastSlot(date, heure),
  }));
}

function buildDisponibilite(date: Date, heuresPrises: Set<string>, count: number) {
  const estComplet = count >= MAX_RDV_PAR_JOUR;
  const creneaux = buildCreneaux(date, heuresPrises, estComplet);
  const heuresDisponibles = creneaux.filter((c) => c.disponible).map((c) => c.heure);

  return {
    date,
    slotsRestants: Math.max(0, MAX_RDV_PAR_JOUR - count),
    estComplet: estComplet || isPastDate(date),
    heuresDisponibles,
    heuresPrises: [...heuresPrises],
    creneaux,
  };
}

async function loadDisponibiliteJour(date: Date) {
  const rdvExistants = await prisma.rendezVous.findMany({
    where: {
      date,
      statut: { not: 'ANNULE' },
    },
    select: { heure: true },
  });

  const heuresPrises = new Set(rdvExistants.map((r) => r.heure));
  return buildDisponibilite(date, heuresPrises, rdvExistants.length);
}

function buildRdvNotification(statut: StatutRendezVous, rdv: RendezVous & { user?: any }) {
  const dateStr = rdv.date.toLocaleDateString('fr-FR', { timeZone: 'Africa/Lubumbashi' });
  const nomPersonne = [rdv.prenomVisiteur, rdv.nomVisiteur].filter(Boolean).join(' ') || (rdv.user ? [rdv.user.prenom, rdv.user.nom].filter(Boolean).join(' ') : '') || 'Fidèle';

  switch (statut) {
    case 'CONFIRME':
      return {
        title: 'Rendez-vous pastoral confirmé',
        body: `Shalom bien-aimé (e) ${nomPersonne} que la paix du Seigneur soit avec vous! Nous vous confirmons votre rendez-vous du ${dateStr} à ${rdv.heure}\nQue le Seigneur vous bénisse.`,
      };
    case 'ANNULE':
      const motifStr = rdv.motif ? ` (motif: ${rdv.motif})` : '';
      return {
        title: 'Rendez-vous pastoral annulé',
        body: `Shalom bien-aimé (e) ${nomPersonne} que la paix du Seigneur soit avec vous! votre rendez-vous du ${dateStr} à ${rdv.heure} a été annulé${motifStr}\nQue le Seigneur vous bénisse.`,
      };
    case 'EFFECTUE':
      return {
        title: 'Rendez-vous pastoral effectué',
        body: `Shalom bien-aimé (e) ${nomPersonne} que la paix du Seigneur soit avec vous! Votre rendez-vous du ${dateStr} à ${rdv.heure} a bien été effectué et est marqué comme terminé.\nQue le Seigneur vous bénisse.`,
      };
    default:
      return {
        title: 'Mise à jour de votre rendez-vous pastoral',
        body: `Statut de votre rendez-vous du ${dateStr} à ${rdv.heure} mis à jour : ${statut}.\nQue le Seigneur vous bénisse.`,
      };
  }
}

function notifierChangementStatutRdv(rdv: RendezVous, rdvId: string, statut: StatutRendezVous): void {
  const { title, body } = buildRdvNotification(statut, rdv);

  enregistrerEtNotifierFidele({
    userId: rdv.userId || null,
    telephoneDest: rdv.whatsappVisiteur || null,
    titre: title,
    corps: body,
    type: `RENDEZVOUS_${statut}`,
    metaId: rdvId,
  }).catch((err) => logger.error('Erreur push statut rdv persistee', err));
}

export async function getDisponibiliteJour(dateInput: string | Date) {
  const date = parseDateOnly(dateInput);
  return loadDisponibiliteJour(date);
}

export async function getDisponibilitesPeriode(dateDebutInput: string | Date, dateFinInput: string | Date) {
  const dateDebut = parseDateOnly(dateDebutInput);
  const dateFin = parseDateOnly(dateFinInput);

  if (dateFin.getTime() < dateDebut.getTime()) {
    throw new GraphQLError('dateFin doit être postérieure ou égale à dateDebut', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const maxDays = 62;
  const diffDays = Math.round((dateFin.getTime() - dateDebut.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays > maxDays) {
    throw new GraphQLError(`La période ne peut pas dépasser ${maxDays} jours`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const results = [];
  let cursor = dateDebut;
  while (cursor.getTime() <= dateFin.getTime()) {
    results.push(await loadDisponibiliteJour(cursor));
    cursor = addDays(cursor, 1);
  }
  return results;
}

export async function getProchainJourDisponible(): Promise<Date> {
  const today = todayInLubumbashi();

  for (let i = 0; i < 60; i++) {
    const date = addDays(today, i);
    const dispo = await loadDisponibiliteJour(date);
    if (dispo.heuresDisponibles.length > 0) {
      return date;
    }
  }

  throw new GraphQLError(
    'Aucun créneau disponible dans les 60 prochains jours',
    { extensions: { code: 'NOT_FOUND' } }
  );
}

export async function prendreRendezVous(
  userId: string,
  dateInput: string | Date,
  heure: string,
  motif: string
) {
  const date = parseDateOnly(dateInput);

  if (!HEURES_DISPONIBLES.includes(heure as (typeof HEURES_DISPONIBLES)[number])) {
    throw new GraphQLError(
      `Heure invalide. Heures disponibles : ${HEURES_DISPONIBLES.join(', ')}`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }

  if (isPastDate(date)) {
    throw new GraphQLError('Impossible de réserver une date passée', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (isPastSlot(date, heure)) {
    throw new GraphQLError('Ce créneau horaire est déjà passé', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return prisma.$transaction(async (tx) => {
    const dispo = await tx.rendezVous.findMany({
      where: { date, statut: { not: 'ANNULE' } },
      select: { heure: true },
    });

    const heuresPrises = new Set(dispo.map((r) => r.heure));

    if (heuresPrises.has(heure)) {
      throw new GraphQLError('Ce créneau horaire est déjà réservé', {
        extensions: { code: 'CONFLICT' },
      });
    }

    if (dispo.length >= MAX_RDV_PAR_JOUR) {
      throw new GraphQLError(
        'La limite de rendez-vous pour ce jour est atteinte',
        { extensions: { code: 'CONFLICT' } }
      );
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new GraphQLError('Utilisateur introuvable', { extensions: { code: 'UNAUTHENTICATED' } });
    }

    try {
      return await tx.rendezVous.create({
        data: {
          userId,
          date,
          heure,
          motif: motif.trim(),
          nomVisiteur: user.nom,
          prenomVisiteur: user.prenom,
          whatsappVisiteur: user.numeroWhatsapp || '',
        },
        include: { user: true },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new GraphQLError(
          'Ce créneau horaire est déjà réservé',
          { extensions: { code: 'CONFLICT' } }
        );
      }
      throw error;
    }
  });
}

export async function updateStatutRendezVous(id: string, statut: string) {
  const rdv = await prisma.rendezVous.findUnique({ where: { id } });
  if (!rdv) {
    throw new GraphQLError('Rendez-vous introuvable', { extensions: { code: 'NOT_FOUND' } });
  }

  const statutNotifiable = statut as StatutRendezVous;
  const updated = await prisma.rendezVous.update({
    where: { id },
    data: { statut: statutNotifiable },
    include: { user: true },
  });

  if (rdv.statut !== statutNotifiable && STATUTS_RDV_NOTIFIABLES.has(statutNotifiable)) {
    notifierChangementStatutRdv(updated, id, statutNotifiable);
  }

  logger.info('Statut RDV modifié', { id, statut });
  return updated;
}
