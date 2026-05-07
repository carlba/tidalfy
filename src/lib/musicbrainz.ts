import got from 'got';
import { z } from 'zod';
import Keyv from 'keyv';
import KeyvPostgres from '@keyv/postgres';
import { config, LOGGER } from '../registry.js';

const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'tidalfy/0.0.1 (https://github.com/carlba/tidalfy)';
const MUSICBRAINZ_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

const logger = LOGGER.child({ module: 'musicbrainz' });
const cacheStore = config.isDevelopment
  ? new Keyv({
      store: new KeyvPostgres({ uri: config.DATABASE_CACHE_URL, table: 'musicbrainz_got_cache' }),
      ttl: MUSICBRAINZ_CACHE_TTL_MS,
    })
  : undefined;

const mbClient = got.extend({
  prefixUrl: MUSICBRAINZ_BASE_URL,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  responseType: 'json',
  cache: cacheStore,
  hooks: {
    beforeCache: [
      response => {
        if (!config.isDevelopment) {
          return;
        }

        response.headers['cache-control'] =
          `public, max-age=${MUSICBRAINZ_CACHE_TTL_MS / 1000}, immutable`;
      },
    ],
  },
});

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
  barcode: z.string().optional(),
  asin: z.string().optional(),
  packaging: z.string().optional(),
  'cover-art-archive': z
    .object({
      front: z.boolean().optional(),
      back: z.boolean().optional(),
      artwork: z.boolean().optional(),
      count: z.number().optional(),
      darkened: z.boolean().optional(),
    })
    .optional(),
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
  isrcs: z.array(z.string()).optional(),
});

const musicBrainzSearchResponseSchema = z.object({
  recordings: z.array(musicBrainzRecordingSchema),
});

export interface MusicBrainzCandidate {
  mbid: string;
  title: string;
  artistCredit: string;
  releaseId: string | null;
  releaseBarcode: string | null;
  releaseCoverArtUrl: string | null;
  releasePackaging: string | null;
  releaseAsin: string | null;
  releaseHasCoverArt: boolean;
  releaseTitle: string | null;
  releaseDate: string | null;
  releaseCountry: string | null;
  releaseStatus: string | null;
  releaseType: string | null;
  releaseSecondaryTypes: string[];
  durationMs: number | null;
  disambiguation: string | null;
  isrc: string | null;
  score: number | null;
}

interface ReleaseMetadata {
  barcode: string | null;
  packaging: string | null;
  asin: string | null;
  hasCoverArt: boolean;
}

const DEFAULT_RELEASE_METADATA: ReleaseMetadata = {
  barcode: null,
  packaging: null,
  asin: null,
  hasCoverArt: false,
};

const releaseMetadataSchema = z
  .object({
    barcode: z.string().optional(),
    packaging: z.string().optional(),
    asin: z.string().optional(),
    'cover-art-archive': z
      .object({
        front: z.boolean().optional(),
        artwork: z.boolean().optional(),
      })
      .optional(),
  })
  .transform(record => ({
    barcode: record.barcode?.length ? record.barcode : null,
    packaging: record.packaging?.length ? record.packaging : null,
    asin: record.asin?.length ? record.asin : null,
    hasCoverArt:
      Boolean(record['cover-art-archive']?.front) || Boolean(record['cover-art-archive']?.artwork),
  }));

async function fetchReleaseMetadata(
  releaseIds: string[]
): Promise<Record<string, ReleaseMetadata>> {
  const results = await Promise.allSettled(
    releaseIds.map(async releaseId => {
      const response = await mbClient.get(`release/${releaseId}`, {
        searchParams: { fmt: 'json' },
      });

      logger.debug(
        {
          module: 'MusicBrainz',
          context: fetchReleaseMetadata.name,
          releaseId,
          url: `${MUSICBRAINZ_BASE_URL}/release/${releaseId}`,
          isFromCache: response.isFromCache,
        },
        'Retrieving MusicBrainz release metadata'
      );

      const parsed = releaseMetadataSchema.safeParse(JSON.stringify(response.body));
      if (!parsed.success) {
        return [releaseId, DEFAULT_RELEASE_METADATA] as const;
      }

      return [releaseId, parsed.data] as const;
    })
  );

  return results.reduce<Record<string, ReleaseMetadata>>((map, result, index) => {
    const releaseId = releaseIds[index];
    if (result.status === 'fulfilled') {
      const [id, metadata] = result.value;
      map[id] = metadata;
    } else {
      map[releaseId] = DEFAULT_RELEASE_METADATA;
    }
    return map;
  }, {});
}

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

