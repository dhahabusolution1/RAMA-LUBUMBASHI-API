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
  PROFILS: 'rama-lubumbashi/profils',
  INSCRIPTIONS: 'rama-lubumbashi/inscriptions',
  EGLISES: 'rama-lubumbashi/eglises',
  EVENEMENTS: 'rama-lubumbashi/evenements',
  SERMONS: 'rama-lubumbashi/sermons',
  CITATIONS: 'rama-lubumbashi/citations',
  SHORT_VIDEOS: 'rama-lubumbashi/shorts',
  ARTICLES: 'rama-lubumbashi/articles',
  ACCUEIL: 'rama-lubumbashi/accueil',
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
