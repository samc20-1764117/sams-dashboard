-- Add optional default timeblock duration (in minutes) to recurring rules
-- Used when dragging recurring tasks onto timeblock grid
ALTER TABLE wr_recurring_rules ADD COLUMN IF NOT EXISTS default_tb_duration INTEGER;
