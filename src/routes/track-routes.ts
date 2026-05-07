import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { searchMusicBrainz } from '../lib/musicbrainz.js';
import { searchDiscogs } from '../lib/discogs.js';

const trackSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  spotifyUri: z.string(),
  trackName: z.string(),
  albumName: z.string(),
  artistNames: z.array(z.string()),
  releaseDate: z.string().nullable(),
  durationMs: z.number(),
  popularity: z.number(),
  explicit: z.boolean(),
  addedBy: z.string().nullable(),
  addedAt: z.date().nullable(),
  genres: z.array(z.string()),
  recordLabel: z.string().nullable(),
  archived: z.boolean(),
  match: z
    .object({
      mbid: z.string(),
      title: z.string(),
      artistCredit: z.string(),
      releaseId: z.string().nullable(),
      releaseBarcode: z.string().nullable(),
      releaseAsin: z.string().nullable(),
      releaseTitle: z.string().nullable(),
      releaseDate: z.string().nullable(),
      isrc: z.string().nullable(),
      score: z.number().nullable(),
      selectedAt: z.date(),
    })
    .nullable(),
  discogsMatch: z
    .object({
      discogsReleaseId: z.string(),
      title: z.string(),
      artistCredit: z.string(),
      releaseTitle: z.string().nullable(),
      releaseDate: z.string().nullable(),
      releaseCountry: z.string().nullable(),
      releaseLabel: z.string().nullable(),
      releaseFormat: z.string().nullable(),
      releaseBarcode: z.string().nullable(),
      releaseBarcodeRaw: z.array(z.string()),
      releaseEans: z.array(z.string()),
      releaseCoverArtUrl: z.string().nullable(),
      resourceUrl: z.string().nullable(),
      selectedAt: z.date(),
    })
    .nullable(),
});

const musicBrainzCandidateSchema = z.object({
  mbid: z.string(),
  title: z.string(),
  artistCredit: z.string(),
  releaseId: z.string().nullable(),
  releaseBarcode: z.string().nullable(),
  releaseCoverArtUrl: z.string().nullable(),
  releasePackaging: z.string().nullable(),
  releaseAsin: z.string().nullable(),
  releaseHasCoverArt: z.boolean(),
  releaseTitle: z.string().nullable(),
  releaseDate: z.string().nullable(),
  releaseCountry: z.string().nullable(),
  releaseStatus: z.string().nullable(),
  releaseType: z.string().nullable(),
  releaseSecondaryTypes: z.array(z.string()).optional(),
  durationMs: z.number().nullable(),
  disambiguation: z.string().nullable(),
  isrc: z.string().nullable(),
  score: z.number().nullable(),
});

const discogsCandidateSchema = z.object({
  discogsReleaseId: z.string(),
  title: z.string(),
  artistCredit: z.string(),
  releaseTitle: z.string().nullable(),
  releaseDate: z.string().nullable(),
  releaseCountry: z.string().nullable(),
  releaseLabel: z.string().nullable(),
  releaseFormat: z.string().nullable(),
  releaseBarcode: z.string().nullable(),
  releaseBarcodeRaw: z.array(z.string()),
  releaseEans: z.array(z.string()),
  releaseCoverArtUrl: z.string().nullable(),
  resourceUrl: z.string().nullable(),
  isMaster: z.boolean(),
});

const discogsMatchSchema = z.object({
  discogsReleaseId: z.string(),
  title: z.string(),
  artistCredit: z.string(),
  releaseTitle: z.string().nullable(),
  releaseDate: z.string().nullable(),
  releaseCountry: z.string().nullable(),
  releaseLabel: z.string().nullable(),
  releaseFormat: z.string().nullable(),
  releaseBarcode: z.string().nullable(),
  releaseBarcodeRaw: z.array(z.string()),
  releaseEans: z.array(z.string()),
  releaseCoverArtUrl: z.string().nullable(),
  resourceUrl: z.string().nullable(),
  selectedAt: z.date(),
});

