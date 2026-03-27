-- Stage 1: WR Recurring Rules + Overrides Tables
-- Base recurring rules: source of truth for normal schedule generation.
-- Overrides: source of truth for per-week/per-occurrence exceptions.
-- Existing recurring_tasks rows are NOT changed — migration is additive only.

-- ─────────────────────────────────────────────
-- Table: wr_recurring_rules
-- One row per WR recurring task definition.
-- ─────────────────────────────────────────────
CREATE TABLE wr_recurring_rules (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT    NOT NULL,
  cadence         TEXT    NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','other')),

  -- Weekly / biweekly: which day of the week (0=Sun,1=Mon,...,6=Sat)
  day_of_week     INT     CHECK (day_of_week BETWEEN 0 AND 6),

  -- Biweekly: a reference date whose week is "week A"; every other week from there is also week A.
  -- Set this to any past Monday that falls on the desired cycle.
  anchor_date     DATE,

  -- Monthly rule: one of two subtypes
  monthly_rule_type TEXT  CHECK (monthly_rule_type IN ('nth_weekday','date_of_month')),

  -- nth_weekday: e.g. "2nd Friday" → monthly_nth=2, monthly_weekday=5
  -- Use monthly_nth=-1 for "last".
  monthly_nth     INT,
  monthly_weekday INT     CHECK (monthly_weekday BETWEEN 0 AND 6),

  -- date_of_month: e.g. "every 15th" → monthly_date=15
  monthly_date    INT     CHECK (monthly_date BETWEEN 1 AND 31),

  pup_related     BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Table: wr_recurring_overrides
-- One row per week/occurrence exception.
-- wk_key = Monday date of the target week ('YYYY-MM-DD').
-- ─────────────────────────────────────────────
CREATE TABLE wr_recurring_overrides (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_id         BIGINT  NOT NULL REFERENCES wr_recurring_rules(id) ON DELETE CASCADE,

  -- The week this override targets (Monday of that week, 'YYYY-MM-DD')
  wk_key          TEXT    NOT NULL,

  -- What kind of exception this is:
  --   skip     → do not show this task this week
  --   move     → show it in a different week instead (see moved_to_wk_key)
  --   edit     → show with custom name/notes this week only
  --   complete → mark done for this week only
  override_type   TEXT    NOT NULL CHECK (override_type IN ('skip','move','edit','complete')),

  -- 'complete': whether the task was done this week
  done            BOOLEAN,

  -- 'move': target week's Monday date ('YYYY-MM-DD')
  moved_to_wk_key TEXT,

  -- 'edit': one-off name/notes for this week only
  custom_name     TEXT,
  custom_notes    TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one override per rule per week
  UNIQUE (rule_id, wk_key)
);

-- ─────────────────────────────────────────────
-- Indexes for common query patterns
-- ─────────────────────────────────────────────
CREATE INDEX idx_wr_rules_enabled   ON wr_recurring_rules (is_enabled, sort_order);
CREATE INDEX idx_wr_ov_rule_wk      ON wr_recurring_overrides (rule_id, wk_key);
CREATE INDEX idx_wr_ov_moved        ON wr_recurring_overrides (moved_to_wk_key) WHERE moved_to_wk_key IS NOT NULL;
