-- 013: cinema_items — new_season flag, lets a watched show be flagged when a new season drops.
-- Run in Supabase SQL Editor.

ALTER TABLE cinema_items ADD COLUMN new_season BOOLEAN NOT NULL DEFAULT false;
