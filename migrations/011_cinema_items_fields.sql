-- 011: cinema_items — add genre, where_to_watch, notes fields to the add/edit form.
-- Run in Supabase SQL Editor.

ALTER TABLE cinema_items ADD COLUMN genre TEXT;
ALTER TABLE cinema_items ADD COLUMN where_to_watch TEXT;
ALTER TABLE cinema_items ADD COLUMN notes TEXT;
