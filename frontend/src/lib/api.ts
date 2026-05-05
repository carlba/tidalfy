import type {
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

export async function fetchTracks(batchId?: string): Promise<Track[]> {
  const url = batchId ? `/api/tracks?batchId=${batchId}` : '/api/tracks';
  const response = await fetch(url);
  return handleResponse<Track[]>(response);
}

export async function searchMusicBrainz(trackId: string): Promise<MusicBrainzCandidate[]> {
  const response = await fetch(`/api/tracks/${trackId}/musicbrainz`);
  return handleResponse<MusicBrainzCandidate[]>(response);
}

export async function saveMatch(
  trackId: string,
  candidate: MusicBrainzCandidate
): Promise<MusicBrainzMatch> {
  const response = await fetch(`/api/tracks/${trackId}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candidate),
  });
  return handleResponse<MusicBrainzMatch>(response);
}
