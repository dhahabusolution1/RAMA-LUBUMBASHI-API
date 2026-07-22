export interface MaxicashConfig {
  sandbox: boolean;
  merchantId: string;
  merchantPassword: string;
  payEntryWebUrl: string;
  gatewayRedirectBase: string;
  publicBaseUrl: string;
  cdfToUsdRate: number;
  appDeepLinkBase: string;
}

export function getMaxicashConfig(): MaxicashConfig {
  const sandbox = process.env['MAXICASH_SANDBOX'] !== 'false';

  return {
    sandbox,
    merchantId: process.env['MAXICASH_MERCHANT_ID'] ?? '',
    merchantPassword: process.env['MAXICASH_MERCHANT_PASSWORD'] ?? '',
    payEntryWebUrl: sandbox
      ? 'https://webapi-test.maxicashapp.com/Integration/PayEntryWeb'
      : 'https://webapi.maxicashapp.com/Integration/PayEntryWeb',
    gatewayRedirectBase: sandbox
      ? 'https://api-testbed.maxicashapp.com/payentryweb?logid='
      : 'https://api.maxicashapp.com/payentryweb?logid=',
    publicBaseUrl: (process.env['APP_PUBLIC_URL'] ?? `http://localhost:${process.env['PORT'] ?? 4000}`).replace(/\/$/, ''),
    cdfToUsdRate: Number(process.env['MAXICASH_CDF_TO_USD_RATE'] ?? 2800),
    appDeepLinkBase: process.env['DON_APP_DEEP_LINK_BASE'] ?? 'paroleeternelle://don',
  };
}

export function assertMaxicashConfigured(config: MaxicashConfig): void {
  if (!config.merchantId || !config.merchantPassword) {
    throw new Error('MaxiCash non configuré (MAXICASH_MERCHANT_ID / MAXICASH_MERCHANT_PASSWORD)');
  }
}
