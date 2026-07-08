-- 008: tasks.updated_at — lets clients tell "my PATCH failed" apart from "another
-- device changed this row". Fixes cross-device revert: phone moves a task to today,
-- desktop's stale localOverride re-pushed the old due_date and undid it.
-- Run in Supabase SQL Editor. Verify: UPDATE a task → updated_at bumps.

ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
