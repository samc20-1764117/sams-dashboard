-- 018: flights — one row per flight LEG, imported from Gmail confirmations (or added manually).
-- Stores only the extracted fields + Gmail message ids (never the email body), so deleting the
-- email later doesn't affect the flight. Rows land as review_state='pending' until accepted.
-- Run in Supabase SQL Editor. Verify: INSERT a row, then SELECT * FROM flights;
--   and SELECT * FROM table_versions WHERE tbl='flights'; → 1 row, ver bumps on write.

CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code TEXT,
  airline TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  origin TEXT NOT NULL,            -- IATA, e.g. AUS
  destination TEXT NOT NULL,
  depart_local TIMESTAMP NOT NULL, -- wall-clock time at the origin airport (no tz math needed to display)
  depart_tz TEXT,                  -- IANA tz, e.g. America/Chicago
  arrive_local TIMESTAMP,
  arrive_tz TEXT,
  passenger TEXT,
  seat TEXT,
  cabin TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','changed','cancelled')),
  review_state TEXT NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','accepted','ignored')),
  source TEXT NOT NULL DEFAULT 'gmail' CHECK (source IN ('gmail','manual')),
  gmail_msg_ids TEXT[] NOT NULL DEFAULT '{}',  -- every email that touched this leg (dedupe + audit)
  user_edited BOOLEAN NOT NULL DEFAULT false,  -- true → re-syncs must not overwrite your fixes
  travel_id TEXT,                              -- optional link to a travel trip
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedupe key: same confirmation + flight + departure day + passenger = same leg, so repeat
-- emails (confirmation, change, check-in reminder, receipt) upsert instead of duplicating.
CREATE UNIQUE INDEX flights_leg_uniq ON flights
  (confirmation_code, flight_number, (depart_local::date), COALESCE(passenger,''))
  WHERE confirmation_code IS NOT NULL;
CREATE INDEX flights_depart_idx ON flights (depart_local);

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
CREATE POLICY flights_auth_all ON flights FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Version-gated sync (see 006) — without this the table would never sync or force polling.
INSERT INTO table_versions (tbl) VALUES ('flights') ON CONFLICT (tbl) DO NOTHING;
CREATE TRIGGER trg_bump_ver AFTER INSERT OR UPDATE OR DELETE ON flights
  FOR EACH STATEMENT EXECUTE FUNCTION bump_table_version();
