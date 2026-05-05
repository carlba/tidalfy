import got, { HTTPError } from 'got';
import { z } from 'zod';

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'tidalfy/0.0.1 (https://github.com/carlba/tidalfy)';

const musicBrainzArtistCreditSchema = z.object({
  artist: z.object({ id: z.string(), name: z.string() }),
  name: z.string().optional(),
});

const musicBrainzReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
});

const musicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number().optional(),
  'artist-credit': z.array(musicBrainzArtistCreditSchema).optional(),
  releases: z.array(musicBrainzReleaseSchema).optional(),
});

const musicBrainzSearchResponseSchema = z.object({
  recordings: z.array(musicBrainzRecordingSchema),
});

export interface MusicBrainzCandidate {
  mbid: string;
  title: string;
  artistCredit: string;
  releaseTitle: string | null;
  releaseDate: string | null;
  score: number | null;
}

const mbClient = got.extend({
  prefixUrl: MUSICBRAINZ_BASE_URL,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  responseType: 'json',
});

export async function searchMusicBrainz(
  trackName: string,
  artistName: string
): Promise<MusicBrainzCandidate[]> {
  const query = `recording:"${trackName}" AND artist:"${artistName}"`;

  try {
    const response = await mbClient
      .get('recording', { searchParams: { query, limit: 10, fmt: 'json' } })
      .json<unknown>();

    const parsed = musicBrainzSearchResponseSchema.safeParse(response);
    if (!parsed.success) {
      return [];
    }

    return parsed.data.recordings.map(recording => ({
      mbid: recording.id,
      title: recording.title,
      artistCredit:
        recording['artist-credit']?.map(ac => ac.name ?? ac.artist.name).join(', ') ?? '',
      releaseTitle: recording.releases?.[0]?.title ?? null,
      releaseDate: recording.releases?.[0]?.date ?? null,
      score: recording.score ?? null,
    }));
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new Error(
        `MusicBrainz search failed for "${trackName}" by "${artistName}": ${error.response.statusCode}`,
        { cause: error }
      );
    }
    throw error;
  }
}
