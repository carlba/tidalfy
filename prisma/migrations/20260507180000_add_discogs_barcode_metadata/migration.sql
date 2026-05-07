-- Add raw Discogs barcode and normalized EAN list to discogs_match
ALTER TABLE "discogs_match"
ADD COLUMN "release_barcode_raw" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "discogs_match"
ADD COLUMN "release_eans" text[] NOT NULL DEFAULT ARRAY[]::text[];
