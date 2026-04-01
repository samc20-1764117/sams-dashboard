-- Migration: consolidate recurring_tasks (non-WR) into wr_recurring_rules
-- Run this in Supabase SQL editor ONCE.
-- recurring_tasks table is NOT dropped — kept as read-only backup.

-- ── Step 1: Add non-WR support columns to wr_recurring_rules ─────────────────

ALTER TABLE wr_recurring_rules
  ADD COLUMN IF NOT EXISTS is_weekly_reset  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS appears_on_date  TEXT,
  ADD COLUMN IF NOT EXISTS day_added        TEXT,
  ADD COLUMN IF NOT EXISTS starting_date    DATE,
  ADD COLUMN IF NOT EXISTS date_overrides   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS done_by_week     JSONB NOT NULL DEFAULT '{}';

-- ── Step 2: Mark all existing WR rules explicitly ────────────────────────────

UPDATE wr_recurring_rules
SET is_weekly_reset = true
WHERE is_weekly_reset IS NULL OR is_weekly_reset = true;

-- ── Step 3: Migrate non-WR rows from recurring_tasks ────────────────────────
-- anchor_date = starting_date (biweekly cycle reference + start boundary)
-- starting_date also kept separately for "Starting" display column

WITH max_ord AS (
  SELECT COALESCE(MAX(sort_order), 0) AS mo FROM wr_recurring_rules
)
INSERT INTO wr_recurring_rules (
  name,
  cadence,
  anchor_date,
  appears_on_date,
  day_added,
  starting_date,
  pup_related,
  notes,
  is_enabled,
  sort_order,
  is_weekly_reset,
  date_overrides,
  done_by_week
)
SELECT
  rt.name,
  COALESCE(rt.cadence, 'weekly'),
  rt.starting_date,                                         -- biweekly cycle anchor
  rt.appears_on_date,
  rt.day_added,
  rt.starting_date,                                         -- for "Starting" display column
  COALESCE(rt.pup_related, false),
  rt.notes,
  true,                                                     -- is_enabled
  max_ord.mo + ROW_NUMBER() OVER (ORDER BY rt.name),        -- sort_order
  false,                                                    -- is_weekly_reset = false
  COALESCE(rt.date_overrides, '{}'),
  COALESCE(rt.done_by_week, '{}')
FROM recurring_tasks rt, max_ord
WHERE rt.is_weekly_reset = false
   OR rt.is_weekly_reset IS NULL;

-- ── Verification queries (run to confirm, do not execute as part of migration)
-- SELECT COUNT(*) FROM wr_recurring_rules WHERE is_weekly_reset = false;
-- SELECT COUNT(*) FROM recurring_tasks WHERE is_weekly_reset = false OR is_weekly_reset IS NULL;
-- (counts should match)
