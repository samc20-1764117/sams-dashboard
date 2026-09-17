-- 014: link field on shopping_list — optional URL for an item (e.g. a product page),
-- shown as a small link icon next to the item across every view that renders it.
-- Run in Supabase SQL Editor. Verify: SELECT link FROM shopping_list LIMIT 1.

ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS link TEXT;
