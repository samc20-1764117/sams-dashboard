-- "Personal" checkbox/tag for WR recurring rules (mirrors pup_related) — the app code
-- (add/edit WR rule modals, X-menu toggle, duplicate/paste) already reads and writes this
-- column, but it was never actually added to the table, so every save on a WR rule failed
-- with "Could not find the 'personal_related' column... in the schema cache" (2026-10-19).
ALTER TABLE wr_recurring_rules ADD COLUMN IF NOT EXISTS personal_related boolean NOT NULL DEFAULT false;
