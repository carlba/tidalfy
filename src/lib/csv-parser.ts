import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const CSV_HEADER = [
  'Track URI',
  'Track Name',
  'Album Name',
  'Artist Name(s)',
  'Release Date',
  'Duration (ms)',
  'Popularity',
  'Explicit',
  'Added By',
  'Added At',
  'Genres',
  'Record Label',
  'Danceability',
  'Energy',
  'Key',
  'Loudness',
  'Mode',
  'Speechiness',
  'Acousticness',
  'Instrumentalness',
  'Liveness',
  'Valence',
  'Tempo',
  'Time Signature',
] as const;

export const spotifyTrackRowSchema = z.object({
  'Track URI': z.string().startsWith('spotify:track:'),
  'Track Name': z.string().min(1),
  'Album Name': z.string(),
  'Artist Name(s)': z.string(),
  'Release Date': z.string().optional(),
  'Duration (ms)': z.coerce.number().int().nonnegative(),
  Popularity: z.coerce.number().int().min(0).max(100),
  Explicit: z
    .string()
    .transform(raw => raw.toLowerCase() === 'true')
    .pipe(z.boolean()),
  'Added By': z.string().optional(),
  'Added At': z
    .string()
    .optional()
    .transform(val => (val ? new Date(val) : undefined)),
  Genres: z.string().optional(),
  'Record Label': z.string().optional(),
});

export type SpotifyTrackRow = z.infer<typeof spotifyTrackRowSchema>;

export interface ParseResult {
  valid: SpotifyTrackRow[];
  errors: { row: number; message: string; raw: string }[];
}

export function parseSpotifyCsv(csvContent: string): ParseResult {
  if (csvContent.trim().length === 0) {
    return { valid: [], errors: [{ row: 0, message: 'CSV has no data rows', raw: '' }] };
  }

  let records: string[][];
  try {
    records = parse(csvContent, {
      bom: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
    });
  } catch (error) {
    return {
      valid: [],
      errors: [
        {
          row: 0,
          message: error instanceof Error ? error.message : String(error),
          raw: csvContent,
        },
      ],
    };
  }

  if (records.length < 2) {
    return { valid: [], errors: [{ row: 0, message: 'CSV has no data rows', raw: '' }] };
  }

  const headerFields = records[0].map(field => String(field));
  const expectedHeaders = CSV_HEADER as readonly string[];
  const requiredHeaders = expectedHeaders.slice(0, 12);

  for (const required of requiredHeaders) {
    if (!headerFields.includes(required)) {
      return {
        valid: [],
        errors: [
          {
            row: 0,
            message: `Missing required column: ${required}`,
            raw: headerFields.join(','),
          },
        ],
      };
    }
  }

  const valid: SpotifyTrackRow[] = [];
  const errors: { row: number; message: string; raw: string }[] = [];

  for (let i = 0; i < records.length - 1; i++) {
    const rowNumber = i + 1;
    const fields = records[i + 1];
    const rowObject = Object.fromEntries(
      headerFields.map((header, idx) => [header, String(fields[idx] ?? '')])
    );

    const result = spotifyTrackRowSchema.safeParse(rowObject);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        row: rowNumber,
        message: result.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
        raw: fields.join(','),
      });
    }
  }

  return { valid, errors };
}
