/*
  # Revoke TRUNCATE, TRIGGER and REFERENCES from anon and authenticated

  Follow-up to the write-privilege revoke. Verification of the resulting state
  showed the browser-facing roles still held TRUNCATE, TRIGGER and REFERENCES on
  all 14 public tables.

  TRUNCATE is the important one: it empties a table wholesale and is NOT filtered
  by row level security, so it remained a destructive primitive for anyone holding
  the public anon key even after every write policy was dropped. TRIGGER allows
  attaching arbitrary trigger functions to a table, and REFERENCES allows creating
  foreign keys against it; neither is needed by a read-only client.

  SELECT remains granted on every table, so all public read paths are unaffected.
  service_role retains its own privileges.
*/

REVOKE TRUNCATE, TRIGGER, REFERENCES ON
  locations,
  sensors,
  sensor_measurements,
  weather_observations,
  air_quality_observations,
  air_quality_forecasts,
  hotspot_forecasts,
  prediction_factors,
  scenarios,
  scenario_results,
  alerts,
  prediction_feedback,
  data_sources,
  system_events
FROM anon, authenticated;
