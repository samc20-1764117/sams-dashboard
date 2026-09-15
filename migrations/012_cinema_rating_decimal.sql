-- 012: cinema_items.rating — widen from SMALLINT to NUMERIC(3,1) to allow decimal ratings (e.g. 9.5).
-- Run in Supabase SQL Editor.

ALTER TABLE cinema_items ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::numeric;
