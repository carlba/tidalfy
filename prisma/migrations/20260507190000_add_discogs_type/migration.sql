-- Persist Discogs release type for discogs_match
ALTER TABLE "discogs_match"
ADD COLUMN "release_type" text;
