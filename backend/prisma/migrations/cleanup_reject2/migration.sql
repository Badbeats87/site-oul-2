-- Delete malformed "Reject 2" record that has no market data
-- This record was stored locally without Discogs market snapshots,
-- causing it to display estimated price (€11) instead of actual Discogs pricing
DELETE FROM releases
WHERE title ILIKE '%Reject%'
  AND artist ILIKE '%Conway%'
  AND id IN (
    SELECT r.id FROM releases r
    LEFT JOIN market_snapshots ms ON r.id = ms.release_id
    WHERE r.title ILIKE '%Reject%'
      AND r.artist ILIKE '%Conway%'
      AND ms.id IS NULL
  );
