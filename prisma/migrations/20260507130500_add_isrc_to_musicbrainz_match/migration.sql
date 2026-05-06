-- Add isrc to MusicBrainz matches so the selected MusicBrainz recording can be persisted.
ALTER TABLE "musicbrainz_match"
ADD COLUMN "isrc" TEXT NULL;
