import { prisma } from '../lib/db.js';
import { parseSpotifyCsv, type ParseResult } from '../lib/csv-parser.js';

export interface ImportBatchResult {
  batchId: string;
  fileName: string;
  importedCount: number;
  errors: ParseResult['errors'];
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
          artistNames: row['Artist Name(s)']
            .split(',')
            .map(artistName => artistName.trim())
            .filter(artistName => artistName.length > 0),
          releaseDate: row['Release Date'] ?? null,
          durationMs: row['Duration (ms)'],
          popularity: row.Popularity,
          explicit: row.Explicit,
          addedBy: row['Added By'] ?? null,
          addedAt: row['Added At'] ?? null,
          genres: row.Genres
            ? row.Genres.split(',')
                .map(genre => genre.trim())
                .filter(genre => genre.length > 0)
            : [],
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
