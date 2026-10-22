-- 020: lock every "any signed-in account" table to the dashboard owner, and close the two
-- public (anonymous) reads. Idempotent. Run in Supabase SQL Editor, then verify with:
--   select tablename, policyname, roles, qual from pg_policies where qual = 'true';   → 0 rows
DO $$
DECLARE r record; t text; own text := '6bc98cc0-da5f-4ae2-b83b-b2423592238c';
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
           WHERE schemaname='public' AND qual='true'
             AND tablename IN ('cinema_items','client_kv','fin_points','flights','habit_logs','habits','quick_notes','table_versions','youtube_tracking')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename); END LOOP;
  FOREACH t IN ARRAY ARRAY['cinema_items','client_kv','fin_points','flights','habit_logs','habits','quick_notes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_owner', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = %L::uuid) WITH CHECK (auth.uid() = %L::uuid)', t||'_owner', t, own, own);
  END LOOP;
  CREATE POLICY table_versions_owner_read ON public.table_versions FOR SELECT TO authenticated USING (auth.uid() = own::uuid);
  CREATE POLICY youtube_tracking_owner_read ON public.youtube_tracking FOR SELECT TO authenticated USING (auth.uid() = own::uuid);
END $$;
