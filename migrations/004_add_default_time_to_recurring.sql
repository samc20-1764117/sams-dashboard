-- Add optional default timeblock time range to recurring rules
-- When set, the task auto-appears in timeblock at this time each cadence
ALTER TABLE wr_recurring_rules ADD COLUMN IF NOT EXISTS default_start_time TEXT;
ALTER TABLE wr_recurring_rules ADD COLUMN IF NOT EXISTS default_end_time TEXT;
