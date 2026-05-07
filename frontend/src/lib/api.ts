import type {
  DiscogsCandidate,
  DiscogsMatch,
  ImportBatch,
  ImportResult,
  MusicBrainzCandidate,
  MusicBrainzMatch,
  Track,
} from './types';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchBatches(): Promise<ImportBatch[]> {
  const response = await fetch('/api/batches');
  return handleResponse<ImportBatch[]>(response);
}

export async function uploadCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/batches', { method: 'POST', body: formData });
  return handleResponse<ImportResult>(response);
}

export type TrackStatus = 'active' | 'archived' | 'all';

export async function fetchTracks(
  batchId?: string,
  status: TrackStatus = 'active'
): Promise<Track[]> {
  const params = new URLSearchParams();
  if (batchId) params.set('batchId', batchId);
  if (status !== 'active') params.set('status', status);
  const query = params.toString();
  const url = query ? `/api/tracks?${query}` : '/api/tracks';
  const response = await fetch(url);
  return handleResponse<Track[]>(response);
}

export async function searchMusicBrainz(
  trackId: string,
  searchTitle = '',
  searchArtist = '',
  includeAlbum = false,
  albumName = '',
  useScoreOnly = false,
  onlyAlbum = true,
  noSecondaryType = true
): Promise<MusicBrainzCandidate[]> {
  const query = new URLSearchParams();
  if (searchTitle.trim()) {
    query.set('searchTitle', searchTitle.trim());
  }
  if (searchArtist.trim()) {
    query.set('searchArtist', searchArtist.trim());
  }
  if (includeAlbum) {
    query.set('includeAlbum', String(includeAlbum));
  }
  if (albumName.trim()) {
    query.set('albumName', albumName.trim());
  }
  query.set('useScoreOnly', String(useScoreOnly));
  query.set('onlyAlbum', String(onlyAlbum));
  query.set('noSecondaryType', String(noSecondaryType));

  const queryString = query.toString();
  const url = queryString
    ? `/api/tracks/${trackId}/musicbrainz?${queryString}`
    : `/api/tracks/${trackId}/musicbrainz`;
  const response = await fetch(url);
  return handleResponse<MusicBrainzCandidate[]>(response);
}

export async function saveMatch(
  trackId: string,
  candidate: MusicBrainzCandidate
): Promise<MusicBrainzMatch> {
  const response = await fetch(`/api/tracks/${trackId}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mbid: candidate.mbid,
      title: candidate.title,
      artistCredit: candidate.artistCredit,
      releaseId: candidate.releaseId,
      releaseBarcode: candidate.releaseBarcode,
      releaseAsin: candidate.releaseAsin,
      releaseTitle: candidate.releaseTitle,
      releaseDate: candidate.releaseDate,
      isrc: candidate.isrc,
      score: candidate.score,
    }),
  });
  return handleResponse<MusicBrainzMatch>(response);
}

export async function searchDiscogs(
  trackId: string,
  searchTitle = '',
  searchArtist = '',
  albumName = '',
  extended = false
): Promise<DiscogsCandidate[]> {
  const query = new URLSearchParams();
  if (searchTitle.trim()) {
    query.set('searchTitle', searchTitle.trim());
  }
  if (searchArtist.trim()) {
    query.set('searchArtist', searchArtist.trim());
  }
  if (albumName.trim()) {
    query.set('albumName', albumName.trim());
  }
  if (extended) {
    query.set('extended', 'true');
  }
  const url = query.toString()
    ? `/api/tracks/${trackId}/discogs?${query}`
    : `/api/tracks/${trackId}/discogs`;
  const response = await fetch(url);
  return handleResponse<DiscogsCandidate[]>(response);
}

export async function saveDiscogsMatch(
  trackId: string,
  candidate: DiscogsCandidate
): Promise<DiscogsMatch> {
  const { isMaster, ...payload } = candidate;
  const response = await fetch(`/api/tracks/${trackId}/discogs-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<DiscogsMatch>(response);
}

async function setTrackArchived(trackId: string, archived: boolean): Promise<void> {
  const response = await fetch(`/api/tracks/${trackId}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived }),
  });
  await handleResponse<void>(response);
}

export async function archiveTrack(trackId: string): Promise<void> {
  return setTrackArchived(trackId, true);
}

export async function unarchiveTrack(trackId: string): Promise<void> {
  return setTrackArchived(trackId, false);
}
