/*
  # Remove always-true INSERT policy on alerts

  The dashboard has no sign-in and never writes through the anon client, so the
  `authenticated` role is only reachable by someone who self-registers with the
  public anon key. An always-true INSERT policy therefore let any stranger publish
  fabricated public-health alerts that are then served to every visitor by the
  public read policy.

  Alert generation is a server-side job and belongs to the service role, which
  bypasses RLS and is unaffected by this change. Public SELECT is left intact.
*/

DROP POLICY IF EXISTS "auth_insert_alerts" ON alerts;
