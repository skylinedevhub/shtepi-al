-- Populate agencies table from scraped listing data
-- Extracts distinct agency names from listings where poster_type = 'agency'

INSERT INTO agencies (name, slug)
SELECT DISTINCT
  poster_name,
  lower(regexp_replace(poster_name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM listings
WHERE poster_type = 'agency'
  AND poster_name IS NOT NULL
  AND poster_name != ''
ON CONFLICT DO NOTHING;

-- Backfill phone from listings where available (take first non-null phone per agency)
UPDATE agencies a
SET phone = sub.poster_phone
FROM (
  SELECT DISTINCT ON (poster_name)
    poster_name,
    poster_phone
  FROM listings
  WHERE poster_type = 'agency'
    AND poster_phone IS NOT NULL
    AND poster_phone != ''
  ORDER BY poster_name, last_seen DESC
) sub
WHERE a.name = sub.poster_name
  AND a.phone IS NULL;
