-- 012: habits + habit_logs — replaces the old "daily habit" feature that piggybacked
-- on wr_recurring_rules (cadence='daily'). That approach never got real usage (table
-- had zero daily-cadence rows) and had no real history, just a done_by_week JSON blob.
--
-- Habits have a manually-set lifecycle stage: 'future' (not started yet), 'building'
-- (actively working on it — these are the only ones shown on the Overview highlight,
-- no cap enforced client-side), 'established' (fully automatic, e.g. brushing teeth —
-- still visible in the Habits page's timeblock/schedule view so newer habits can be
-- anchored to them, e.g. "lactic acid after Skincare", but never shown on Overview).
--
-- habit_logs is a real per-day done log (not a JSON blob) so streaks/history are possible.
-- Run in Supabase SQL Editor. Verify: INSERT a habit, log a habit_logs row, SELECT both back.

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  notes TEXT,
  stage TEXT NOT NULL DEFAULT 'future' CHECK (stage IN ('future','building','established')),
  scheduled_time TIME,
  anchor_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  anchor_position TEXT CHECK (anchor_position IN ('before','after')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, date)
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY habits_auth_all ON habits FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY habit_logs_auth_all ON habit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Version-gated sync (mirrors migration 006's per-table trigger pattern) — without this,
-- habits/habit_logs would force a fallback to unconditional full-table polling every sync.
INSERT INTO table_versions (tbl) VALUES ('habits') ON CONFLICT (tbl) DO NOTHING;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON habits
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();

INSERT INTO table_versions (tbl) VALUES ('habit_logs') ON CONFLICT (tbl) DO NOTHING;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON habit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
