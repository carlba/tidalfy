import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { importSpotifyCsv } from '../services/import-service.js';
import { prisma } from '../lib/db.js';

export async function batchRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/api/batches',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              fileName: z.string(),
              importedAt: z.date(),
              trackCount: z.number(),
            })
          ),
        },
      },
    },
    async () => {
      const batches = await prisma.importBatch.findMany({
        orderBy: { importedAt: 'desc' },
        include: { _count: { select: { tracks: true } } },
      });

      return batches.map(batch => ({
        id: batch.id,
        fileName: batch.fileName,
        importedAt: batch.importedAt,
        trackCount: batch._count.tracks,
      }));
    }
  );

  server.post(
    '/api/batches',
    {
      schema: {
        response: {
          201: z.object({
            batchId: z.string(),
            fileName: z.string(),
            importedCount: z.number(),
            errors: z.array(z.object({ row: z.number(), message: z.string(), raw: z.string() })),
          }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const csvContent = (await data.toBuffer()).toString('utf-8');
      const fileName = data.filename || 'spotify_export.csv';

      const result = await importSpotifyCsv(csvContent, fileName);
      return reply.status(201).send(result);
    }
  );
}
