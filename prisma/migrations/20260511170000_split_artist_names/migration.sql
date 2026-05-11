-- Split semicolon-delimited artist names into individual array items.
-- Example: {"Kleerup;The Sweptaways"} => {"Kleerup","The Sweptaways"}
UPDATE track
SET
  artist_names = (
    SELECT
      array_agg (trim(elem))
    FROM
      unnest (artist_names) AS raw_elem,
      LATERAL regexp_split_to_table (raw_elem, '\s*;\s*') AS elem
    WHERE
      trim(elem) <> ''
  )
WHERE
  EXISTS (
    SELECT
      1
    FROM
      unnest (artist_names) AS t
    WHERE
      t LIKE '%;%'
  );