function releaseMatchesSearchFilters(
  release: z.infer<typeof musicBrainzReleaseSchema>,
  onlyAlbum: boolean,
  noSecondaryType: boolean
): boolean {
  const releaseGroup = release['release-group'];

  if (onlyAlbum && releaseGroup?.['primary-type'] !== 'Album') {
    return false;
  }

  if (noSecondaryType && (releaseGroup?.['secondary-types']?.length ?? 0) > 0) {
    return false;
  }

  return true;
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
  useScoreOnly = false,
  onlyAlbum = true,
  noSecondaryType = true
): Promise<MusicBrainzCandidate[]> {
  try {
    const sanitizedTrackName = normalizeQueryText(trackName);
    const sanitizedArtistName = normalizeQueryText(artistName);
    const sanitizedAlbumName = albumName ? normalizeQueryText(albumName) : undefined;

    const baseQuery = [`recording:"${sanitizedTrackName}"`, `artist:"${sanitizedArtistName}"`];
    const albumQuery = sanitizedAlbumName
      ? [...baseQuery, `release:"${sanitizedAlbumName}"`]
      : baseQuery;

    async function runSearch(query: string) {
      const pageSize = 100;
      let offset = 0;
      const allRecordings: z.infer<typeof musicBrainzRecordingSchema>[] = [];

      while (true) {
        let response: unknown;
        try {
          logger.debug(
            {
              service: 'MusicBrainz',
              query,
              offset,
              limit: pageSize,
            },
            'Sending MusicBrainz search request'
          );

          response = await mbClient
            .get('recording', {
              searchParams: {
                query,
                limit: pageSize,
                offset,
                fmt: 'json',
                inc: 'releases+release-groups+isrcs',
              },
            })
            .json<unknown>();
        } catch (error) {
          logger.warn(
            {
              service: 'MusicBrainz',
              query,
              offset,
              error: error instanceof Error ? error.message : String(error),
            },
            'MusicBrainz request failed'
          );
          return [] as MusicBrainzCandidate[];
        }

        const parsed = musicBrainzSearchResponseSchema.safeParse(response);
        if (!parsed.success) {
          return [] as MusicBrainzCandidate[];
        }

        const recordings = parsed.data.recordings;
        if (recordings.length === 0) {
          break;
        }

        allRecordings.push(...recordings);
        if (recordings.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      const filteredRecordings = allRecordings
        .map(recording => ({
          ...recording,
          releases: recording.releases?.filter(release =>
            releaseMatchesSearchFilters(release, onlyAlbum, noSecondaryType)
          ),
        }))
        .filter(recording => (recording.releases?.length ?? 0) > 0);

      const releaseIdsToFetch = Array.from(
        new Set(
          filteredRecordings
            .flatMap(recording => recording.releases ?? [])
            .filter(
              release =>
                release.barcode == null &&
                release.packaging == null &&
                release.asin == null &&
                release['cover-art-archive'] == null
            )
            .map(release => release.id)
        )
      );

      const releaseMetadata =
        releaseIdsToFetch.length > 0 ? await fetchReleaseMetadata(releaseIdsToFetch) : {};

      const candidates = filteredRecordings.flatMap(recording => {
        const releases = recording.releases ?? [];
        const officialReleases = releases.filter(isOfficialRelease);
        const releasePool = officialReleases.length > 0 ? officialReleases : releases;
        const sortedReleases = sortReleases(releasePool, sanitizedAlbumName, includeAlbum);
        return sortedReleases.map(release => {
          const releaseType = release['release-group']?.['primary-type'] ?? null;
          const releaseSecondaryTypes = release['release-group']?.['secondary-types'] ?? [];

          const metadata = releaseMetadata[release.id];
          const hasCoverArt =
            Boolean(release['cover-art-archive']?.front) ||
            Boolean(release['cover-art-archive']?.artwork) ||
            Boolean(metadata?.hasCoverArt);

          return {
            mbid: recording.id,
            title: recording.title,
            artistCredit:
              recording['artist-credit']?.map(ac => ac.name ?? ac.artist.name).join(', ') ?? '',
            releaseId: release.id,
            releaseBarcode: release.barcode ?? metadata?.barcode ?? null,
            releaseCoverArtUrl: hasCoverArt
              ? `https://coverartarchive.org/release/${release.id}/front`
              : null,
            releasePackaging: release.packaging ?? metadata?.packaging ?? null,
            releaseAsin: release.asin ?? metadata?.asin ?? null,
            releaseHasCoverArt: hasCoverArt,
            releaseTitle: release.title,
            releaseDate: release.date ?? null,
            releaseCountry: release.country ?? null,
            releaseStatus: release.status ?? null,
            releaseType,
            releaseSecondaryTypes,
            durationMs: recording.length ?? null,
            disambiguation: recording.disambiguation ?? null,
            isrc: recording.isrcs?.[0] ?? null,
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

        const leftLive = /live|bootleg|compilation|demo|remix/i.test(left.releaseTitle ?? '')
          ? 1
          : 0;
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
  } catch {
    return [];
  }
}
