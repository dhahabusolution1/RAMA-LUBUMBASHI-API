import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';
const CHANNEL_PREFIX = 'parole_eternelle:pubsub:';

// Connexion pour la publication
const publisher = new Redis(REDIS_URL);
// Connexion dediee pour l'abonnement (obligatoire en Redis Pub/Sub)
const subscriber = new Redis(REDIS_URL);

subscriber.on('error', (err) => logger.error('Redis Subscriber Error', err));
publisher.on('error', (err) => logger.error('Redis Publisher Error', err));

export const redisPubSub = {
  /**
   * Publie un evenement sur un canal Redis.
   * Sera recu par toutes les instances du backend.
   */
  async publish(channel: string, data: unknown): Promise<void> {
    const fullChannel = CHANNEL_PREFIX + channel;
    await publisher.publish(fullChannel, JSON.stringify(data));
    logger.debug('PubSub publish', { channel });
  },

  /**
   * S'abonne a un canal Redis et retourne un AsyncIterable pour GraphQL.
   */
  asyncIterator<T>(channel: string): AsyncGenerator<T> {
    const fullChannel = CHANNEL_PREFIX + channel;
    const queue: T[] = [];
    let resolve: ((value: IteratorResult<T>) => void) | null = null;
    let done = false;

    // Gestionnaire de messages Redis
    const onMessage = (chan: string, message: string) => {
      if (chan !== fullChannel || done) return;
      const data = JSON.parse(message) as T;
      
      if (resolve) {
        resolve({ value: data, done: false });
        resolve = null;
      } else {
        queue.push(data);
      }
    };

    subscriber.subscribe(fullChannel).catch(err => {
      logger.error(`Erreur d'abonnement au canal ${fullChannel}`, err);
    });
    
    subscriber.on('message', onMessage);

    return {
      [Symbol.asyncIterator]() { return this; },
      async next(): Promise<IteratorResult<T>> {
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        if (done) {
          return { value: undefined as unknown as T, done: true };
        }
        return new Promise((res) => { resolve = res; });
      },
      async return(value?: T | PromiseLike<T>): Promise<IteratorResult<T>> {
        if (!done) {
          done = true;
          subscriber.off('message', onMessage);
          subscriber.unsubscribe(fullChannel).catch(() => {});
          if (resolve) {
            resolve({ value: undefined as unknown as T, done: true });
            resolve = null;
          }
        }
        return { value: value as T, done: true };
      },
      async throw(err: unknown): Promise<IteratorResult<T>> {
        await this.return(undefined as any);
        return Promise.reject(err);
      },
      async [Symbol.asyncDispose](): Promise<void> {
        await this.return(undefined as any);
      },
    };
  },
};

// Canaux publics
export const PUBSUB_CHANNELS = {
  NEW_MESSAGE: (conversationId: string) => `new_message_${conversationId}`,
  STATUT_LIVE_CHANGE: 'statut_live_change',
} as const;
