-- Run in Supabase SQL Editor

CREATE TABLE finance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,           -- 'account', 'sub', 'vti'
  name text,
  amount numeric DEFAULT 0,
  adjustment numeric,           -- adjusted value (accounts only)
  frequency text,               -- monthly/yearly/weekly (subs only)
  date date,                    -- purchase date (vti) or next due (subs)
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE finance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON finance FOR ALL USING (true) WITH CHECK (true);

-- Seed accounts
INSERT INTO finance (type, name, amount, adjustment, sort_order) VALUES
  ('account', 'Checking',             20000.00,  20000.00, 0),
  ('account', 'VTI',                  99369.00,  99369.00, 1),
  ('account', 'RSUs (9 shares left)', 3000.00,   2700.00,  2),
  ('account', 'CC Points',            1800.00,   1800.00,  3),
  ('account', '401K (6% match)',       37000.00,  24850.00, 4);

-- Seed VTI purchases
INSERT INTO finance (type, name, amount, date) VALUES
  ('vti', 'VTI Purchase', -7158.55,  '2023-10-30'),
  ('vti', 'VTI Purchase', -14694.40, '2024-05-21'),
  ('vti', 'VTI Purchase', -262.39,   '2024-05-21'),
  ('vti', 'VTI Purchase', -14900.81, '2024-12-30'),
  ('vti', 'VTI Purchase', -9917.64,  '2025-05-07'),
  ('vti', 'VTI Purchase', -10109.37, '2025-12-03'),
  ('vti', 'VTI Purchase', -7089.18,  '2025-12-05'),
  ('vti', 'VTI Purchase', -9797.20,  '2026-01-20');
