-- Syncs the 'flight credit reminder completed' flag across devices (was localStorage-only).
ALTER TABLE fin_points ADD COLUMN IF NOT EXISTS reminder_done boolean DEFAULT false;
