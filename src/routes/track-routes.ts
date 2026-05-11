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
      artistCredit: z.array(z.string()),
      releaseId: z.string().nullable(),
      releaseBarcode: z.string().nullable(),
      releaseAsin: z.string().nullable(),
      releaseTitle: z.string().nullable(),
      releaseDate: z.string().nullable(),
      releaseType: z.string().nullable(),
      releaseSecondaryTypes: z.array(z.string()).optional(),
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
      releaseType: z.string().nullable(),
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
  releaseType: z.string().nullable(),
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
  releaseType: z.string().nullable(),
  releaseFormat: z.string().nullable(),
  releaseBarcode: z.string().nullable(),
  releaseBarcodeRaw: z.array(z.string()),
  releaseEans: z.array(z.string()),
  releaseCoverArtUrl: z.string().nullable(),
  resourceUrl: z.string().nullable(),
  selectedAt: z.date(),
});

function parseArtistNames(artistCredit: string | string[]): string[] {
  const rawCredits = Array.isArray(artistCredit) ? artistCredit : [artistCredit];
  return rawCredits
    .flatMap(credit =>
      credit
        .split(/\s*(?:,|\/)\s*/)
        .map(name => name.trim())
        .filter(Boolean)
    )
    .filter(Boolean);
}

function normalizeTrackTitle(track: { trackName: string; match: { title: string } | null }) {
  return track.match?.title ?? track.trackName;
}

function normalizeAlbumName(track: {
  albumName: string;
  trackName: string;
  match: { releaseTitle: string | null } | null;
  discogsMatch: { releaseTitle: string | null; title: string } | null;
}) {
  if (track.match?.releaseTitle) {
    return track.match.releaseTitle;
  }

  if (track.discogsMatch) {
    const releaseTitle = track.discogsMatch.releaseTitle;
    if (releaseTitle) {
      return releaseTitle;
    }

    const discogsTitle = track.discogsMatch.title?.trim();
    const trackTitle = track.trackName?.trim();
    if (discogsTitle && trackTitle && discogsTitle.toLowerCase() !== trackTitle.toLowerCase()) {
      return discogsTitle;
    }
  }

  return track.albumName;
}

function normalizeArtistNames(track: {
  artistNames: string[];
  match: { artistCredit: string[] } | null;
  discogsMatch: { artistCredit: string } | null;
}) {
  if (track.match?.artistCredit) {
    return track.match.artistCredit;
  }

  if (track.discogsMatch?.artistCredit) {
    return parseArtistNames(track.discogsMatch.artistCredit);
  }

  return track.artistNames;
}

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
      return tracks.map(track => ({
        ...track,
        trackName: normalizeTrackTitle(track),
        albumName: normalizeAlbumName(track),
        artistNames: normalizeArtistNames(track),
      }));
    }
  );

  server.get(
    '/api/tracks/:id/musicbrainz',
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({
          searchTitle: z.string().optional(),
          useTitleFilter: z.string().optional(),
          searchArtist: z.string().optional(),
          useArtistFilter: z.string().optional(),
          includeAlbum: z.string().optional(),
          albumName: z.string().optional(),
          useScoreOnly: z.string().optional(),
          onlyAlbum: z.string().optional(),
          noSecondaryType: z.string().optional(),
          fetchReleaseMetadata: z.string().optional(),
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

      const searchTitle = request.query.searchTitle?.trim();
      const useTitleFilter = request.query.useTitleFilter !== 'false';
      const searchArtist = request.query.searchArtist?.trim();
      const useArtistFilter = request.query.useArtistFilter !== 'false';
      const includeAlbum = request.query.includeAlbum === 'true';
      const albumName = request.query.albumName?.trim();
      const useScoreOnly = request.query.useScoreOnly === 'true';
      const onlyAlbum = request.query.onlyAlbum !== 'false';
      const noSecondaryType = request.query.noSecondaryType !== 'false';
      const trackName = useTitleFilter ? (searchTitle?.length ? searchTitle : track.trackName) : '';
      const candidates = await searchMusicBrainz(
        trackName,
        useArtistFilter ? (searchArtist ?? track.artistNames[0] ?? '') : '',
        includeAlbum ? albumName : undefined,
        track.releaseDate,
        includeAlbum,
        useScoreOnly,
        onlyAlbum,
        noSecondaryType,
        request.query.fetchReleaseMetadata !== 'false'
      );
      return candidates;
    }
  );

  server.get(
    '/api/tracks/:id/discogs',
    {
      schema: {
        params: z.object({ id: z.string() }),
        querystring: z.object({
          searchTitle: z.string().optional(),
          searchArtist: z.string().optional(),
          albumName: z.string().optional(),
          extended: z.string().optional(),
        }),
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

      const searchTitle = request.query.searchTitle?.trim();
      const searchArtist = request.query.searchArtist?.trim();
      const searchAlbumName = request.query.albumName?.trim() ?? undefined;
      const extended = request.query.extended === 'true';
      const candidates = await searchDiscogs(
        searchTitle ?? track.trackName,
        searchArtist ?? track.artistNames[0] ?? '',
        searchAlbumName,
        extended
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
          releaseType: z.string().nullable(),
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
          artistCredit: z.array(z.string()),
          releaseId: z.string().nullable(),
          releaseBarcode: z.string().nullable(),
          releaseAsin: z.string().nullable(),
          releaseTitle: z.string().nullable(),
          releaseDate: z.string().nullable(),
          releaseType: z.string().nullable().optional(),
          releaseSecondaryTypes: z.array(z.string()).optional(),
          isrc: z.string().nullable(),
          score: z.number().nullable(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            trackId: z.string(),
            mbid: z.string(),
            title: z.string(),
            artistCredit: z.array(z.string()),
            releaseId: z.string().nullable(),
            releaseBarcode: z.string().nullable(),
            releaseAsin: z.string().nullable(),
            releaseTitle: z.string().nullable(),
            releaseDate: z.string().nullable(),
            releaseType: z.string().nullable(),
            releaseSecondaryTypes: z.array(z.string()).optional(),
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

      await prisma.track.update({
        where: { id: track.id },
        data: {
          trackName: request.body.title,
          artistNames: parseArtistNames(request.body.artistCredit),
        },
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
