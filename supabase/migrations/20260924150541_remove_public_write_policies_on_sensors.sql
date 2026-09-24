/*
  # Remove always-true write policies on sensors

  `auth_update_sensors` was `USING (true) WITH CHECK (true)`, which selected every
  row in the table for update and accepted every result. That let any stranger who
  self-registered rewrite the traffic, industrial and burning influence
  coefficients that the forecast model is designed to read, and move a station's
  coordinates. `auth_insert_sensors` let the same caller add fictitious stations.

  Station configuration is operator data and belongs to the service role, which
  bypasses RLS. Public SELECT is left intact.
*/

DROP POLICY IF EXISTS "auth_update_sensors" ON sensors;
DROP POLICY IF EXISTS "auth_insert_sensors" ON sensors;
