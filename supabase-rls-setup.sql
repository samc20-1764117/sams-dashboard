-- ============================================================================
-- SUPABASE RLS SETUP — Run this in the Supabase SQL Editor
-- ============================================================================
-- STEP 1: Get your user ID first. Run this query alone:
--   SELECT id, email FROM auth.users;
-- Copy your user ID (UUID), then replace YOUR_USER_ID_HERE below with it.
-- ============================================================================

-- SET YOUR USER ID HERE (paste your UUID from the query above)
-- Example: DO $$ BEGIN PERFORM set_config('app.user_id', 'a1b2c3d4-...', false); END $$;
DO $$ BEGIN PERFORM set_config('app.user_id', 'YOUR_USER_ID_HERE', false); END $$;

-- ============================================================================
-- STEP 2: Add user_id column to all tables + backfill
-- ============================================================================

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE tasks SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Shopping List
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE shopping_list SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE shopping_list ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Travel
ALTER TABLE travel ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE travel SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE travel ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Birthdays
ALTER TABLE birthdays ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE birthdays SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE birthdays ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Pup Skills
ALTER TABLE pup_skills ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE pup_skills SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE pup_skills ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Pup Skill Sessions
ALTER TABLE pup_skill_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE pup_skill_sessions SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE pup_skill_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Pup Weekly Focus
ALTER TABLE pup_weekly_focus ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE pup_weekly_focus SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE pup_weekly_focus ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE recipes SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE recipes ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE videos SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE videos ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Grocery Staples
ALTER TABLE grocery_staples ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE grocery_staples SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE grocery_staples ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Grocery List
ALTER TABLE grocery_list ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE grocery_list SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE grocery_list ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Meal Plan
ALTER TABLE meal_plan ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE meal_plan SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE meal_plan ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Finance
ALTER TABLE finance ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE finance SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE finance ALTER COLUMN user_id SET DEFAULT auth.uid();

-- WR Recurring Rules
ALTER TABLE wr_recurring_rules ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE wr_recurring_rules SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE wr_recurring_rules ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Auto Timeblocks
ALTER TABLE auto_timeblocks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
UPDATE auto_timeblocks SET user_id = current_setting('app.user_id')::uuid WHERE user_id IS NULL;
ALTER TABLE auto_timeblocks ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================================================
-- STEP 3: Enable RLS on all tables
-- ============================================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE pup_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE pup_skill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pup_weekly_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_staples ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wr_recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_timeblocks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS policies (owner can do everything on their own rows)
-- ============================================================================

-- Helper: create 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
-- Each checks auth.uid() = user_id

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'tasks', 'shopping_list', 'travel', 'birthdays',
    'pup_skills', 'pup_skill_sessions', 'pup_weekly_focus',
    'recipes', 'videos', 'grocery_staples', 'grocery_list',
    'meal_plan', 'finance', 'wr_recurring_rules', 'auto_timeblocks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop existing policies if re-running
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON %I', tbl, tbl);

    -- SELECT: only your rows
    EXECUTE format(
      'CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING (auth.uid() = user_id)',
      tbl, tbl
    );
    -- INSERT: user_id must match your auth
    EXECUTE format(
      'CREATE POLICY "Users can insert own %s" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
    -- UPDATE: only your rows
    EXECUTE format(
      'CREATE POLICY "Users can update own %s" ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      tbl, tbl
    );
    -- DELETE: only your rows
    EXECUTE format(
      'CREATE POLICY "Users can delete own %s" ON %I FOR DELETE USING (auth.uid() = user_id)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Grant Alexa function access via service_role
-- The Alexa function uses the service_role key which BYPASSES RLS.
-- This is correct — no changes needed for Alexa.
-- ============================================================================

-- ============================================================================
-- DONE! Verify by running:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All tables should show rowsecurity = true
-- ============================================================================
