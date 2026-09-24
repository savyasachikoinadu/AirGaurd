/*
  # Remove always-true INSERT policy on system_events

  system_events is the system audit log. `auth_insert_events` was
  `WITH CHECK (true)`, so any stranger who self-registered could write arbitrary
  event rows, drowning or contradicting the record an operator would rely on to
  reconstruct an incident. An audit log an attacker can write to is not an audit
  log.

  Events are emitted server-side under the service role, which bypasses RLS.
  Public SELECT is left intact.
*/

DROP POLICY IF EXISTS "auth_insert_events" ON system_events;
