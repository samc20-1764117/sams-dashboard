-- 010: fin_points.remind_days_before — lets each point/credit configure its own "remind me
-- N days before it expires" lead time (default 90, matching the original hardcoded value).
-- Run in Supabase SQL Editor. Verify: SELECT id, name, remind_days_before FROM fin_points;

ALTER TABLE fin_points ADD COLUMN remind_days_before INTEGER NOT NULL DEFAULT 90;
