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

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseSpotifyCsv(csvContent: string): ParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: 'CSV has no data rows', raw: '' }] };
  }

  const headerFields = parseCsvLine(lines[0]);
  const expectedHeaders = CSV_HEADER as readonly string[];

  // Validate header matches expected columns (first 12 required columns)
  const requiredHeaders = expectedHeaders.slice(0, 12);
  for (const required of requiredHeaders) {
    if (!headerFields.includes(required)) {
      return {
        valid: [],
        errors: [{ row: 0, message: `Missing required column: ${required}`, raw: lines[0] }],
      };
    }
  }

  const valid: SpotifyTrackRow[] = [];
  const errors: { row: number; message: string; raw: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const fields = parseCsvLine(rawLine);
    const rowObject = Object.fromEntries(
      headerFields.map((header, idx) => [header, fields[idx] ?? ''])
    );

    const result = spotifyTrackRowSchema.safeParse(rowObject);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        row: i,
        message: result.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
        raw: rawLine,
      });
    }
  }

  return { valid, errors };
}
