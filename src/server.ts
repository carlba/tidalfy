import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import cors from '@fastify/cors';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LOGGER, config } from './registry.js';
import { batchRoutes } from './routes/batch-routes.js';
import { trackRoutes } from './routes/track-routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function createServer() {
  const server = Fastify({ loggerInstance: LOGGER }).withTypeProvider<ZodTypeProvider>();

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(cors, { origin: config.isDevelopment });
  await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  await server.register(batchRoutes);
  await server.register(trackRoutes);

  // Serve frontend static assets in production
  const frontendDist = join(__dirname, '..', 'frontend', 'dist');
  await server.register(staticFiles, {
    root: frontendDist,
    prefix: '/',
    decorateReply: false,
  });

  server.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile('index.html', frontendDist);
  });

  return server;
}

export async function startServer() {
  const server = await createServer();
  await server.listen({ port: config.PORT, host: '0.0.0.0' });
}
