-- Create Discogs match table for track metadata enrichment.
CREATE TABLE
  IF NOT EXISTS discogs_match (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL UNIQUE,
    discogs_release_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist_credit TEXT NOT NULL,
    release_title TEXT,
    release_date TEXT,
    release_country TEXT,
    release_label TEXT,
    release_format TEXT,
    release_barcode TEXT,
    release_cover_art_url TEXT,
    resource_url TEXT,
    selected_at TIMESTAMP(3) NOT NULL DEFAULT NOW (),
    CONSTRAINT discogs_match_track_id_fkey FOREIGN KEY (track_id) REFERENCES track (id) ON DELETE CASCADE
  );
