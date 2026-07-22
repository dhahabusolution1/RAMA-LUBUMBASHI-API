import { Router } from 'express';
import { StatutDon } from '@prisma/client';
import { getMaxicashConfig } from '../config/maxicash.js';
import { marquerRetourUtilisateur, traiterNotificationMaxicash } from '../services/don.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

function collectPayload(req: { query: Record<string, unknown>; body?: unknown }) {
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  return { ...req.query, ...body };
}

function renderReturnPage(options: {
  title: string;
  message: string;
  reference?: string;
  deepLink?: string;
}) {
  const deepLink = options.deepLink
    ? `<p><a href="${options.deepLink}" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.25rem;background:#1a5f2a;color:#fff;text-decoration:none;border-radius:8px;">Retour à l'application</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${options.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 3rem auto; padding: 0 1rem; text-align: center; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    p { line-height: 1.5; color: #444; }
  </style>
</head>
<body>
  <h1>${options.title}</h1>
  <p>${options.message}</p>
  ${options.reference ? `<p><small>Référence : ${options.reference}</small></p>` : ''}
  ${deepLink}
</body>
</html>`;
}

/**
 * Webhook MaxiCash — notification serveur-à-serveur avant redirection utilisateur.
 */
router.all('/maxicash/notify', async (req, res) => {
  try {
    const reference = String(req.query['reference'] ?? '');
    if (!reference) {
      return res.status(400).send('reference manquante');
    }

    const payload = collectPayload(req);
    logger.info('MaxiCash notify', { reference, payload });

    await traiterNotificationMaxicash(reference, payload);
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Erreur notify MaxiCash', { error });
    return res.status(500).send('Erreur');
  }
});

router.get('/retour/success', async (req, res) => {
  const reference = String(req.query['reference'] ?? '');
  const config = getMaxicashConfig();

  if (!reference) {
    return res.status(200).send(
      renderReturnPage({
        title: 'Merci pour votre don',
        message: 'Votre paiement a été enregistré. Que Dieu vous bénisse.',
      }),
    );
  }

  await marquerRetourUtilisateur(reference, StatutDon.REUSSI);

  const deepLink = `${config.appDeepLinkBase}/success?reference=${encodeURIComponent(reference)}`;

  res.status(200).send(
    renderReturnPage({
      title: 'Merci pour votre don',
      message: 'Votre paiement a été enregistré. Que Dieu vous bénisse.',
      reference,
      deepLink,
    }),
  );
});

router.get('/retour/echec', async (req, res) => {
  const reference = String(req.query['reference'] ?? '');
  const config = getMaxicashConfig();

  if (!reference) {
    return res.status(200).send(
      renderReturnPage({
        title: 'Paiement non abouti',
        message: 'Le paiement n’a pas pu être finalisé. Vous pouvez réessayer depuis l’application.',
      }),
    );
  }

  await marquerRetourUtilisateur(reference, StatutDon.ECHEC);

  const deepLink = `${config.appDeepLinkBase}/echec?reference=${encodeURIComponent(reference)}`;

  res.status(200).send(
    renderReturnPage({
      title: 'Paiement non abouti',
      message: 'Le paiement n’a pas pu être finalisé. Vous pouvez réessayer depuis l’application.',
      reference,
      deepLink,
    }),
  );
});

router.get('/retour/annulation', async (req, res) => {
  const reference = String(req.query['reference'] ?? '');
  const config = getMaxicashConfig();

  if (!reference) {
    return res.status(200).send(
      renderReturnPage({
        title: 'Paiement annulé',
        message: 'Vous avez annulé le paiement.',
      }),
    );
  }

  await marquerRetourUtilisateur(reference, StatutDon.ANNULE);

  const deepLink = `${config.appDeepLinkBase}/annulation?reference=${encodeURIComponent(reference)}`;

  res.status(200).send(
    renderReturnPage({
      title: 'Paiement annulé',
      message: 'Vous avez annulé le paiement.',
      reference,
      deepLink,
    }),
  );
});

export default router;
