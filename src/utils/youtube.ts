import { logger } from './logger.js';

/**
 * Extrait le videoId d'une URL YouTube (formats normaux et courts).
 * Supporte : youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Genere l'URL de miniature YouTube en qualite maximale disponible.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Recupere les metadonnees d'une video YouTube via l'API Data v3.
 * Retourne null si la cle API n'est pas configuree ou si la video est introuvable.
 */
export async function fetchYouTubeMetadata(
  videoId: string
): Promise<{ title: string; description: string; thumbnailUrl: string } | null> {
  const apiKey = process.env['YOUTUBE_API_KEY'];
  if (!apiKey) {
    logger.warn('YOUTUBE_API_KEY non configuree — metadonnees YouTube indisponibles');
    return null;
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('id', videoId);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      logger.warn('Echec appel YouTube API', { status: response.status, videoId });
      return null;
    }

    const data = (await response.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          description?: string;
          thumbnails?: { high?: { url?: string } };
        };
      }>;
    };

    const snippet = data.items?.[0]?.snippet;
    if (!snippet) return null;

    return {
      title: snippet.title ?? '',
      description: snippet.description ?? '',
      thumbnailUrl:
        snippet.thumbnails?.high?.url ?? getYouTubeThumbnailUrl(videoId),
    };
  } catch (error) {
    logger.error('Erreur lors de la recuperation des metadonnees YouTube', { error, videoId });
    return null;
  }
}

/**
 * Recupere les videos d'une playlist YouTube via l'API Data v3.
 * Utilise la pagination pour recuperer jusqu'a maxResults videos.
 */
export async function fetchYouTubePlaylistItems(
  playlistId: string,
  maxResults = 50
): Promise<
  Array<{ videoId: string; title: string; description: string; thumbnailUrl: string }>
> {
  const apiKey = process.env['YOUTUBE_API_KEY'];
  if (!apiKey) {
    logger.warn('YOUTUBE_API_KEY non configuree');
    return [];
  }

  const items: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
  }> = [];

  let pageToken: string | undefined;

  do {
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('maxResults', String(Math.min(maxResults - items.length, 50)));
      url.searchParams.set('key', apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url.toString());
      if (!response.ok) break;

      const data = (await response.json()) as {
        nextPageToken?: string;
        items?: Array<{
          snippet?: {
            resourceId?: { videoId?: string };
            title?: string;
            description?: string;
            thumbnails?: { high?: { url?: string } };
          };
        }>;
      };

      for (const item of data.items ?? []) {
        const snippet = item.snippet;
        const videoId = snippet?.resourceId?.videoId;
        if (!videoId) continue;

        items.push({
          videoId,
          title: snippet?.title ?? '',
          description: snippet?.description ?? '',
          thumbnailUrl:
            snippet?.thumbnails?.high?.url ?? getYouTubeThumbnailUrl(videoId),
        });
      }

      pageToken = data.nextPageToken;
    } catch (error) {
      logger.error('Erreur pagination playlist YouTube', { error, playlistId });
      break;
    }
  } while (pageToken && items.length < maxResults);

  return items;
}
