-- 006: table_versions — cheap change detection for syncAll polling.
-- Clients poll this one tiny table every 30s and only refetch tables whose ver changed.
-- Run in Supabase SQL Editor. Verify: SELECT * FROM table_versions ORDER BY tbl; → 22 rows.
-- Then toggle a task in the app and re-select: tasks.ver should have incremented.

CREATE TABLE table_versions (
  tbl        TEXT PRIMARY KEY,
  ver        BIGINT NOT NULL DEFAULT 1,
  bumped_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Browser clients may READ it; nobody but the trigger writes it.
ALTER TABLE table_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY table_versions_read ON table_versions
  FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON table_versions FROM anon, authenticated;

-- SECURITY DEFINER: bump works regardless of writer (browser JWT, Alexa service key, SQL editor).
CREATE OR REPLACE FUNCTION bump_table_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO table_versions (tbl, ver, bumped_at)
  VALUES (TG_TABLE_NAME, 2, now())
  ON CONFLICT (tbl) DO UPDATE SET ver = table_versions.ver + 1, bumped_at = now();
  RETURN NULL;
END;
$$;

-- One statement-level trigger per synced table + seed row so the table is never empty.
-- NOTE: TRUNCATE is not covered (restore.js uses DELETE, which is). After a manual
-- truncate-without-reinsert, run: UPDATE table_versions SET ver = ver + 1;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks','shopping_list','travel','birthdays',
    'pup_skills','pup_skill_sessions','pup_weekly_focus',
    'recipes','videos','grocery_staples','grocery_list','meal_plan',
    'packing_templates','packing_items','finance','finance_subs','ideas',
    'time_blocks','auto_timeblocks','auto_timeblock_overrides',
    'wr_recurring_rules','wr_recurring_overrides'
  ] LOOP
    INSERT INTO table_versions (tbl) VALUES (t) ON CONFLICT (tbl) DO NOTHING;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bump_ver ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version()', t);
  END LOOP;
END $$;
