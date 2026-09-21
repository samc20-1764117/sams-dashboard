-- 015: day_order key in client_kv — syncs manual per-day task order (previously
-- localStorage-only, per-device, so desktop and mobile could each have their own manual
-- reorder for the same day and neither ever saw the other's) across desktop and mobile.
-- No new table, RLS, or trigger — client_kv (see 007) already covers "small key→JSON blob
-- that needs to sync across devices" generically (it's the same mechanism vid_step_day_map/
-- vid_day_map already use); this just seeds the new key. The actual push/pull logic is
-- _kvSyncMaps (core.js) picking up the new _KV_MAPS entry — no other code changes needed.
-- Run in Supabase SQL Editor. Verify: SELECT * FROM client_kv WHERE k='day_order'; → 1 row.

INSERT INTO client_kv (k) VALUES ('day_order') ON CONFLICT (k) DO NOTHING;
