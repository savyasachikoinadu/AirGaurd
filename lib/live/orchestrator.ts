// Live data orchestrator — coordinates OpenAQ and Open-Meteo providers,
// normalizes results, and provides a single fetch point for the dashboard.

import type {
  LiveDataBundle,
  LiveStationReading,
  LiveWeatherData,
  LiveForecastData,
  LocationDef,
  DataMode,
  DataQualityLive,
  FreshnessLabel,
} from '../types';
import { fetchOpenAQStations } from './openaq';
import { fetchOpenMeteoWeather, fetchOpenMeteoForecast, fetchOpenMeteoCurrentAir } from './openmeteo';
import { isOpenAQConfigured } from './openaq';

// Freshness thresholds (in minutes)
const FRESH_LIVE_MIN = 60;
const FRESH_RECENT_MIN = 180;

export function getFreshnessLabel(observedAt: string): FreshnessLabel {
  const ageMin = (Date.now() - new Date(observedAt).getTime()) / 60000;
  if (ageMin <= FRESH_LIVE_MIN) return 'LIVE';
  if (ageMin <= FRESH_RECENT_MIN) return 'RECENT';
  return 'STALE';
}

// In-memory cache with TTL to avoid hammering external APIs
interface CacheEntry {
  data: LiveDataBundle;
  ts: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 120_000; // 2 minutes

export async function getLiveData(location: LocationDef, mode: DataMode = 'LIVE'): Promise<LiveDataBundle> {
  if (mode === 'DEMO') {
    return getDemoBundle(location);
  }

  const cacheKey = `live:${location.id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const bundle = await fetchLiveData(location);
  cache.set(cacheKey, { data: bundle, ts: Date.now() });
  return bundle;
}

async function fetchLiveData(location: LocationDef): Promise<LiveDataBundle> {
  const errors: string[] = [];
  const center = location.location;

  // 1. Fetch OpenAQ stations and Open-Meteo data in parallel
  const [openaqResult, weatherResult, forecastResult] = await Promise.all([
    fetchOpenAQStations(center, 25, location.city),
    fetchOpenMeteoWeather(center),
    fetchOpenMeteoForecast(center, 24),
  ]);

  // Collect errors
  if (openaqResult.error) errors.push(`OpenAQ: ${openaqResult.error}`);
  if (weatherResult.error) errors.push(`Open-Meteo Weather: ${weatherResult.error}`);
  if (forecastResult.error) errors.push(`Open-Meteo Forecast: ${forecastResult.error}`);

  // 2. Build stations list — keep all OpenAQ stations (even without measurements)
  let stations: LiveStationReading[] = openaqResult.stations;

  // Check if any OpenAQ stations have actual measurements
  const openaqStationsWithMeasurements = stations.filter(
    (s) => s.pm25 !== undefined || s.pm10 !== undefined ||
      s.no2 !== undefined || s.so2 !== undefined ||
      s.co !== undefined || s.o3 !== undefined
  );

  // If OpenAQ returned no stations at all, fall back to Open-Meteo modelled current air
  // This provides a city-level modelled reading so the dashboard isn't empty
  if (stations.length === 0) {
    const modelledAir = await fetchOpenMeteoCurrentAir(center);
    if (modelledAir.reading) {
      stations = [modelledAir.reading];
    }
    if (modelledAir.error) errors.push(`Open-Meteo Current Air: ${modelledAir.error}`);
  }

  // 3. Determine provider statuses
  // OpenAQ is 'ok' only when we have stations with actual measurements
  const openaqStatus: LiveDataBundle['providerStatus']['openaq'] =
    openaqStationsWithMeasurements.length > 0 ? 'ok' :
    openaqResult.status === 'ok' ? 'no_stations' :
    openaqResult.status;

  const providerStatus: LiveDataBundle['providerStatus'] = {
    openaq: openaqStatus,
    openmeteo: (weatherResult.status === 'ok' || forecastResult.status === 'ok') ? 'ok' :
      (weatherResult.status === 'unreachable' && forecastResult.status === 'unreachable') ? 'unreachable' : 'error',
  };

  return {
    stations,
    weather: weatherResult.data,
    forecast: forecastResult.data,
    location,
    mode: 'LIVE',
    providerStatus,
    lastUpdated: new Date().toISOString(),
    errors,
  };
}

function getDemoBundle(location: LocationDef): LiveDataBundle {
  return {
    stations: [],
    weather: null,
    forecast: null,
    location,
    mode: 'DEMO',
    providerStatus: {
      openaq: isOpenAQConfigured() ? 'ok' : 'no_key',
      openmeteo: 'ok',
    },
    lastUpdated: new Date().toISOString(),
    errors: [],
  };
}

export function getLiveDataQuality(bundle: LiveDataBundle): DataQualityLive {
  const stations = bundle.stations;
  const now = Date.now();

  let newestObs: string | null = null;
  let oldestObs: string | null = null;
  let staleCount = 0;
  let pm25Count = 0;
  let pm10Count = 0;
  const missingPollutants: string[] = [];

  const hasPm25 = stations.some((s) => s.pm25 !== undefined);
  const hasPm10 = stations.some((s) => s.pm10 !== undefined);
  const hasNo2 = stations.some((s) => s.no2 !== undefined);
  const hasO3 = stations.some((s) => s.o3 !== undefined);
  const hasSo2 = stations.some((s) => s.so2 !== undefined);
  const hasCo = stations.some((s) => s.co !== undefined);

  if (!hasPm25) missingPollutants.push('PM2.5');
  if (!hasPm10) missingPollutants.push('PM10');
  if (!hasNo2) missingPollutants.push('NO2');
  if (!hasO3) missingPollutants.push('O3');
  if (!hasSo2) missingPollutants.push('SO2');
  if (!hasCo) missingPollutants.push('CO');

  for (const s of stations) {
    const obsTime = new Date(s.observedAt).getTime();
    if (isNaN(obsTime)) continue;

    if (!newestObs || new Date(newestObs).getTime() < obsTime) {
      newestObs = s.observedAt;
    }
    if (!oldestObs || new Date(oldestObs).getTime() > obsTime) {
      oldestObs = s.observedAt;
    }

    const ageMin = (now - obsTime) / 60000;
    if (ageMin > FRESH_RECENT_MIN) staleCount++;

    if (s.pm25 !== undefined) pm25Count++;
    if (s.pm10 !== undefined) pm10Count++;
  }

  return {
    mode: bundle.mode,
    liveStations: stations.length,
    stationsQueried: stations.length,
    stationsWithPm25: pm25Count,
    stationsWithPm10: pm10Count,
    newestObservation: newestObs,
    oldestObservation: oldestObs,
    missingPollutants,
    openaqStatus: bundle.providerStatus.openaq,
    openmeteoStatus: bundle.providerStatus.openmeteo,
    staleObservations: staleCount,
    forecastSource: bundle.forecast?.source ?? 'unavailable',
  };
}
