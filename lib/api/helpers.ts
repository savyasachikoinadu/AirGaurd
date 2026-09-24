// Shared API helper for building demo data responses
// Used by all API routes to generate consistent data

import { ASIA_LOCATIONS, getDefaultLocation, getLocationById, getStationsForLocation } from '@/lib/demo/locations';
import { generateDemoStations } from '@/lib/demo/generator';
import { forecastForLocation, buildForecastInputFromStation, forecastAirQuality } from '@/lib/forecast/engine';
import { buildHotspotJourney, forecastGrid } from '@/lib/forecast/hotspot';
import { explainForecast } from '@/lib/forecast/explainable';
import { detectThreats } from '@/lib/forecast/threats';
import { generateAlerts } from '@/lib/forecast/alerts';
import { generateRecommendations } from '@/lib/forecast/recommendations';
import { generatePredictionFeedback } from '@/lib/forecast/feedback';
import { runScenario } from '@/lib/forecast/scenario';
import { getDatasetProfile } from '@/lib/data/historical';
import type { LocationDef, DemoStation, ForecastPoint, HotspotJourney, ScenarioInput } from '@/lib/types';

export interface LocationDataBundle {
  location: LocationDef;
  stations: DemoStation[];
  forecast: ForecastPoint[];
  journey: HotspotJourney;
}

const cache = new Map<string, { data: LocationDataBundle; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

export function getLocationBundle(locationId?: string): LocationDataBundle {
  const location = locationId ? getLocationById(locationId) || getDefaultLocation() : getDefaultLocation();
  const cacheKey = location.id;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const stations = generateDemoStations(location);
  const stationDefs = getStationsForLocation(location);
  const forecast = forecastForLocation(stations, stationDefs);
  const journey = buildHotspotJourney(stations, stationDefs, location);

  const data = { location, stations, forecast, journey };
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

export function getStationsForApi(locationId?: string) {
  const { location, stations } = getLocationBundle(locationId);
  const stationDefs = getStationsForLocation(location);
  return { location, stations, stationDefs };
}

export function getForecastForApi(locationId?: string) {
  const { location, forecast } = getLocationBundle(locationId);
  return { location, forecast };
}

export function getJourneyForApi(locationId?: string) {
  const { location, journey } = getLocationBundle(locationId);
  return { location, journey };
}

export function getExplanationForApi(locationId?: string, stationId?: string) {
  const { location, stations } = getLocationBundle(locationId);
  const stationDefs = getStationsForLocation(location);

  const station = stationId ? stations.find((s) => s.id === stationId) : stations[0];
  if (!station) throw new Error('No station found');

  const def = stationDefs.find((d) => d.id === station.id);
  const input = buildForecastInputFromStation(station, def);
  const forecast = forecastAirQuality(input);
  const explanation = explainForecast(input, forecast);

  return { location, station, forecast, explanation };
}

export function getThreatsForApi(locationId?: string) {
  const { location, forecast, journey } = getLocationBundle(locationId);
  const threats = detectThreats(forecast, journey.grids, location);
  return { location, threats };
}

export function getAlertsForApi(locationId?: string) {
  const { location, forecast, journey } = getLocationBundle(locationId);
  const { threats } = getThreatsForApi(locationId);
  const alerts = generateAlerts(forecast, journey.grids, threats, location);
  return { location, alerts };
}

export function getRecommendationsForApi(locationId?: string) {
  const { location, forecast } = getLocationBundle(locationId);
  const recommendations = generateRecommendations(forecast, location);
  return { location, recommendations };
}

export function getPerformanceForApi(locationId?: string) {
  const location = locationId ? getLocationById(locationId) || getDefaultLocation() : getDefaultLocation();
  const { forecast } = getLocationBundle(locationId);
  const performance = generatePredictionFeedback(forecast, location);
  return { location, performance };
}

export function getScenarioForApi(locationId: string | undefined, input: ScenarioInput) {
  const location = locationId ? getLocationById(locationId) || getDefaultLocation() : getDefaultLocation();
  const { forecast } = getLocationBundle(locationId);
  const result = runScenario(forecast, input);
  return { location, result };
}

export function getDataQualityForApi() {
  const profile = getDatasetProfile();
  const stationCount = ASIA_LOCATIONS.reduce((a, l) => a + l.stationCount, 0);
  return {
    profile,
    demoData: {
      locations: ASIA_LOCATIONS.length,
      stations: stationCount,
      pollutants: ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO'],
      weatherVariables: ['Temperature', 'Humidity', 'Wind Speed', 'Wind Direction', 'Pressure', 'Precipitation', 'Cloud', 'Visibility'],
      generatedRecords: stationCount * 25, // ~25 records per station (24h trend + current)
      dataFreshness: new Date().toISOString(),
      source: 'ASIA_DEMO_DATA' as const,
      historicalCsvConnected: false,
    },
  };
}

export function getAllLocations() {
  return ASIA_LOCATIONS;
}

export function jsonRes(data: unknown, status = 200) {
  return Response.json(data, { status });
}

// Returns a generic, caller-safe message. Never pass an exception message or any
// other internal detail as `message` — log it via `cause` instead, which stays
// server-side.
export function errorRes(message: string, status = 500, cause?: unknown) {
  if (cause !== undefined) {
    console.error(`[api] ${message}:`, cause);
  }
  return Response.json({ error: message }, { status });
}
