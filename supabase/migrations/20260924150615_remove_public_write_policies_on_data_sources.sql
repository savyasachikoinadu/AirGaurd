/*
  # Remove always-true write policies on data_sources

  `auth_update_data_sources` was `USING (true) WITH CHECK (true)` and
  `auth_insert_data_sources` was `WITH CHECK (true)`. Together they let any
  stranger who self-registered set `connected = true`, change `status` to a live
  value and stamp `last_sync`, making simulated air-quality numbers appear to come
  from a real monitoring network. Provenance is the core integrity claim of a
  public-health dashboard.

  Source provenance is written server-side under the service role, which bypasses
  RLS. Public SELECT is left intact.
*/

DROP POLICY IF EXISTS "auth_update_data_sources" ON data_sources;
DROP POLICY IF EXISTS "auth_insert_data_sources" ON data_sources;
