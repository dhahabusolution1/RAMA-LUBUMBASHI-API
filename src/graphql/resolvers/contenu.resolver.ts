import type { GraphQLContext } from '../../types/context.js';
import { requireAdmin } from '../../middlewares/rbac.js';
import prisma from '../../config/database.js';
import {
  getCachedVersetDuJour,
  getCachedEstEnDirect,
  invalidateVersetCache,
  invalidateAccueilCache,
  invalidateLiveCache,
} from '../../services/cache.service.js';
import {
  fetchYouTubeMetadata,
  fetchYouTubePlaylistItems,
  extractYouTubeVideoId,
} from '../../utils/youtube.js';
import { logger } from '../../utils/logger.js';
import { deleteCloudinaryResource } from '../../config/cloudinary.js';
import {
  envoyerNotificationEvenement,
  envoyerNotificationCulteEnDirect,
  envoyerNotificationEmission,
  envoyerNotificationVersetDuJour
} from '../../services/notification.service.js';

/**
 * Utilitaire interne pour enrichir un objet (sermon, emission, culte) avec les metadonnees YouTube.
 * Ne remplace pas les donnees deja explicitement fournies (sauf si vides).
 */
async function enrichirAvecMetadataYoutube(data: any) {
  if (!data.lienYoutube) return data;
  
  const videoId = extractYouTubeVideoId(data.lienYoutube);
  if (videoId) {
    const metadata = await fetchYouTubeMetadata(videoId);
    if (metadata) {
      // On remplit si absent ou chaine vide
      if (!data.miniatureUrl || data.miniatureUrl.trim() === '') {
        data.miniatureUrl = metadata.thumbnailUrl;
      }
      // Pour les sermons, on peut aussi enrichir le titre/description si vides
      if (data.titre === undefined || data.titre === null || data.titre.trim() === '') {
        data.titre = metadata.title;
      }
      if (data.description === undefined || data.description === null || data.description.trim() === '') {
        data.description = metadata.description;
      }
    }
  }
  return data;
}

