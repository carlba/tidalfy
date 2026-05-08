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
  releaseId: string | null;
  releaseBarcode: string | null;
  releaseAsin: string | null;
  releaseTitle: string | null;
  releaseDate: string | null;
  isrc: string | null;
  score: number | null;
  selectedAt: string;
}

export interface DiscogsMatch {
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
  isrc?: string | null;
  selectedAt: string;
}

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
  isrc?: string | null;
  isMaster: boolean;
  isAlbum?: boolean;
  isSingle?: boolean;
  isCompilation?: boolean;
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
  discogsMatch: DiscogsMatch | null;
}

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
  isrc: string | null;
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
