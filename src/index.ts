import { config, LOGGER } from './registry.js';
import { startServer } from './server.js';

process.on('warning', warning => {
  if (warning.name === 'MaxListenersExceededWarning') return;
  console.warn(warning.stack);
});

const redact = ({ DATABASE_URL, DISCOGS_USER_TOKEN, ...rest }: Record<string, unknown>) => ({
  ...rest,
  DATABASE_URL: DATABASE_URL ? '<redacted>' : undefined,
  DISCOGS_USER_TOKEN: DISCOGS_USER_TOKEN ? '<redacted>' : undefined,
});

async function main() {
  if (config.NODE_ENV === 'test') {
    return;
  }

  LOGGER.info({ config: redact(config) }, 'Starting server');
  await startServer();
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
