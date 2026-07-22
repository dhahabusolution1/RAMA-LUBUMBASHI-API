import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev
    ? combine(colorize(), simple())
    : combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console(),
    // En production, ajouter un transport vers un service de logs centralise
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
  // Capturer les exceptions non gerees
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});
