-- Convert the stored MusicBrainz artist credit field from text to text[]
-- Preserve existing values by splitting on comma, ampersand, or slash separators.
ALTER TABLE musicbrainz_match
ALTER COLUMN artist_credit TYPE text[] USING array_remove(
  regexp_split_to_array(artist_credit, '\\s*(?:,|&|/)\\s*'),
  ''
);
