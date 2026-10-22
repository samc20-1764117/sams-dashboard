-- 019: daily 6am flights check without a signed-in user. A GitHub Actions cron calls
-- /api/flights?mode=cron with a secret; Supabase stores only its sha256 and checks it here, so the
-- anon key alone can never read or write flights through these functions.
CREATE TABLE IF NOT EXISTS flight_cron (secret_hash TEXT PRIMARY KEY);
ALTER TABLE flight_cron ENABLE ROW LEVEL SECURITY;  -- no policies → unreadable via the API
INSERT INTO flight_cron VALUES ('920aee423ceafa3b6e80470779313e29479e44486aed177b1bf6f67d63e1d7a5') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION flights_cron_ok(p_secret text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM flight_cron WHERE secret_hash = encode(sha256(convert_to(p_secret,'utf8')),'hex'))
$$;

CREATE OR REPLACE FUNCTION flights_cron_apply(p_secret text, p_legs jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l jsonb; ex flights%ROWTYPE; a int := 0; u int := 0; ids text[];
BEGIN
  IF NOT flights_cron_ok(p_secret) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(coalesce(p_legs,'[]'::jsonb)) LOOP
    SELECT * INTO ex FROM flights
      WHERE confirmation_code = l->>'confirmation_code' AND flight_number = l->>'flight_number'
        AND depart_local::date = ((l->>'depart_local')::timestamp)::date
        AND coalesce(passenger,'') = coalesce(l->>'passenger','') LIMIT 1;
    IF FOUND THEN
      SELECT array_agg(DISTINCT x) INTO ids FROM unnest(ex.gmail_msg_ids || ARRAY[l->>'_msg']) x;
      IF ex.user_edited THEN
        UPDATE flights SET gmail_msg_ids = ids WHERE id = ex.id;
      ELSE
        UPDATE flights SET airline = l->>'airline', origin = l->>'origin', destination = l->>'destination',
          depart_local = (l->>'depart_local')::timestamp, depart_tz = l->>'depart_tz',
          arrive_local = (l->>'arrive_local')::timestamp, arrive_tz = l->>'arrive_tz',
          seat = l->>'seat', gmail_msg_ids = ids,
          status = CASE WHEN ex.status = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END, updated_at = now()
        WHERE id = ex.id;
      END IF;
      u := u + 1;
    ELSE
      INSERT INTO flights (confirmation_code, airline, flight_number, origin, destination, depart_local, depart_tz,
                           arrive_local, arrive_tz, passenger, seat, source, review_state, gmail_msg_ids)
      VALUES (l->>'confirmation_code', l->>'airline', l->>'flight_number', l->>'origin', l->>'destination',
              (l->>'depart_local')::timestamp, l->>'depart_tz', (l->>'arrive_local')::timestamp, l->>'arrive_tz',
              l->>'passenger', l->>'seat', 'gmail', 'pending', ARRAY[l->>'_msg']);
      a := a + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('added', a, 'updated', u);
END $$;
