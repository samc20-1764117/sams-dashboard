-- 010: cinema_items — personal movie/show watch list. Up Next / Watched status,
-- own 1-10 rating (set once watched), sort_order for Up Next priority ordering.
-- Top 10 Movies/Shows are computed client-side from rating, not a separate table.
-- Run in Supabase SQL Editor. Verify: INSERT a row, then SELECT * FROM cinema_items;

CREATE TABLE cinema_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie','show')),
  status TEXT NOT NULL DEFAULT 'up_next' CHECK (status IN ('up_next','watched')),
  rating SMALLINT CHECK (rating BETWEEN 1 AND 10),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cinema_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cinema_items_auth_all ON cinema_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Version-gated sync (mirrors migration 006's per-table trigger pattern) — without this,
-- cinema_items would either never sync or force a fallback to unconditional full-table polling.
INSERT INTO table_versions (tbl) VALUES ('cinema_items') ON CONFLICT (tbl) DO NOTHING;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON cinema_items
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
