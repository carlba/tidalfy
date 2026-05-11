-- CreateTable
CREATE TABLE import_batch (
    id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    imported_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT import_batch_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE track (
    id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    spotify_uri TEXT NOT NULL,
    track_name TEXT NOT NULL,
    album_name TEXT NOT NULL,
    artist_names TEXT[],
    release_date TEXT,
    duration_ms INTEGER NOT NULL,
    popularity INTEGER NOT NULL,
    explicit BOOLEAN NOT NULL,
    added_by TEXT,
    added_at TIMESTAMP(3),
    genres TEXT[],
    record_label TEXT,
    raw_data JSONB NOT NULL,

    CONSTRAINT track_pkey PRIMARY KEY (id)
);

-- CreateTable
CREATE TABLE musicbrainz_match (
    id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    mbid TEXT NOT NULL,
    title TEXT NOT NULL,
    artist_credit TEXT NOT NULL,
    release_title TEXT,
    release_date TEXT,
    score INTEGER,
    selected_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT musicbrainz_match_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE UNIQUE INDEX musicbrainz_match_track_id_key ON musicbrainz_match(track_id);

-- AddForeignKey
ALTER TABLE track ADD CONSTRAINT track_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES import_batch(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE musicbrainz_match ADD CONSTRAINT musicbrainz_match_track_id_fkey FOREIGN KEY (track_id) REFERENCES track(id) ON DELETE CASCADE ON UPDATE CASCADE;
