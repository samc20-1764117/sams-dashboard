-- 009: fin_points — flight credits/miles (and any other points-style balance) with
-- optional expiration tracking. Feeds the Finance page "Points & Flight Credits" popup
-- and the 90-day-before-expiry Overview reminder (reuses the existing fin-cancel virtual
-- task machinery — see _finCancelTasksForDate in features.js).
-- Run in Supabase SQL Editor. Verify: INSERT a row, then SELECT * FROM fin_points;

CREATE TABLE fin_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'usd' CHECK (unit IN ('usd','miles','points')),
  amount NUMERIC NOT NULL DEFAULT 0,
  expires_on DATE,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fin_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_points_auth_all ON fin_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Version-gated sync (mirrors migration 006's per-table trigger pattern) — without this,
-- fin_points would either never sync or force a fallback to unconditional full-table polling.
INSERT INTO table_versions (tbl) VALUES ('fin_points') ON CONFLICT (tbl) DO NOTHING;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON fin_points
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
