import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { searchMusicBrainz } from '../lib/musicbrainz.js';

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
  match: z
    .object({
      mbid: z.string(),
      title: z.string(),
      artistCredit: z.string(),
      releaseTitle: z.string().nullable(),
      releaseDate: z.string().nullable(),
      score: z.number().nullable(),
      selectedAt: z.date(),
    })
    .nullable(),
});

const musicBrainzCandidateSchema = z.object({
  mbid: z.string(),
  title: z.string(),
  artistCredit: z.string(),
  releaseTitle: z.string().nullable(),
  releaseDate: z.string().nullable(),
  releaseCountry: z.string().nullable(),
  durationMs: z.number().nullable(),
  disambiguation: z.string().nullable(),
  score: z.number().nullable(),
});

export async function trackRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/api/tracks',
    {
      schema: {
        querystring: z.object({ batchId: z.string().optional() }),
        response: { 200: z.array(trackSchema) },
      },
    },
    async request => {
      const { batchId } = request.query;
      const tracks = await prisma.track.findMany({
        where: batchId ? { batchId } : undefined,
        orderBy: { trackName: 'asc' },
        include: { match: true },
      });
      return tracks;
    }
  );

  server.get(
    '/api/tracks/:id/musicbrainz',
    {
      schema: {
        params: z.object({ id: z.string() }),
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

      const candidates = await searchMusicBrainz(track.trackName, track.artistNames[0] ?? '');
      return candidates;
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
          releaseTitle: z.string().nullable(),
          releaseDate: z.string().nullable(),
          score: z.number().nullable(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            trackId: z.string(),
            mbid: z.string(),
            title: z.string(),
            artistCredit: z.string(),
            releaseTitle: z.string().nullable(),
            releaseDate: z.string().nullable(),
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
}
