-- 013: duration_minutes on habits — gives scheduled habits a visual height on the
-- Habits page's drag-and-drop timeblock grid (mirrors the Overview day timeline's
-- block sizing). Run in Supabase SQL Editor. Verify: SELECT duration_minutes FROM habits LIMIT 1.

ALTER TABLE habits ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 20;
