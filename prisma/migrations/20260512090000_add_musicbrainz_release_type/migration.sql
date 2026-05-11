-- Add release type fields to the MusicBrainz match table
ALTER TABLE musicbrainz_match
ADD COLUMN release_type text;

ALTER TABLE musicbrainz_match
ADD COLUMN release_secondary_types text[] NOT NULL DEFAULT '{}';
