import { Router } from 'express';
import multer from 'multer';
import { cloudinary, CLOUDINARY_FOLDERS } from '../config/cloudinary.js';
import { requireAdmin } from '../middlewares/rbac.js';
import { logger } from '../utils/logger.js';
import type { GraphQLContext } from '../types/context.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload d'image vers Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 enum: [profils, inscriptions, eglises, evenements, sermons, citations, shorts, articles, accueil]
 *     responses:
 *       200:
 *         description: URL de l'image uploadee
 */
const FIDELE_ALLOWED_FOLDERS = ['profils', 'inscriptions'];

router.post('/', upload.single('file'), async (req: any, res) => {
  try {
    // Le middleware auth GraphQL peuple req.user via extractUserFromRequest
    if (!req.user || (req.user.role === 'FIDELE' && !FIDELE_ALLOWED_FOLDERS.includes(req.body.folder))) {
      return res.status(403).json({ error: 'Acces refuse' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const folderName = req.body.folder || 'misc';
    const folderPath = `arche-source-de-vie/${folderName}`;

    // Upload via stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          logger.error('Erreur upload Cloudinary', { error });
          return res.status(500).json({ error: 'Echec de l\'upload' });
        }
        res.json({
          url: result?.secure_url,
          publicId: result?.public_id,
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    logger.error('Erreur endpoint upload', { error });
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
