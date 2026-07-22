import admin from 'firebase-admin';
import { logger } from '../utils/logger.js';

let firebaseApp: admin.app.App | undefined;

export function initFirebase(): admin.app.App | undefined {
  if (firebaseApp) return firebaseApp;

  const firebaseConfigEnv = process.env['FIREBASE_CONFIG'];
  const credentialsPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];

  try {
    if (firebaseConfigEnv) {
      // Solution pour le Cloud (Railway) : On lit le JSON depuis une variable d'env
      const serviceAccount = JSON.parse(firebaseConfigEnv);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info('Firebase Admin SDK initialise via FIREBASE_CONFIG (Cloud)');
    } else if (credentialsPath) {
      // Solution pour le local : On utilise le fichier JSON
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      logger.info('Firebase Admin SDK initialise via fichier local');
    } else {
      logger.warn('Aucune configuration Firebase trouvee (FIREBASE_CONFIG ou fichier JSON). Push desactive.');
      return undefined;
    }
    return firebaseApp;
  } catch (error) {
    logger.warn('Echec de l\'initialisation Firebase. Les notifications Push sont desactivees.', { error });
    return undefined;
  }
}

export function getMessaging(): admin.messaging.Messaging | undefined {
  if (!firebaseApp) {
    initFirebase();
  }
  return firebaseApp ? admin.messaging() : undefined;
}

/**
 * Envoie une notification FCM a un token specifique.
 * Integre bandwidthConstrainedOk pour les reseaux degrades (pertinent en RDC).
 */
export async function sendFcmToToken(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<string | null> {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('FCM desactive: notification non envoyee', { token: token.slice(0, 10) + '...', payload });
    return null;
  }

  try {
    const message: any = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
        bandwidthConstrainedOk: true,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    if (payload.data) {
      message.data = payload.data;
    }

    const messageId = await messaging.send(message);
    return messageId;
  } catch (error) {
    logger.warn('Echec envoi FCM', { token: token.slice(0, 20) + '...', error });
    return null;
  }
}

/**
 * Envoie une notification multicast a plusieurs tokens.
 * Retourne le nombre de messages envoyes avec succes.
 */
export async function sendFcmMulticast(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<number> {
  if (tokens.length === 0) return 0;

  const messaging = getMessaging();
  if (!messaging) {
    logger.warn(`FCM desactive: multicast ignore pour ${tokens.length} destinataires`);
    return 0;
  }

  // FCM limite les envois multicast a 500 tokens par requete
  const BATCH_SIZE = 500;
  let successCount = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE) as string[];
    try {
      const multicastMessage: any = {
        tokens: batch,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        android: {
          priority: 'high',
          bandwidthConstrainedOk: true,
        },
      };

      if (payload.data) {
        multicastMessage.data = payload.data;
      }

      const response = await messaging.sendEachForMulticast(multicastMessage);
      successCount += response.successCount;
      if (response.failureCount > 0) {
        logger.warn(`FCM multicast : ${response.failureCount} echecs sur ${batch.length} tokens`);
      }
    } catch (error) {
      logger.error('Erreur envoi FCM multicast', { error });
    }
  }

  return successCount;
}
