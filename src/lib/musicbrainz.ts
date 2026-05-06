import got from 'got';
import { z } from 'zod';

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'tidalfy/0.0.1 (https://github.com/carlba/tidalfy)';

const musicBrainzArtistCreditSchema = z.object({
  artist: z.object({ id: z.string(), name: z.string() }),
  name: z.string().optional(),
});

const musicBrainzReleaseGroupSchema = z.object({
  'primary-type': z.string().optional(),
  'secondary-types': z.array(z.string()).optional(),
});

const musicBrainzReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
  country: z.string().optional(),
  status: z.string().optional(),
  'release-group': musicBrainzReleaseGroupSchema.optional(),
});

const musicBrainzRecordingSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number().optional(),
  length: z.number().optional(),
  disambiguation: z.string().optional(),
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
  releaseId: string | null;
  releaseTitle: string | null;
  releaseDate: string | null;
  releaseCountry: string | null;
  releaseStatus: string | null;
  releaseType: string | null;
  releaseSecondaryTypes: string[];
  durationMs: number | null;
  disambiguation: string | null;
  score: number | null;
}

const mbClient = got.extend({
  prefixUrl: MUSICBRAINZ_BASE_URL,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  responseType: 'json',
});

function normalizeQueryText(text: string): string {
  return text.replace(/"/g, '').trim();
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase();
}

function isOfficialRelease(release: z.infer<typeof musicBrainzReleaseSchema>): boolean {
  return release.status?.toLowerCase() === 'official';
}

function releaseScore(
  release: z.infer<typeof musicBrainzReleaseSchema>,
  albumName?: string,
  includeAlbum = false
): readonly [number, number, number, number, string] {
  const normalizedTitle = normalizeSearchText(release.title);
  const normalizedAlbum = albumName ? normalizeSearchText(albumName) : '';
  const exactAlbumMatch = albumName && normalizedTitle === normalizedAlbum;
  const containsAlbumMatch = albumName && normalizedTitle.includes(normalizedAlbum);

  const albumScore = exactAlbumMatch ? 0 : containsAlbumMatch ? 1 : includeAlbum ? 3 : 2;
  const statusScore = isOfficialRelease(release) ? 0 : 1;
  const liveScore = /live|bootleg|compilation|demo|remix/i.test(release.title) ? 1 : 0;
  const dateScore = parseInt(release.date?.slice(0, 4) ?? '9999', 10);

  return [albumScore, statusScore, liveScore, dateScore, normalizedTitle];
}

function sortReleases(
  releases: z.infer<typeof musicBrainzReleaseSchema>[],
  albumName?: string,
  includeAlbum = false
) {
  return [...releases].sort((left, right) => {
    const leftScore = releaseScore(left, albumName, includeAlbum);
    const rightScore = releaseScore(right, albumName, includeAlbum);

    for (let i = 0; i < leftScore.length; i += 1) {
      if (leftScore[i] < rightScore[i]) return -1;
      if (leftScore[i] > rightScore[i]) return 1;
    }
    return 0;
  });
}

function earliestRelease(
  releases: z.infer<typeof musicBrainzReleaseSchema>[]
): z.infer<typeof musicBrainzReleaseSchema> | null {
  return (
    [...releases].sort((left, right) => {
      const leftDate = left.date ?? '9999';
      const rightDate = right.date ?? '9999';
      return leftDate.localeCompare(rightDate);
    })[0] ?? null
  );
}

function findAlbumRelease(
  releases: z.infer<typeof musicBrainzReleaseSchema>[],
  albumName: string
): z.infer<typeof musicBrainzReleaseSchema> | null {
  const normalizedAlbum = normalizeSearchText(albumName);
  const exactMatches = releases.filter(
    release => normalizeSearchText(release.title) === normalizedAlbum
  );

  if (exactMatches.length > 0) {
    return earliestRelease(exactMatches);
  }

  const includedMatches = releases.filter(release =>
    normalizeSearchText(release.title).includes(normalizedAlbum)
  );

  return earliestRelease(includedMatches);
}

function findReleaseByTrackDate(
  releases: z.infer<typeof musicBrainzReleaseSchema>[],
  trackReleaseDate: string
): z.infer<typeof musicBrainzReleaseSchema> | null {
  const normalizedTrackDate = trackReleaseDate.trim();
  const trackYear = normalizedTrackDate.slice(0, 4);
  const exactMatches = releases.filter(release => release.date === normalizedTrackDate);

  if (exactMatches.length > 0) {
    return earliestRelease(exactMatches);
  }

  const prefixMatches = releases.filter(release => release.date?.startsWith(normalizedTrackDate));
  if (prefixMatches.length > 0) {
    return earliestRelease(prefixMatches);
  }

  const yearMatches = releases.filter(release => release.date?.startsWith(trackYear));
  return earliestRelease(yearMatches);
}

export function selectBestRelease(
  releases: z.infer<typeof musicBrainzReleaseSchema>[] | undefined,
  albumName?: string,
  trackReleaseDate?: string | null
): z.infer<typeof musicBrainzReleaseSchema> | null {
  if (!releases || releases.length === 0) {
    return null;
  }

  if (albumName) {
    const albumMatch = findAlbumRelease(releases, albumName);
    if (albumMatch) {
      return albumMatch;
    }
  }

  if (trackReleaseDate) {
    const dateMatch = findReleaseByTrackDate(releases, trackReleaseDate);
    if (dateMatch) {
      return dateMatch;
    }
  }

  return [...releases].sort((left, right) => {
    const leftDate = left.date ?? '9999';
    const rightDate = right.date ?? '9999';
    return leftDate.localeCompare(rightDate);
  })[0];
}

export async function searchMusicBrainz(
  trackName: string,
  artistName: string,
  albumName?: string,
  trackReleaseDate?: string | null,
  includeAlbum = false,
  useScoreOnly = false
): Promise<MusicBrainzCandidate[]> {
  const sanitizedTrackName = normalizeQueryText(trackName);
  const sanitizedArtistName = normalizeQueryText(artistName);
  const sanitizedAlbumName = albumName ? normalizeQueryText(albumName) : undefined;

  const baseQuery = [`recording:"${sanitizedTrackName}"`, `artist:"${sanitizedArtistName}"`];
  const albumQuery = sanitizedAlbumName
    ? [...baseQuery, `release:"${sanitizedAlbumName}"`]
    : baseQuery;

  async function runSearch(query: string) {
    const response = await mbClient
      .get('recording', {
        searchParams: { query, limit: 100, fmt: 'json', inc: 'releases+release-groups' },
      })
      .json<unknown>();

    const parsed = musicBrainzSearchResponseSchema.safeParse(response);
    if (!parsed.success) {
      return [] as MusicBrainzCandidate[];
    }

    const candidates = parsed.data.recordings.flatMap(recording => {
      const releases = recording.releases ?? [];
      const officialReleases = releases.filter(isOfficialRelease);
      const releasePool = officialReleases.length > 0 ? officialReleases : releases;
      const sortedReleases = sortReleases(releasePool, sanitizedAlbumName, includeAlbum);
      const releaseCandidates = sortedReleases.slice(0, 8);

      return releaseCandidates.map(release => {
        const releaseType = release['release-group']?.['primary-type'] ?? null;
        const releaseSecondaryTypes = release['release-group']?.['secondary-types'] ?? [];

        return {
          mbid: recording.id,
          title: recording.title,
          artistCredit:
            recording['artist-credit']?.map(ac => ac.name ?? ac.artist.name).join(', ') ?? '',
          releaseId: release.id,
          releaseTitle: release.title,
          releaseDate: release.date ?? null,
          releaseCountry: release.country ?? null,
          releaseStatus: release.status ?? null,
          releaseType,
          releaseSecondaryTypes,
          durationMs: recording.length ?? null,
          disambiguation: recording.disambiguation ?? null,
          score: recording.score ?? null,
        };
      });
    });

    const filteredCandidates = sanitizedAlbumName
      ? candidates.filter(candidate =>
          normalizeSearchText(candidate.releaseTitle ?? '').includes(sanitizedAlbumName)
        )
      : candidates;

    const resultCandidates =
      sanitizedAlbumName && filteredCandidates.length > 0 ? filteredCandidates : candidates;

    return resultCandidates.sort((left, right) => {
      if (useScoreOnly) {
        const leftScore = left.score ?? 0;
        const rightScore = right.score ?? 0;
        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }
        const leftDate = left.releaseDate ? parseInt(left.releaseDate.slice(0, 4), 10) : 9999;
        const rightDate = right.releaseDate ? parseInt(right.releaseDate.slice(0, 4), 10) : 9999;
        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }
        return 0;
      }

      const leftAlbum = left.releaseTitle ? normalizeSearchText(left.releaseTitle) : '';
      const rightAlbum = right.releaseTitle ? normalizeSearchText(right.releaseTitle) : '';
      const leftExact = sanitizedAlbumName && leftAlbum === sanitizedAlbumName;
      const rightExact = sanitizedAlbumName && rightAlbum === sanitizedAlbumName;

      if (leftExact !== rightExact) {
        return leftExact ? -1 : 1;
      }

      if (left.releaseStatus !== right.releaseStatus) {
        if (left.releaseStatus === 'Official') return -1;
        if (right.releaseStatus === 'Official') return 1;
      }

      const leftLive = /live|bootleg|compilation|demo|remix/i.test(left.releaseTitle ?? '') ? 1 : 0;
      const rightLive = /live|bootleg|compilation|demo|remix/i.test(right.releaseTitle ?? '')
        ? 1
        : 0;
      if (leftLive !== rightLive) {
        return leftLive - rightLive;
      }

      const leftDate = left.releaseDate ? parseInt(left.releaseDate.slice(0, 4), 10) : 9999;
      const rightDate = right.releaseDate ? parseInt(right.releaseDate.slice(0, 4), 10) : 9999;
      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return 0;
    });
  }

  if (includeAlbum && sanitizedAlbumName) {
    const albumResults = await runSearch(albumQuery.join(' AND '));
    if (albumResults.length > 0) {
      return albumResults;
    }
  }

  return await runSearch(baseQuery.join(' AND '));
}
