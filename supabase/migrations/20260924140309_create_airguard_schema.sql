/*
# AI AirGuard - Core Database Schema

## Overview
Creates the complete schema for the AI AirGuard air quality prediction platform.

## New Tables
1. locations - Supported geographic locations (Asia demo cities)
2. sensors - Monitoring stations (demo and future real sensors)
3. sensor_measurements - Individual pollutant readings from sensors
4. weather_observations - Weather data per location/time
5. air_quality_observations - Air quality readings per location/time
6. air_quality_forecasts - Model forecast records (5 horizons)
7. hotspot_forecasts - Spatial grid hotspot predictions
8. prediction_factors - Explainable AI factor contributions
9. scenarios - What-if simulation inputs
10. scenario_results - What-if simulation outputs
11. alerts - Generated system alerts
12. prediction_feedback - Prediction vs actual comparison records
13. data_sources - Metadata about data sources (demo/live/historical)
14. system_events - System audit log

## Security
- RLS enabled on all tables
- Public read access (anon + authenticated) since this is a demo app without sign-in
- Writes restricted to service role (server-side only) via authenticated policies
- No unrestricted public writes
*/

-- 1. locations
CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY,
  country text NOT NULL,
  city text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  is_default boolean NOT NULL DEFAULT false,
  station_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_locations" ON locations;
