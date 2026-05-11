import { describe, expect, it, vi } from 'vitest';

vi.mock('./server.js', () => ({
  startServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./registry.js', () => ({
  config: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    PORT: 3000,
    DISCOGS_USER_TOKEN: undefined,
    isDevelopment: true,
  },
  LOGGER: {
    info: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

describe('index entrypoint', () => {
  it('imports without throwing', async () => {
    await expect(import('./index.js')).resolves.toBeDefined();
  });
});
