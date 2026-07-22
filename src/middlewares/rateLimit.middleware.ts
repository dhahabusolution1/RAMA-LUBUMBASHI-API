import rateLimit from 'express-rate-limit';

/**
 * Rate limiter global pour l'API.
 * Par defaut : 100 requetes par 15 minutes par IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: Number(process.env['RATE_LIMIT_WINDOW_MS']) || 15 * 60 * 1000,
  max: Number(process.env['RATE_LIMIT_MAX_REQUESTS']) || 100,
  message: {
    error: 'Trop de requetes, veuillez reessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter plus strict pour les endpoints d'authentification.
 * 10 tentatives par 15 minutes.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Trop de tentatives de connexion, veuillez reessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
