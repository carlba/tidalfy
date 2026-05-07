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
  const releaseFormat = normalizeResultFormat(result.format);
  const releaseCoverArtUrl = result.cover_image ?? result.thumb ?? null;
  const releaseDate = result.year ? String(result.year) : null;
  const releaseTitle = result.title ?? null;
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
    artistCredit,
    releaseTitle,
    releaseDate,
    releaseCountry: result.country ?? null,
    releaseLabel,
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

function mergeCandidates(
  primary: DiscogsCandidate[],
  secondary: DiscogsCandidate[]
): DiscogsCandidate[] {
  const seen = new Set<string>();
  return [
    ...primary,
    ...secondary.filter(candidate => {
      if (seen.has(candidate.discogsReleaseId)) {
        return false;
      }
      seen.add(candidate.discogsReleaseId);
      return true;
    }),
  ];
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
  if (parsed.success) {
    LOGGER.debug(
      {
        discogsBarcodeFields: parsed.data.results.map(result => ({
          id: result.id,
          barcode: result.barcode ?? null,
          barcodes: result.barcodes ?? null,
        })),
      },
      'Received Discogs barcode fields from search response'
    );
  } else {
    LOGGER.debug({ discogsResponse: response }, 'Received Discogs API response');
  }
  if (!parsed.success) {
    return [];
  }

  const results = parsed.data.results.filter(
    result => result.type === 'release' || result.type === 'master'
  );

  const candidates = results
    .slice(0, 20)
    .map(result => buildCandidate(result, title, artistCredit));

  return candidates;
}

export async function searchDiscogs(
  trackName: string,
  artistName: string,
  albumName?: string
): Promise<DiscogsCandidate[]> {
  const token = getDiscogsToken();
  const title = trackName || artistName || 'Discogs Search';
  const artistCredit = artistName || 'Unknown Artist';

  const baseParams = new URLSearchParams({ per_page: '50' });
  if (artistName) {
    baseParams.set('artist', artistName);
  }
  if (trackName) {
    baseParams.set('track', trackName);
  }
  if (albumName) {
    baseParams.set('release_title', albumName);
  }

  const albumQueryText = [trackName, artistName].filter(Boolean).join(' ').trim();
  const albumExactParams = new URLSearchParams({
    q: albumQueryText,
    type: 'all',
    format: 'Album',
    format_exact: 'Album',
    per_page: '50',
  });
  const albumExactMasterParams = new URLSearchParams(albumExactParams);
  albumExactMasterParams.set('type', 'master');

  const baseMasterParams = new URLSearchParams(baseParams);
  baseMasterParams.set('type', 'master');

  const albumCandidates = await runDiscogsSearch(token, albumExactParams, title, artistCredit);
  const baseCandidates = await runDiscogsSearch(token, baseParams, title, artistCredit);
  const albumMasterCandidates = await runDiscogsSearch(
    token,
    albumExactMasterParams,
    title,
    artistCredit
  );
  const baseMasterCandidates = await runDiscogsSearch(token, baseMasterParams, title, artistCredit);

  const masterCandidates = mergeCandidates(albumMasterCandidates, baseMasterCandidates);
  const releaseCandidates = mergeCandidates(albumCandidates, baseCandidates);
  if (masterCandidates.length > 0) {
    return mergeCandidates(masterCandidates, releaseCandidates);
  }
  if (releaseCandidates.length > 0) {
    return releaseCandidates;
  }

  const queryParams = new URLSearchParams({
    q: albumQueryText,
    per_page: '50',
  });
  const queryMasterParams = new URLSearchParams(queryParams);
  queryMasterParams.set('type', 'master');

  const queryMasterCandidates = await runDiscogsSearch(
    token,
    queryMasterParams,
    title,
    artistCredit
  );
  if (queryMasterCandidates.length > 0) {
    return queryMasterCandidates;
  }

  const queryCandidates = await runDiscogsSearch(token, queryParams, title, artistCredit);
  if (queryCandidates.length > 0) {
    return queryCandidates;
  }

  const trackOnlyParams = new URLSearchParams({
    q: trackName,
    per_page: '50',
  });
  const trackOnlyMasterParams = new URLSearchParams(trackOnlyParams);
  trackOnlyMasterParams.set('type', 'master');

  const trackOnlyMasterCandidates = await runDiscogsSearch(
    token,
    trackOnlyMasterParams,
    title,
    artistCredit
  );
  if (trackOnlyMasterCandidates.length > 0) {
    return trackOnlyMasterCandidates;
  }

  return runDiscogsSearch(token, trackOnlyParams, title, artistCredit);
}
