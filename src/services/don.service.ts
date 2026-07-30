import { StatutDon, type Devise, type Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { getMaxicashConfig } from '../config/maxicash.js';
import {
  buildMaxicashAmount,
  getMaxicashCallbackUrls,
  initiatePayEntryWeb,
} from './maxicash.service.js';
import { randomBytes } from 'crypto';

export interface InitierDonInput {
  montant: number;
  devise?: Devise;
  message?: string | null;
  telephone?: string | null | undefined;
}

function generateReference(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `RAMA-DON-${Date.now()}-${suffix}`;
}

function normalizeNotifyStatus(payload: Record<string, unknown>): StatutDon | null {
  const status = String(
    payload['Status'] ?? payload['status'] ?? payload['PaymentStatus'] ?? payload['paymentstatus'] ?? '',
  ).toLowerCase();

  if (!status) return null;
  if (['success', 'successful', 'approved', 'completed', 'paid', 'ok'].some((s) => status.includes(s))) {
    return StatutDon.REUSSI;
  }
  if (['cancel', 'cancelled', 'canceled', 'aborted'].some((s) => status.includes(s))) {
    return StatutDon.ANNULE;
  }
  if (['fail', 'failed', 'decline', 'declined', 'error', 'rejected'].some((s) => status.includes(s))) {
    return StatutDon.ECHEC;
  }
  return null;
}

export async function initierDon(userId: string, telephoneUser: string | null, input: InitierDonInput) {
  const config = getMaxicashConfig();
  const devise = input.devise ?? 'CDF';
  const telephone = input.telephone?.trim() || telephoneUser;

  if (!telephone) {
    throw new Error('Numéro de téléphone requis pour le paiement MaxiCash');
  }
  if (input.montant <= 0) {
    throw new Error('Le montant du don doit être supérieur à zéro');
  }

  const reference = generateReference();
  const { amountCents, currencyMaxicash } = buildMaxicashAmount(devise, input.montant, config);
  const callbacks = getMaxicashCallbackUrls(reference, config);

  const don = await prisma.donTransaction.create({
    data: {
      userId,
      montant: input.montant,
      devise,
      montantMaxicash: amountCents,
      currencyMaxicash,
      reference,
      message: input.message ?? null,
      telephonePayeur: telephone,
      statut: StatutDon.EN_ATTENTE,
    },
  });

  try {
    const payment = await initiatePayEntryWeb({
      amountCents,
      currency: currencyMaxicash,
      telephone,
      reference,
      ...callbacks,
    });

    const updated = await prisma.donTransaction.update({
      where: { id: don.id },
      data: {
        logId: payment.logId,
        maxicashTransactionId: payment.transactionId,
        statut: StatutDon.EN_COURS,
        metadata: payment.rawResponse as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      transaction: updated,
      paymentUrl: payment.paymentUrl,
    };
  } catch (error) {
    await prisma.donTransaction.update({
      where: { id: don.id },
      data: {
        statut: StatutDon.ECHEC,
        metadata: {
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      },
    });
    throw error;
  }
}

export async function traiterNotificationMaxicash(
  reference: string,
  payload: Record<string, unknown>,
) {
  const don = await prisma.donTransaction.findUnique({ where: { reference } });
  if (!don) {
    return null;
  }

  const statut = normalizeNotifyStatus(payload);
  const transactionId = String(
    payload['TransactionID'] ?? payload['TransactionId'] ?? payload['transactionid'] ?? '',
  ) || don.maxicashTransactionId;

  const metadata = {
    ...(typeof don.metadata === 'object' && don.metadata !== null ? (don.metadata as object) : {}),
    lastNotify: payload as Prisma.InputJsonValue,
    notifiedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;

  const baseData: Prisma.DonTransactionUpdateInput = { metadata };
  if (transactionId) {
    baseData.maxicashTransactionId = transactionId;
  }

  if (!statut) {
    return prisma.donTransaction.update({
      where: { id: don.id },
      data: baseData,
    });
  }

  return prisma.donTransaction.update({
    where: { id: don.id },
    data: {
      ...baseData,
      statut,
    },
  });
}

export async function marquerRetourUtilisateur(reference: string, statut: StatutDon) {
  const don = await prisma.donTransaction.findUnique({ where: { reference } });
  if (!don) return null;

  if (don.statut === StatutDon.REUSSI || don.statut === StatutDon.ECHEC || don.statut === StatutDon.ANNULE) {
    return don;
  }

  return prisma.donTransaction.update({
    where: { id: don.id },
    data: { statut },
  });
}
