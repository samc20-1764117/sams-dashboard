-- Run this in Supabase SQL Editor to create finance tables and seed your data

-- 1. Accounts (Where's My Money)
CREATE TABLE finance_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  amount numeric DEFAULT 0,
  adjustment numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON finance_accounts FOR ALL USING (true) WITH CHECK (true);

-- 2. Subscriptions & Bills
CREATE TABLE finance_subs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  amount numeric DEFAULT 0,
  frequency text DEFAULT 'monthly',
  next_due date,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE finance_subs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON finance_subs FOR ALL USING (true) WITH CHECK (true);

-- 3. VTI Purchase History
CREATE TABLE finance_vti (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE finance_vti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON finance_vti FOR ALL USING (true) WITH CHECK (true);

-- ── Seed accounts ────────────────────────────────────────────────────────────
INSERT INTO finance_accounts (name, amount, adjustment, sort_order) VALUES
  ('Checking',     20000.00,  20000.00, 0),
  ('VTI',          99369.00,  99369.00, 1),
  ('RSUs (9 shares left)', 3000.00, 2700.00, 2),
  ('CC Points',    1800.00,   1800.00, 3),
  ('401K (6% match)', 37000.00, 24850.00, 4);

-- ── Seed VTI purchases ──────────────────────────────────────────────────────
INSERT INTO finance_vti (date, amount) VALUES
  ('2023-10-30', -7158.55),
  ('2024-05-21', -14694.40),
  ('2024-05-21', -262.39),
  ('2024-12-30', -14900.81),
  ('2025-05-07', -9917.64),
  ('2025-12-03', -10109.37),
  ('2025-12-05', -7089.18),
  ('2026-01-20', -9797.20);