export const contenuResolvers = {
  Query: {
    // ── Versets ──────────────────────────────────────────────
    async getVersetDuJour() {
      return getCachedVersetDuJour();
    },
    async getVersets(_: unknown, { search, limit, offset }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const where: any = search
        ? { OR: [
            { reference: { contains: search, mode: 'insensitive' } },
            { texte: { contains: search, mode: 'insensitive' } },
          ] }
        : {};
      const [items, totalCount] = await Promise.all([
        prisma.versetJour.findMany({
          where,
          orderBy: { datePublication: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.versetJour.count({ where }),
      ]);
      return { items, totalCount };
    },

    // ── Événements ───────────────────────────────────────────
    async getEvenements(_: unknown, { search, type, statut, limit, offset }: any) {
      const where: any = {};
      if (type) where.type = type;
      if (statut) where.statut = statut;
      if (search) where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { organisateur: { contains: search, mode: 'insensitive' } },
        { lieu: { contains: search, mode: 'insensitive' } },
      ];

      const [items, totalCount] = await Promise.all([
        prisma.evenement.findMany({
          where,
          orderBy: { dateDebut: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.evenement.count({ where }),
      ]);

      return { items, totalCount };
    },
    async getProchainEvenements(_: unknown, { limit }: any) {
      return prisma.evenement.findMany({
        where: {
          type: 'EVENEMENT',
          statut: 'PUBLIE',
          dateDebut: { gte: new Date() },
        },
        orderBy: { dateDebut: 'asc' },
        take: limit,
      });
    },
    async getEvenementById(_: unknown, { id }: { id: string }) {
      return prisma.evenement.findUnique({ where: { id } });
    },

    // ── Playlists & Sermons ───────────────────────────────────
    async getPlaylists(_: unknown, { search, limit, offset }: any) {
      const where: any = search
        ? { OR: [
            { titre: { contains: search, mode: 'insensitive' } },
            { theme: { contains: search, mode: 'insensitive' } },
          ] }
        : {};
      const [items, totalCount] = await Promise.all([
        prisma.playlistSermon.findMany({
          where,
          include: { sermons: { orderBy: { ordreInPlaylist: 'asc' } } },
          orderBy: { ordre: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.playlistSermon.count({ where }),
      ]);
      return { items, totalCount };
    },
    async getPlaylistById(_: unknown, { id }: { id: string }) {
      return prisma.playlistSermon.findUnique({
        where: { id },
        include: { sermons: { orderBy: { ordreInPlaylist: 'asc' } } },
      });
    },
    async getSermons(_: unknown, { search, playlistId, limit, offset }: any) {
      const where: any = {};
      if (playlistId) where.playlistId = playlistId;
      if (search) where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { predicateur: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      const [items, totalCount] = await Promise.all([
        prisma.sermon.findMany({
          where,
          include: { playlist: true },
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.sermon.count({ where }),
      ]);

      return { items, totalCount };
    },
    async getDernierSermon() {
      return prisma.sermon.findFirst({
        include: { playlist: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    // ── Émissions ────────────────────────────────────────────
    async getEmissions(_: unknown, { search, type, limit, offset }: any) {
      const where: any = {};
      if (type) where.type = type;
      if (search) where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      const [items, totalCount] = await Promise.all([
        prisma.emission.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.emission.count({ where }),
      ]);

      return { items, totalCount };
    },

    // ── Short Videos ─────────────────────────────────────────
    async getShortVideos(_: unknown, { search, dateDebut, dateFin, limit, offset }: any) {
      const where: any = {};
      if (dateDebut || dateFin) {
        where.datePublication = {};
        if (dateDebut) where.datePublication.gte = new Date(dateDebut);
        if (dateFin) where.datePublication.lte = new Date(dateFin);
      }
      if (search) where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      const [items, totalCount] = await Promise.all([
        prisma.shortVideo.findMany({
          where,
          orderBy: { datePublication: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.shortVideo.count({ where }),
      ]);

      return { items, totalCount };
    },

    // ── Cultes ───────────────────────────────────────────────
    async getCultes(_: unknown, { search, type, statut, limit, offset }: any) {
      const where: any = {};
      if (type) where.type = type;
      if (statut) where.statut = statut;
      if (search) where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      const [items, totalCount] = await Promise.all([
        prisma.culte.findMany({
          where,
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.culte.count({ where }),
      ]);

      return { items, totalCount };
    },
    async estEnDirect() {
      return getCachedEstEnDirect();
    },

    // ── Citations ────────────────────────────────────────────
    async getCitations(_: unknown, { search, limit, offset }: any) {
      const where: any = search
        ? { OR: [
            { texte: { contains: search, mode: 'insensitive' } },
            { auteur: { contains: search, mode: 'insensitive' } },
          ] }
        : {};
      const [items, totalCount] = await Promise.all([
        prisma.citation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.citation.count({ where }),
      ]);
      return { items, totalCount };
    },
  },

  Mutation: {
    // ── Versets ──────────────────────────────────────────────
    async creerVerset(_: unknown, input: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const verset = await prisma.versetJour.create({ data: input });
      await invalidateVersetCache();
      return verset;
    },
    async modifierVerset(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const verset = await prisma.versetJour.update({ where: { id }, data });
      await invalidateVersetCache();
      return verset;
    },
    async supprimerVerset(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.versetJour.delete({ where: { id } });
      await invalidateVersetCache();
      return true;
    },
    async activerVerset(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.$transaction([
        prisma.versetJour.updateMany({ where: { estActif: true }, data: { estActif: false } }),
        prisma.versetJour.update({ where: { id }, data: { estActif: true } }),
      ]);
      await invalidateVersetCache();
      
      // Envoi de la notification Push
      envoyerNotificationVersetDuJour().catch((err) => 
        logger.error('Erreur notification verset:', err)
      );

      return prisma.versetJour.findUnique({ where: { id } });
    },

    // ── Événements ───────────────────────────────────────────
    async creerEvenement(_: unknown, { input }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const evenement = await prisma.evenement.create({ data: input });
      await invalidateAccueilCache();
      
      if (evenement.statut === 'PUBLIE') {
        envoyerNotificationEvenement(evenement.id).catch((err) => 
          logger.error('Erreur notification evenement:', err)
        );
      }
      
      return evenement;
    },
    async modifierEvenement(_: unknown, { id, input }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const oldEvenement = await prisma.evenement.findUnique({ where: { id } });
      const evenement = await prisma.evenement.update({ where: { id }, data: input });
      await invalidateAccueilCache();
      
      if (oldEvenement?.statut !== 'PUBLIE' && evenement.statut === 'PUBLIE') {
        envoyerNotificationEvenement(evenement.id).catch((err) => 
          logger.error('Erreur notification evenement:', err)
        );
      }
      
      return evenement;
    },
    async supprimerEvenement(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.evenement.delete({ where: { id } });
      await invalidateAccueilCache();
      return true;
    },

    // ── Playlists ─────────────────────────────────────────────
    async creerPlaylist(_: unknown, data: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.playlistSermon.create({ data, include: { sermons: true } });
    },
    async modifierPlaylist(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.playlistSermon.update({
        where: { id },
        data,
        include: { sermons: { orderBy: { ordreInPlaylist: 'asc' } } },
      });
    },
    async supprimerPlaylist(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.playlistSermon.delete({ where: { id } });
      return true;
    },

    // ── Sermons ───────────────────────────────────────────────
    async creerSermon(_: unknown, { input }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(input);
      const sermon = await prisma.sermon.create({
        data: input,
        include: { playlist: true },
      });
      await invalidateAccueilCache();
      return sermon;
    },
    async modifierSermon(_: unknown, { id, input }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(input);
      return prisma.sermon.update({
        where: { id },
        data: input,
        include: { playlist: true },
      });
    },
    async supprimerSermon(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.sermon.delete({ where: { id } });
      return true;
    },
    async reordonnerSermons(
      _: unknown,
      { playlistId, ordres }: { playlistId: string; ordres: Array<{ sermonId: string; ordre: number }> },
      ctx: GraphQLContext
    ) {
      requireAdmin(ctx);
      await prisma.$transaction(
        ordres.map(({ sermonId, ordre }) =>
          prisma.sermon.update({
            where: { id: sermonId },
            data: { ordreInPlaylist: ordre },
          })
        )
      );
      return true;
    },
    async importerPlaylistYoutube(
      _: unknown,
      { playlistUrl, playlistId }: { playlistUrl: string; playlistId?: string },
      ctx: GraphQLContext
    ) {
      requireAdmin(ctx);
      const playlistIdMatch = playlistUrl.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (!playlistIdMatch?.[1]) throw new Error('URL de playlist YouTube invalide');

      const items = await fetchYouTubePlaylistItems(playlistIdMatch[1]);
      if (items.length === 0) return 0;

      let imported = 0;
      for (const [index, item] of items.entries()) {
        const lienYoutube = `https://www.youtube.com/watch?v=${item.videoId}`;
        const exists = await prisma.sermon.findFirst({ where: { lienYoutube } });
        if (exists) continue;

        await prisma.sermon.create({
          data: {
            titre: item.title,
            description: item.description || null,
            lienYoutube,
            miniatureUrl: item.thumbnailUrl,
            date: new Date(),
            playlistId: playlistId ?? null,
            ordreInPlaylist: index,
          },
        });
        imported++;
      }

      await invalidateAccueilCache();
      logger.info(`Importation YouTube : ${imported} sermons importés`);
      return imported;
    },

    // ── Émissions ────────────────────────────────────────────
    async creerEmission(_: unknown, data: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(data);
      const emission = await prisma.emission.create({ data });
      
      envoyerNotificationEmission(emission.id).catch((err) => 
        logger.error('Erreur notification emission:', err)
      );
      
      return emission;
    },
    async modifierEmission(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(data);
      return prisma.emission.update({ where: { id }, data });
    },
    async supprimerEmission(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const emission = await prisma.emission.findUnique({ where: { id } });
      if (emission?.cloudinaryPublicId) {
        await deleteCloudinaryResource(emission.cloudinaryPublicId, 'video'); // Radio is often uploaded as video/audio type
      }
      await prisma.emission.delete({ where: { id } });
      return true;
    },

    // ── Cultes ───────────────────────────────────────────────
    async creerCulte(_: unknown, data: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(data);
      const culte = await prisma.culte.create({ data });
      
      if (culte.statut === 'EN_DIRECT') {
        envoyerNotificationCulteEnDirect(culte.id).catch((err) => 
          logger.error('Erreur notification culte en direct:', err)
        );
      }
      
      return culte;
    },
    async modifierCulte(_: unknown, { id, ...data }: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await enrichirAvecMetadataYoutube(data);
      
      const oldCulte = await prisma.culte.findUnique({ where: { id } });
      const updated = await prisma.culte.update({ where: { id }, data });
      
      if (data.statut === 'EN_DIRECT' || data.statut === 'PLANIFIE') {
        await invalidateLiveCache();
      }
      
      if (oldCulte?.statut !== 'EN_DIRECT' && updated.statut === 'EN_DIRECT') {
        envoyerNotificationCulteEnDirect(updated.id).catch((err) => 
          logger.error('Erreur notification culte en direct:', err)
        );
      }
      
      return updated;
    },
    async supprimerCulte(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      await prisma.culte.delete({ where: { id } });
      return true;
    },

    // ── Citations ────────────────────────────────────────────
    async ajouterCitation(_: unknown, data: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.citation.create({ data });
    },
    async modifierCitation(_: unknown, { id, ...data }: { id: string; [k: string]: unknown }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.citation.update({ where: { id }, data });
    },
    async supprimerCitation(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const citation = await prisma.citation.findUnique({ where: { id } });
      if (citation?.cloudinaryPublicId) {
        await deleteCloudinaryResource(citation.cloudinaryPublicId, 'image');
      }
      await prisma.citation.delete({ where: { id } });
      return true;
    },

    // ── Short Videos ─────────────────────────────────────────
    async creerShortVideo(_: unknown, data: any, ctx: GraphQLContext) {
      requireAdmin(ctx);
      return prisma.shortVideo.create({ data });
    },
    async supprimerShortVideo(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
      requireAdmin(ctx);
      const short = await prisma.shortVideo.findUnique({ where: { id } });
      if (short?.cloudinaryPublicId) {
        await deleteCloudinaryResource(short.cloudinaryPublicId, 'video');
      }
      await prisma.shortVideo.delete({ where: { id } });
      return true;
    },
  },

  // ── Field resolvers ──────────────────────────────────────
  ShortVideo: {
    /** Genere l'URL de telechargement Cloudinary avec fl_attachment. */
    downloadUrl: (parent: any) => {
      const url: string = parent.videoUrl ?? '';
      // Insere fl_attachment dans l'URL Cloudinary (apres /upload/)
      return url.replace('/upload/', '/upload/fl_attachment/');
    },
  },
  PlaylistSermon: {
    sermons: (parent: any) =>
      prisma.sermon.findMany({
        where: { playlistId: parent.id },
        orderBy: { ordreInPlaylist: 'asc' },
      }),
  },
  Sermon: {
    playlist: (parent: any) =>
      parent.playlistId
        ? prisma.playlistSermon.findUnique({ where: { id: parent.playlistId } })
        : null,
  },
};

