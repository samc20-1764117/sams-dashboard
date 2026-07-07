-- 007: client_kv — small key→JSON store so device-local client state syncs across devices.
-- First use: video step/day assignment maps (_vidStepDayMap/_vidDayMap), which previously
-- lived only in desktop localStorage — mobile could never see "VO: PM"-style step tasks.
-- Run in Supabase SQL Editor. Verify: SELECT * FROM client_kv; → 2 rows.

CREATE TABLE client_kv (
  k          TEXT PRIMARY KEY,
  v          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_kv_auth_all ON client_kv
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Version-gated sync (see 006): bump table_versions on change
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON client_kv
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
INSERT INTO table_versions (tbl) VALUES ('client_kv') ON CONFLICT (tbl) DO NOTHING;

INSERT INTO client_kv (k) VALUES ('vid_step_day_map'), ('vid_day_map')
  ON CONFLICT (k) DO NOTHING;
