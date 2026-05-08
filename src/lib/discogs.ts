import got from 'got';
import { z } from 'zod';
import { createLogger } from './logger.js';
import { config } from '../registry.js';

const LOGGER = createLogger(undefined, 'development').child({ module: 'discogs' });

const DISCOGS_BASE_URL = 'https://api.discogs.com';
const USER_AGENT = 'tidalfy/0.0.1 (https://github.com/carlba/tidalfy)';

const discogsSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.union([z.number(), z.string()]).optional(),
  country: z.string().optional(),
  label: z.array(z.string()).optional(),
  format: z.union([z.string(), z.array(z.string())]).optional(),
  barcode: z.union([z.string(), z.array(z.string())]).optional(),
  barcodes: z.array(z.string()).optional(),
  thumb: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  resource_url: z.string(),
  type: z.string().optional(),
});

const discogsSearchResponseSchema = z.object({
  results: z.array(discogsSearchResultSchema),
});

export interface DiscogsCandidate {
  discogsReleaseId: string;
  title: string;
  artistCredit: string;
  releaseTitle: string | null;
  releaseDate: string | null;
  releaseCountry: string | null;
  releaseLabel: string | null;
  releaseType: string | null;
  releaseFormat: string | null;
  releaseBarcode: string | null;
  releaseBarcodeRaw: string[];
  releaseEans: string[];
  releaseCoverArtUrl: string | null;
  resourceUrl: string | null;
  isCompilation?: boolean;
  isSingle?: boolean;
  isAlbum?: boolean;
  isMaster: boolean;
}

const discogsClient = got.extend({
  prefixUrl: DISCOGS_BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  },
  responseType: 'json',
});

function getDiscogsToken(): string {
  const rawToken = config.DISCOGS_USER_TOKEN as unknown;
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token) {
    throw new Error('Missing DISCOGS_USER_TOKEN environment variable');
  }
  return token;
}

function normalizeResultFormat(format: string | string[] | undefined): string | null {
  if (!format) {
    return null;
  }
  if (Array.isArray(format)) {
    return format.filter(Boolean).join(', ').trim() || null;
  }
  return format.trim() || null;
}

