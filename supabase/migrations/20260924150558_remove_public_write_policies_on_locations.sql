/*
  # Remove always-true write policies on locations

  `auth_update_locations` was `USING (true) WITH CHECK (true)`, letting any
  stranger who self-registered rename a monitored city, move its coordinates,
  alter its reported station count, or flip `is_default` to change which city the
  dashboard opens on. `auth_insert_locations` let the same caller add cities.

  The supported location list is operator data and belongs to the service role,
  which bypasses RLS. Public SELECT is left intact.
*/

DROP POLICY IF EXISTS "auth_update_locations" ON locations;
DROP POLICY IF EXISTS "auth_insert_locations" ON locations;