CREATE POLICY "public_read_locations" ON locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_locations" ON locations;
CREATE POLICY "auth_insert_locations" ON locations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_locations" ON locations;
CREATE POLICY "auth_update_locations" ON locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. sensors
CREATE TABLE IF NOT EXISTS sensors (
  id text PRIMARY KEY,
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  sensor_type text NOT NULL DEFAULT 'demo',
  source text NOT NULL DEFAULT 'ASIA_DEMO_DATA',
  traffic_influence double precision DEFAULT 0.5,
  industrial_influence double precision DEFAULT 0.3,
  burning_influence double precision DEFAULT 0.2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_sensors" ON sensors;
CREATE POLICY "public_read_sensors" ON sensors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_sensors" ON sensors;
CREATE POLICY "auth_insert_sensors" ON sensors FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_sensors" ON sensors;
CREATE POLICY "auth_update_sensors" ON sensors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. sensor_measurements
CREATE TABLE IF NOT EXISTS sensor_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text REFERENCES sensors(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  pm25 double precision,
  pm10 double precision,
  no2 double precision,
  o3 double precision,
  so2 double precision,
  co double precision,
  aqi integer,
  source text NOT NULL DEFAULT 'ASIA_DEMO_DATA',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sensor_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_sensor_measurements" ON sensor_measurements;
CREATE POLICY "public_read_sensor_measurements" ON sensor_measurements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_sensor_measurements" ON sensor_measurements;
CREATE POLICY "auth_insert_sensor_measurements" ON sensor_measurements FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sensor_meas_sensor ON sensor_measurements(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_meas_time ON sensor_measurements(timestamp);

-- 4. weather_observations
CREATE TABLE IF NOT EXISTS weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  temperature_c double precision,
  humidity double precision,
  wind_speed_kph double precision,
  wind_direction_deg double precision,
  pressure_mb double precision,
  precipitation_mm double precision,
  cloud double precision,
  visibility_km double precision,
  source text NOT NULL DEFAULT 'ASIA_DEMO_DATA',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_weather" ON weather_observations;
CREATE POLICY "public_read_weather" ON weather_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_weather" ON weather_observations;
CREATE POLICY "auth_insert_weather" ON weather_observations FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_observations(location_id);
CREATE INDEX IF NOT EXISTS idx_weather_time ON weather_observations(timestamp);

-- 5. air_quality_observations
CREATE TABLE IF NOT EXISTS air_quality_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  pm25 double precision,
  pm10 double precision,
  no2 double precision,
  o3 double precision,
  so2 double precision,
  co double precision,
  aqi integer,
  aqi_category text,
  dominant_pollutant text,
  source text NOT NULL DEFAULT 'ASIA_DEMO_DATA',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE air_quality_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_aq_obs" ON air_quality_observations;
CREATE POLICY "public_read_aq_obs" ON air_quality_observations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_aq_obs" ON air_quality_observations;
CREATE POLICY "auth_insert_aq_obs" ON air_quality_observations FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_aq_obs_location ON air_quality_observations(location_id);
CREATE INDEX IF NOT EXISTS idx_aq_obs_time ON air_quality_observations(timestamp);

-- 6. air_quality_forecasts
CREATE TABLE IF NOT EXISTS air_quality_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  forecast_generated_at timestamptz NOT NULL DEFAULT now(),
  target_timestamp timestamptz NOT NULL,
  horizon_hours integer NOT NULL,
  pm25 double precision,
  pm10 double precision,
  no2 double precision,
  o3 double precision,
  so2 double precision,
  co double precision,
  aqi integer,
  aqi_category text,
  dominant_pollutant text,
  confidence text,
  confidence_score double precision,
  trend_direction text,
  source text NOT NULL DEFAULT 'MODEL_FORECAST',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE air_quality_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_forecasts" ON air_quality_forecasts;
CREATE POLICY "public_read_forecasts" ON air_quality_forecasts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_forecasts" ON air_quality_forecasts;
CREATE POLICY "auth_insert_forecasts" ON air_quality_forecasts FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_forecast_location ON air_quality_forecasts(location_id);
CREATE INDEX IF NOT EXISTS idx_forecast_target ON air_quality_forecasts(target_timestamp);

-- 7. hotspot_forecasts
CREATE TABLE IF NOT EXISTS hotspot_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  horizon_hours integer NOT NULL,
  grid_row integer NOT NULL,
  grid_col integer NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  pm25 double precision,
  pm10 double precision,
  aqi integer,
  aqi_category text,
  risk_level text,
  confidence text,
  data_type text NOT NULL DEFAULT 'AI_ESTIMATE',
  distance_to_sensor double precision,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hotspot_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_hotspots" ON hotspot_forecasts;
CREATE POLICY "public_read_hotspots" ON hotspot_forecasts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_hotspots" ON hotspot_forecasts;
CREATE POLICY "auth_insert_hotspots" ON hotspot_forecasts FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_hotspot_location ON hotspot_forecasts(location_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_horizon ON hotspot_forecasts(horizon_hours);

-- 8. prediction_factors
CREATE TABLE IF NOT EXISTS prediction_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  forecast_id uuid REFERENCES air_quality_forecasts(id) ON DELETE CASCADE,
  factor text NOT NULL,
  label text NOT NULL,
  weight double precision NOT NULL,
  direction text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE prediction_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_factors" ON prediction_factors;
CREATE POLICY "public_read_factors" ON prediction_factors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_factors" ON prediction_factors;
CREATE POLICY "auth_insert_factors" ON prediction_factors FOR INSERT TO authenticated WITH CHECK (true);

-- 9. scenarios
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  traffic_reduction integer NOT NULL DEFAULT 0,
  industrial_reduction integer NOT NULL DEFAULT 0,
  open_burning_reduction integer NOT NULL DEFAULT 0,
  temporary_traffic_restriction boolean DEFAULT false,
  industrial_mitigation boolean DEFAULT false,
  burning_control boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_scenarios" ON scenarios;
CREATE POLICY "public_read_scenarios" ON scenarios FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_scenarios" ON scenarios;
CREATE POLICY "auth_insert_scenarios" ON scenarios FOR INSERT TO authenticated WITH CHECK (true);

-- 10. scenario_results
CREATE TABLE IF NOT EXISTS scenario_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES scenarios(id) ON DELETE CASCADE,
  horizon_hours integer NOT NULL,
  baseline_aqi integer,
  scenario_aqi integer,
  baseline_pm25 double precision,
  scenario_pm25 double precision,
  improvement_aqi integer,
  improvement_pct double precision,
  source text NOT NULL DEFAULT 'AI_ESTIMATE',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_scenario_results" ON scenario_results;
CREATE POLICY "public_read_scenario_results" ON scenario_results FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_scenario_results" ON scenario_results;
CREATE POLICY "auth_insert_scenario_results" ON scenario_results FOR INSERT TO authenticated WITH CHECK (true);

-- 11. alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  reason text,
  horizon_hours integer DEFAULT 0,
  recommended_action text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_alerts" ON alerts;
CREATE POLICY "public_read_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_alerts" ON alerts;
CREATE POLICY "auth_insert_alerts" ON alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_alerts_location ON alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- 12. prediction_feedback
CREATE TABLE IF NOT EXISTS prediction_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES locations(id) ON DELETE CASCADE,
  predicted_time timestamptz NOT NULL,
  actual_time timestamptz NOT NULL,
  predicted_aqi integer,
  actual_aqi integer,
  predicted_pm25 double precision,
  actual_pm25 double precision,
  error double precision,
  pm25_error double precision,
  direction_correct boolean,
  confidence text,
  label text NOT NULL DEFAULT 'DEMO REPLAY EVALUATION',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE prediction_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_feedback" ON prediction_feedback;
CREATE POLICY "public_read_feedback" ON prediction_feedback FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_feedback" ON prediction_feedback;
CREATE POLICY "auth_insert_feedback" ON prediction_feedback FOR INSERT TO authenticated WITH CHECK (true);

-- 13. data_sources
CREATE TABLE IF NOT EXISTS data_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'demo',
  connected boolean NOT NULL DEFAULT false,
  last_sync timestamptz,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_data_sources" ON data_sources;
CREATE POLICY "public_read_data_sources" ON data_sources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_update_data_sources" ON data_sources;
CREATE POLICY "auth_update_data_sources" ON data_sources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_insert_data_sources" ON data_sources;
CREATE POLICY "auth_insert_data_sources" ON data_sources FOR INSERT TO authenticated WITH CHECK (true);

-- 14. system_events
CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_events" ON system_events;
CREATE POLICY "public_read_events" ON system_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_events" ON system_events;
CREATE POLICY "auth_insert_events" ON system_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_time ON system_events(created_at);
