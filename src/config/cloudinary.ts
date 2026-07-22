import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

if (
  !process.env['CLOUDINARY_CLOUD_NAME'] ||
  !process.env['CLOUDINARY_API_KEY'] ||
  !process.env['CLOUDINARY_API_SECRET']
) {
  logger.error('Variables Cloudinary manquantes (CLOUD_NAME, API_KEY, API_SECRET)');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true,
});

logger.info('Cloudinary configure');

export { cloudinary };

// Dossiers Cloudinary par type de contenu
export const CLOUDINARY_FOLDERS = {
  PROFILS: 'arche-source-de-vie/profils',
  INSCRIPTIONS: 'arche-source-de-vie/inscriptions',
  EGLISES: 'arche-source-de-vie/eglises',
  EVENEMENTS: 'arche-source-de-vie/evenements',
  SERMONS: 'arche-source-de-vie/sermons',
  CITATIONS: 'arche-source-de-vie/citations',
  SHORT_VIDEOS: 'arche-source-de-vie/shorts',
  ARTICLES: 'arche-source-de-vie/articles',
  ACCUEIL: 'arche-source-de-vie/accueil',
} as const;

/**
 * Supprime une ressource Cloudinary par son public_id.
 * Utilise 'video' comme resource_type pour les videos.
 */
export async function deleteCloudinaryResource(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info('Ressource Cloudinary supprimee', { publicId });
  } catch (error) {
    logger.warn('Echec suppression Cloudinary', { publicId, error });
  }
}

/**
 * Extrait le public_id depuis une URL Cloudinary complete.
 */
export function extractPublicIdFromUrl(url: string): string {
  const parts = url.split('/upload/');
  if (parts.length < 2) return url;
  const withVersion = parts[1] ?? '';
  // Supprimer le prefixe de version (v1234567890/) si present
  const withoutVersion = withVersion.replace(/^v\d+\//, '');
  // Supprimer l'extension
  return withoutVersion.replace(/\.[^/.]+$/, '');
}
