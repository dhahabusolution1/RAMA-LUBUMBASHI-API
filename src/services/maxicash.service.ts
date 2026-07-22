import { getMaxicashConfig, assertMaxicashConfigured, type MaxicashConfig } from '../config/maxicash.js';
import { logger } from '../utils/logger.js';

export interface PayEntryWebPayload {
  PayType: string;
  MerchantID: string;
  MerchantPassword: string;
  Amount: string;
  Currency: string;
  Telephone: string;
  Language: string;
  Reference: string;
  SuccessURL: string;
  FailureURL: string;
  CancelURL: string;
  NotifyURL: string;
}

export interface PayEntryWebResponse {
  SessionToken: string | null;
  ResponseStatus: string;
  ResponseError: string;
  ResponseData: string;
  ResponseDesc: string;
  TransactionID: string;
  LogID: string;
  Reference: string | null;
}

export interface InitiatePaymentParams {
  amountCents: number;
  currency: string;
  telephone: string;
  reference: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface InitiatePaymentResult {
  logId: string;
  transactionId: string | null;
  paymentUrl: string;
  rawResponse: PayEntryWebResponse;
}

function buildCallbackUrls(config: MaxicashConfig, reference: string) {
  const base = `${config.publicBaseUrl}/api/dons`;
  const ref = encodeURIComponent(reference);
  return {
    successUrl: `${base}/retour/success?reference=${ref}`,
    failureUrl: `${base}/retour/echec?reference=${ref}`,
    cancelUrl: `${base}/retour/annulation?reference=${ref}`,
    notifyUrl: `${base}/maxicash/notify?reference=${ref}`,
  };
}

export function buildMaxicashAmount(devise: 'CDF' | 'USD', montant: number, config: MaxicashConfig) {
  if (devise === 'USD') {
    return {
      amountCents: Math.round(montant * 100),
      currencyMaxicash: 'maxiDollar',
    };
  }

  const montantUsd = montant / config.cdfToUsdRate;
  return {
    amountCents: Math.max(1, Math.round(montantUsd * 100)),
    currencyMaxicash: 'maxiDollar',
  };
}

export async function initiatePayEntryWeb(
  params: InitiatePaymentParams,
  config: MaxicashConfig = getMaxicashConfig(),
): Promise<InitiatePaymentResult> {
  assertMaxicashConfigured(config);

  const payload: PayEntryWebPayload = {
    PayType: 'MaxiCash',
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    Amount: String(params.amountCents),
    Currency: params.currency,
    Telephone: params.telephone,
    Language: 'fr',
    Reference: params.reference,
    SuccessURL: params.successUrl,
    FailureURL: params.failureUrl,
    CancelURL: params.cancelUrl,
    NotifyURL: params.notifyUrl,
  };

  const response = await fetch(config.payEntryWebUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error(`MaxiCash PayEntryWeb HTTP error: ${response.status} ${body}`);
    throw new Error(`MaxiCash indisponible (${response.status})`);
  }

  const data = (await response.json()) as PayEntryWebResponse;

  if (data.ResponseStatus?.toLowerCase() !== 'success') {
    logger.error(`MaxiCash PayEntryWeb rejected: ${data.ResponseError || data.ResponseStatus}`);
    throw new Error(data.ResponseError || 'Échec de l’initialisation du paiement MaxiCash');
  }

  const logId = data.LogID || data.ResponseData;
  if (!logId) {
    throw new Error('Réponse MaxiCash invalide (LogID manquant)');
  }

  return {
    logId,
    transactionId: data.TransactionID || null,
    paymentUrl: `${config.gatewayRedirectBase}${logId}`,
    rawResponse: data,
  };
}

export function getMaxicashCallbackUrls(reference: string, config: MaxicashConfig = getMaxicashConfig()) {
  return buildCallbackUrls(config, reference);
}
