/*
  # Revoke write privileges from anon and authenticated

  Both browser-facing roles held SELECT, INSERT, UPDATE and DELETE on all 14
  public tables, with every column writable. Row level security was the only
  remaining layer, so any future permissive or FOR ALL policy would immediately
  have made table-wide deletion and overwriting available to anyone holding the
  public anon key.

  The application performs no writes through the anon client (the Supabase client
  module is not imported anywhere), so no legitimate traffic depends on these
  privileges. SELECT is deliberately retained on every table so all existing and
  future public read paths keep working. service_role keeps its own grants and
  bypasses RLS, so server-side ingestion is unaffected.
*/

REVOKE INSERT, UPDATE, DELETE ON
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
