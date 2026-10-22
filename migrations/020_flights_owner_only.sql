-- 020: flights readable/writable only by the dashboard owner (not "any signed-in account").
DROP POLICY IF EXISTS flights_auth_all ON flights;
CREATE POLICY flights_owner ON flights FOR ALL TO authenticated
  USING (auth.uid() = '6bc98cc0-da5f-4ae2-b83b-b2423592238c'::uuid)
  WITH CHECK (auth.uid() = '6bc98cc0-da5f-4ae2-b83b-b2423592238c'::uuid);
