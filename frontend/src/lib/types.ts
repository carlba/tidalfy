export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  trackCount: number;
}

export interface MusicBrainzMatch {
  mbid: string;
  title: string;
  artistCredit: string;
  releaseTitle: string | null;
  releaseDate: string | null;
  score: number | null;
  selectedAt: string;
}

export interface Track {
  id: string;
  batchId: string;
  spotifyUri: string;
  trackName: string;
  albumName: string;
  artistNames: string[];
  releaseDate: string | null;
  durationMs: number;
  popularity: number;
  explicit: boolean;
  addedAt: string | null;
  genres: string[];
  recordLabel: string | null;
  archived: boolean;
  match: MusicBrainzMatch | null;
}

export interface MusicBrainzCandidate {
  mbid: string;
  title: string;
  artistCredit: string;
  releaseTitle: string | null;
  releaseDate: string | null;
  releaseCountry: string | null;
  releaseStatus: string | null;
  durationMs: number | null;
  disambiguation: string | null;
  score: number | null;
}

export interface ImportResult {
  batchId: string;
  fileName: string;
  importedCount: number;
  errors: { row: number; message: string; raw: string }[];
}
