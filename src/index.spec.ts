import { describe, expect, it, vi } from 'vitest';

vi.mock('./server.js', () => ({
  startServer: vi.fn().mockResolvedValue(undefined),
}));

describe('index entrypoint', () => {
  it('imports without throwing', async () => {
    await expect(import('./index.js')).resolves.toBeDefined();
  });
});
