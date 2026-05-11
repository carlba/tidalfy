process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
process.env.DATABASE_CACHE_URL =
  process.env.DATABASE_CACHE_URL ?? 'postgresql://user:pass@localhost:5432/test';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/db.js', () => ({
  prisma: {
    importBatch: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../lib/csv-parser.js', () => ({
  parseSpotifyCsv: vi.fn(),
}));

let parseDelimitedList: typeof import('./import-service.js').parseDelimitedList;
let importSpotifyCsv: typeof import('./import-service.js').importSpotifyCsv;
let mockedPrisma: { importBatch: { create: ReturnType<typeof vi.fn> } };
let mockedParseSpotifyCsv: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const module = await import('./import-service.js');
  parseDelimitedList = module.parseDelimitedList;
  importSpotifyCsv = module.importSpotifyCsv;

  const dbModule = await import('../lib/db.js');
  mockedPrisma = dbModule.prisma as unknown as {
    importBatch: { create: ReturnType<typeof vi.fn> };
  };

  const parserModule = await import('../lib/csv-parser.js');
  mockedParseSpotifyCsv = parserModule.parseSpotifyCsv as unknown as ReturnType<typeof vi.fn>;
});

describe('parseDelimitedList', () => {
  it('splits semicolon-separated values into separate entries', () => {
    expect(parseDelimitedList('Kleerup;ABBA')).toEqual(['Kleerup', 'ABBA']);
  });

  it('splits comma-separated values too', () => {
    expect(parseDelimitedList('A,B')).toEqual(['A', 'B']);
  });

  it('trims whitespace and removes empty values', () => {
    expect(parseDelimitedList(' A ; B, , C ')).toEqual(['A', 'B', 'C']);
  });
});

describe('importSpotifyCsv', () => {
  it('creates an import batch and saves Spotify rows through Prisma', async () => {
    mockedParseSpotifyCsv.mockReturnValue({
      valid: [
        {
          'Track URI': 'spotify:track:123',
          'Track Name': 'Song',
          'Album Name': 'Album',
          'Artist Name(s)': 'Kleerup;ABBA',
          'Release Date': '2020-01-01',
          'Duration (ms)': 180000,
          Popularity: 70,
          Explicit: false,
          'Added By': 'tester',
          'Added At': new Date('2020-01-01T00:00:00Z'),
          Genres: 'pop',
          'Record Label': 'Label',
        },
      ],
      errors: [],
    });

    mockedPrisma.importBatch.create.mockResolvedValue({
      id: 'batch-1',
      fileName: 'spotify.csv',
    });

    const result = await importSpotifyCsv('csv-content', 'spotify.csv');

    expect(mockedPrisma.importBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileName: 'spotify.csv',
          tracks: expect.objectContaining({
            create: [
              expect.objectContaining({
                spotifyUri: 'spotify:track:123',
                trackName: 'Song',
                albumName: 'Album',
                artistNames: ['Kleerup', 'ABBA'],
                releaseDate: '2020-01-01',
                durationMs: 180000,
                popularity: 70,
                explicit: false,
                addedBy: 'tester',
                genres: ['pop'],
                recordLabel: 'Label',
              }),
            ],
          }),
        }),
      })
    );

    expect(result).toEqual({
      batchId: 'batch-1',
      fileName: 'spotify.csv',
      importedCount: 1,
      errors: [],
    });
  });
});
