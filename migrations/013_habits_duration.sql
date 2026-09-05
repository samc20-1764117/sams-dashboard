-- 013: duration_minutes on habits — gives scheduled habits a visual height on the
-- Habits page's drag-and-drop timeblock grid (mirrors the Overview day timeline's
-- block sizing). Also drops the "stack with another habit" (anchor) and notes
-- columns from migration 012 — that feature was cut, stage change is now done by
-- dragging a habit card between the Future/Building/Established columns instead.
-- Run in Supabase SQL Editor. Verify: SELECT duration_minutes FROM habits LIMIT 1.

ALTER TABLE habits ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 20;
ALTER TABLE habits DROP COLUMN IF EXISTS anchor_habit_id;
ALTER TABLE habits DROP COLUMN IF EXISTS anchor_position;
ALTER TABLE habits DROP COLUMN IF EXISTS notes;