function deriveReleaseFormat(format: string | string[] | undefined): string | null {
  const normalized = normalizeResultFormat(format)?.toLowerCase() ?? '';
  if (!normalized) {
    return null;
  }
  if (/compilation|various artists|various|soundtrack/.test(normalized)) {
    return 'Compilation';
  }
  if (/\bsingle\b|\b7\b|7"|7’|12"|12’|\b45 rpm\b|\bpromo\b/.test(normalized)) {
    return 'Single';
  }
  if (/\balbum\b|\blp\b|\blong play\b/.test(normalized)) {
    return 'Album';
  }
  return null;
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseDiscogsArtistAndTitle(title: string): {
  artist: string | null;
  releaseTitle: string;
} {
  const match = /^(.*?)\s*[-–—]\s*(.+)$/.exec(title);
  if (!match) {
    return { artist: null, releaseTitle: title };
  }

  const artist = normalizeString(match[1]);
  const releaseTitle = normalizeString(match[2]) ?? title;
  return { artist, releaseTitle };
}

export function extractEanCandidates(raw: string): string[] {
  return raw
    .split(/[\n,;|]/g)
    .map(segment => segment.replace(/\D/g, ''))
    .filter(Boolean)
    .map(digits => (digits.length === 12 ? `0${digits}` : digits))
    .filter(digits => digits.length === 13);
}

export function normalizeDiscogsBarcode(raw: string | string[] | null | undefined): {
  primary: string | null;
  all: string[];
} {
  if (!raw) return { primary: null, all: [] as string[] };

  const normalized = Array.isArray(raw) ? raw.join('\n') : raw;
  const all = extractEanCandidates(normalized);
  return {
    primary: all[0] ?? null,
    all,
  };
}

function buildCandidate(
  result: z.infer<typeof discogsSearchResultSchema>,
  title: string,
  artistCredit: string
): DiscogsCandidate {
  const releaseLabel = result.label?.[0] ?? null;
  const releaseFormat = deriveReleaseFormat(result.format);
  const releaseType = result.type ?? null;
  const releaseCoverArtUrl = result.cover_image ?? result.thumb ?? null;
  const releaseDate = normalizeString(result.year ? String(result.year) : null);
  const rawTitle = normalizeString(result.title) ?? null;
  const parsedTitle = rawTitle
    ? parseDiscogsArtistAndTitle(rawTitle)
    : { artist: null, releaseTitle: rawTitle ?? '' };
  const releaseTitle = normalizeString(parsedTitle.releaseTitle) ?? null;
  const candidateArtistCredit = parsedTitle.artist ?? artistCredit;
  const normalizedText = `${releaseTitle ?? ''} ${releaseFormat ?? ''}`;
  const isCompilation = /compilation|various artists|various|soundtrack/i.test(normalizedText);
  const isSingle = /\bsingle\b|\b7\b|7"|7’|12"|12’|\b45 rpm\b|\bpromo\b/i.test(normalizedText);
  const isAlbum = /\balbum\b|\blp\b|\blong play\b/i.test(releaseFormat ?? '');

  const rawBarcode = Array.isArray(result.barcode)
    ? result.barcode.filter(Boolean)
    : result.barcode
      ? [result.barcode]
      : [];
  const rawBarcodes = result.barcodes?.filter(Boolean) ?? [];
  const releaseBarcodeRaw = [...rawBarcode, ...rawBarcodes];
  const normalizedBarcode = normalizeDiscogsBarcode(releaseBarcodeRaw);

  return {
    discogsReleaseId: String(result.id),
    title,
    artistCredit: candidateArtistCredit,
    releaseTitle,
    releaseDate,
    releaseCountry: result.country ?? null,
    releaseLabel,
    releaseType,
    releaseFormat,
    releaseBarcode: normalizedBarcode.primary,
    releaseBarcodeRaw,
    releaseEans: normalizedBarcode.all,
    releaseCoverArtUrl,
    resourceUrl: result.resource_url,
    isCompilation,
    isSingle,
    isAlbum,
    isMaster: result.type === 'master',
  };
}

function mergeOrderedCandidates(groups: DiscogsCandidate[][]): DiscogsCandidate[] {
  const seen = new Set<string>();
  return groups.flatMap(group =>
    group.filter(candidate => {
      if (seen.has(candidate.discogsReleaseId)) {
        return false;
      }
      seen.add(candidate.discogsReleaseId);
      return true;
    })
  );
}

async function runDiscogsSearch(
  token: string,
  searchParams: URLSearchParams,
  title: string,
  artistCredit: string
): Promise<DiscogsCandidate[]> {
  if (!searchParams.has('sort')) {
    searchParams.set('sort', 'relevance');
  }
  if (!searchParams.has('sort_order')) {
    searchParams.set('sort_order', 'desc');
  }
  LOGGER.debug(
    {
      service: 'Discogs',
      searchParams: Object.fromEntries(searchParams.entries()),
    },
    'Sending Discogs search request'
  );

  const response = await discogsClient
    .get('database/search', {
      headers: { Authorization: `Discogs token=${token}` },
      searchParams,
    })
    .json<unknown>();

  const parsed = discogsSearchResponseSchema.safeParse(response);
  if (!parsed.success) {
    return [];
  }

  const results = parsed.data.results.filter(
    result => result.type === 'release' || result.type === 'master'
  );

  const candidates = results
    .slice(0, 50)
    .map(result => buildCandidate(result, title, artistCredit));

  return candidates;
}

export async function searchDiscogs(
  trackName: string,
  artistName: string,
  albumName?: string,
  extended = false,
  freeText = false
): Promise<DiscogsCandidate[]> {
  const token = getDiscogsToken();
  const title = trackName;
  const artistCredit = artistName;
  const normalizedTrackName = trackName.replace(/['’]/g, '');
  const freeTextQuery = [trackName, artistName, albumName].filter(Boolean).join(' ').trim();

  const albumMasterParams = new URLSearchParams({
    per_page: '50',
    type: 'master',
    format: 'Album',
    format_exact: 'Album',
  });
  if (freeText) {
    if (freeTextQuery) {
      albumMasterParams.set('q', freeTextQuery);
    }
  } else {
    if (artistName) {
      albumMasterParams.set('artist', artistName);
    }
    if (normalizedTrackName) {
      albumMasterParams.set('track', normalizedTrackName);
    }
    if (albumName) {
      albumMasterParams.set('release_title', albumName);
    }
  }

  const albumReleaseParams = new URLSearchParams({
    per_page: '50',
    type: 'release',
  });

  // albumReleaseParams.append('format', 'Compilation');
  albumReleaseParams.append('format', 'Album');

  if (freeText) {
    if (freeTextQuery) {
      albumReleaseParams.set('q', freeTextQuery);
    }
  } else {
    if (artistName) {
      albumReleaseParams.set('artist', artistName);
    }
    if (normalizedTrackName) {
      albumReleaseParams.set('track', normalizedTrackName);
    }
    if (albumName) {
      albumReleaseParams.set('release_title', albumName);
    }
  }

  const singlesQueryText = freeText
    ? freeTextQuery
    : [normalizedTrackName, artistName].filter(Boolean).join(' ').trim();
  const singlesMasterParams = new URLSearchParams({
    q: singlesQueryText,
    per_page: '50',
    type: 'master',
    format: 'Single',
    format_exact: 'Single',
  });

  const singlesReleaseParams = new URLSearchParams({
    q: singlesQueryText,
    per_page: '50',
    format: 'Single',
  });

  const allSearches = await Promise.all([
    runDiscogsSearch(token, albumMasterParams, title, artistCredit),
    extended
      ? runDiscogsSearch(token, albumReleaseParams, title, artistCredit)
      : Promise.resolve([]),
    runDiscogsSearch(token, singlesMasterParams, title, artistCredit),
    extended
      ? runDiscogsSearch(token, singlesReleaseParams, title, artistCredit)
      : Promise.resolve([]),
  ]);

  LOGGER.debug({ freeText, title, artistCredit, normalizedTrackName }, 'freetest');

  const mergedCandidates = mergeOrderedCandidates(allSearches);
  return mergedCandidates;
}
