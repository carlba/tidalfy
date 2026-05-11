-- Add release_id to MusicBrainz matches so the selected MusicBrainz release can be persisted.
ALTER TABLE "musicbrainz_match"
ADD COLUMN "release_id" TEXT NULL;