export async function trackRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/api/tracks',
    {
      schema: {
        querystring: z.object({
          batchId: z.string().optional(),
          status: z.enum(['active', 'archived', 'all']).optional(),
        }),
        response: { 200: z.array(trackSchema) },
      },
    },
    async request => {
      const { batchId, status } = request.query;
      const archivedFilter = status === 'archived' ? true : status === 'all' ? undefined : false;
      const tracks = await prisma.track.findMany({
        where: {
          archived: archivedFilter,
          batchId: batchId ?? undefined,
        },
        orderBy: [{ addedAt: 'desc' }, { trackName: 'asc' }],
        include: { match: true, discogsMatch: true },
      });
      return tracks;
    }
  );

  server.get(
    '/api/tracks/:id/musicbrainz',
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({
          includeAlbum: z.string().optional(),
          albumName: z.string().optional(),
          useScoreOnly: z.string().optional(),
          onlyAlbum: z.string().optional(),
          noSecondaryType: z.string().optional(),
        }),
        response: {
          200: z.array(musicBrainzCandidateSchema),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const track = await prisma.track.findUnique({ where: { id: request.params.id } });
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const includeAlbum = request.query.includeAlbum === 'true';
      const albumName = request.query.albumName?.trim();
      const useScoreOnly = request.query.useScoreOnly === 'true';
      const onlyAlbum = request.query.onlyAlbum !== 'false';
      const noSecondaryType = request.query.noSecondaryType !== 'false';
      const candidates = await searchMusicBrainz(
        track.trackName,
        track.artistNames[0] ?? '',
        includeAlbum ? albumName : undefined,
        track.releaseDate,
        includeAlbum,
        useScoreOnly,
        onlyAlbum,
        noSecondaryType
      );
      return candidates;
    }
  );

  server.get(
    '/api/tracks/:id/discogs',
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({ albumName: z.string().optional() }),
        response: {
          200: z.array(discogsCandidateSchema),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const track = await prisma.track.findUnique({ where: { id: request.params.id } });
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const searchAlbumName = request.query.albumName?.trim() ?? undefined;
      const candidates = await searchDiscogs(
        track.trackName,
        track.artistNames[0] ?? '',
        searchAlbumName
      );
      return candidates;
    }
  );

  server.post(
    '/api/tracks/:id/discogs-match',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          discogsReleaseId: z.string(),
          title: z.string(),
          artistCredit: z.string(),
          releaseTitle: z.string().nullable(),
          releaseDate: z.string().nullable(),
          releaseCountry: z.string().nullable(),
          releaseLabel: z.string().nullable(),
          releaseFormat: z.string().nullable(),
          releaseBarcode: z.string().nullable(),
          releaseBarcodeRaw: z.array(z.string()),
          releaseEans: z.array(z.string()),
          releaseCoverArtUrl: z.string().nullable(),
          resourceUrl: z.string().nullable(),
        }),
        response: {
          200: discogsMatchSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const track = await prisma.track.findUnique({ where: { id: request.params.id } });
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const match = await prisma.discogsMatch.upsert({
        where: { trackId: track.id },
        update: { ...request.body, selectedAt: new Date() },
        create: { trackId: track.id, ...request.body },
      });

      return match;
    }
  );

  server.post(
    '/api/tracks/:id/match',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          mbid: z.string(),
          title: z.string(),
          artistCredit: z.string(),
          releaseId: z.string().nullable(),
          releaseBarcode: z.string().nullable(),
          releaseAsin: z.string().nullable(),
          releaseTitle: z.string().nullable(),
          releaseDate: z.string().nullable(),
          isrc: z.string().nullable(),
          releaseType: z.string().nullable().optional(),
          releaseSecondaryTypes: z.array(z.string()).optional(),
          score: z.number().nullable(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            trackId: z.string(),
            mbid: z.string(),
            title: z.string(),
            artistCredit: z.string(),
            releaseId: z.string().nullable(),
            releaseBarcode: z.string().nullable(),
            releaseAsin: z.string().nullable(),
            releaseTitle: z.string().nullable(),
            releaseDate: z.string().nullable(),
            isrc: z.string().nullable(),
            score: z.number().nullable(),
            selectedAt: z.date(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const track = await prisma.track.findUnique({ where: { id: request.params.id } });
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const match = await prisma.musicBrainzMatch.upsert({
        where: { trackId: track.id },
        update: { ...request.body, selectedAt: new Date() },
        create: { trackId: track.id, ...request.body },
      });

      return match;
    }
  );

  server.patch(
    '/api/tracks/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ archived: z.boolean().optional() }).optional(),
        response: {
          200: z.object({ id: z.string(), archived: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const track = await prisma.track.findUnique({ where: { id: request.params.id } });
      if (!track) {
        return reply.status(404).send({ error: 'Track not found' });
      }

      const archived = request.body?.archived ?? true;
      const updatedTrack = await prisma.track.update({
        where: { id: request.params.id },
        data: { archived },
      });

      return { id: updatedTrack.id, archived: updatedTrack.archived };
    }
  );
}
