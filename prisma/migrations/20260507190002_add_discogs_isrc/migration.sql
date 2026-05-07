-- Add Discogs ISRC field to discogs_match
ALTER TABLE "discogs_match"
ADD COLUMN "isrc" text;
