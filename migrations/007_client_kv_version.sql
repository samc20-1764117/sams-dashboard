-- 007: version-gate client_kv — 006 missed it, so syncAll refetched the whole
-- table on every 30s poll (its cursor was never satisfiable). Same trigger
-- pattern as 006; client needs no change (client_kv is already in the cursor map).
-- Run in Supabase SQL Editor AFTER 006.
-- Verify: SELECT * FROM table_versions WHERE tbl = 'client_kv'; → 1 row, and
-- assigning a video to a day in the app should increment its ver.

INSERT INTO table_versions (tbl) VALUES ('client_kv') ON CONFLICT (tbl) DO NOTHING;
DROP TRIGGER IF EXISTS trg_bump_ver ON client_kv;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON client_kv
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
