/*
  # Remove always-true INSERT policies on the reading and forecast tables

  Each of these nine policies was `FOR INSERT TO authenticated WITH CHECK (true)`,
  which placed no condition on the row or the caller. Because the app has no
  sign-in, any stranger could obtain the `authenticated` role through the public
  signup endpoint and bulk-insert forged pollution readings, forecasts and
  scenario records, which the public read policies then served to every visitor.
  The same grant was also an unbounded storage-exhaustion primitive.

  Ingestion runs server-side under the service role, which bypasses RLS.
  Public SELECT on every table is left intact.
*/

DROP POLICY IF EXISTS "auth_insert_aq_obs" ON air_quality_observations;
DROP POLICY IF EXISTS "auth_insert_sensor_measurements" ON sensor_measurements;
DROP POLICY IF EXISTS "auth_insert_weather" ON weather_observations;
DROP POLICY IF EXISTS "auth_insert_forecasts" ON air_quality_forecasts;
DROP POLICY IF EXISTS "auth_insert_hotspots" ON hotspot_forecasts;
DROP POLICY IF EXISTS "auth_insert_factors" ON prediction_factors;
DROP POLICY IF EXISTS "auth_insert_feedback" ON prediction_feedback;
DROP POLICY IF EXISTS "auth_insert_scenarios" ON scenarios;
DROP POLICY IF EXISTS "auth_insert_scenario_results" ON scenario_results;
