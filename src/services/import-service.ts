import { prisma } from '../lib/db.js';
import { parseSpotifyCsv, type ParseResult } from '../lib/csv-parser.js';

export interface ImportBatchResult {
  batchId: string;
  fileName: string;
  importedCount: number;
  errors: ParseResult['errors'];
}

export function parseDelimitedList(rawValue: string): string[] {
  return rawValue
    .split(/[,;]+/)
    .map(value => value.trim())
    .filter(value => value.length > 0);
}

export async function importSpotifyCsv(
  csvContent: string,
  fileName: string
): Promise<ImportBatchResult> {
  const { valid, errors } = parseSpotifyCsv(csvContent);

  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      tracks: {
        create: valid.map(row => ({
          spotifyUri: row['Track URI'],
          trackName: row['Track Name'],
          albumName: row['Album Name'],
          artistNames: parseDelimitedList(row['Artist Name(s)']),
          releaseDate: row['Release Date'] ?? null,
          durationMs: row['Duration (ms)'],
          popularity: row.Popularity,
          explicit: row.Explicit,
          addedBy: row['Added By'] ?? null,
          addedAt: row['Added At'] ?? null,
          genres: row.Genres ? parseDelimitedList(row.Genres) : [],
          recordLabel: row['Record Label'] ?? null,
          rawData: row,
        })),
      },
    },
  });

  return {
    batchId: batch.id,
    fileName: batch.fileName,
    importedCount: valid.length,
    errors,
  };
}
