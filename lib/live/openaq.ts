// OpenAQ V3 API provider — server-side only
// Fetches real monitoring station data from OpenAQ
// Requires OPENAQ_API_KEY in server environment (never exposed to browser)

import type { LiveStationReading, GeoPoint } from '../types';
import { calculateCpcbAqi, getAqiCategory } from '../aqi/cpcb';

const OPENAQ_BASE = 'https://api.openaq.org/v3';

interface OpenAQParameter {
  parameter: { name: string };
  value: number;
  datetime: string;
  unit: string;
}

interface OpenAQLatestMeasurement {
  parameter: { name: string };
  value: number;
  datetime: string;
  unit: string;
}

interface OpenAQLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: { name: string; code: string };
  city?: string;
  isMobile: boolean;
  parameters: { name: string }[];
  latest: OpenAQLatestMeasurement[];
}

interface OpenAQLocationsResponse {
  results: OpenAQLocation[];
  meta: { found: number; returned: number };
}

interface OpenAQLatestResponse {
  results: {
    locationId: number;
    location: string;
    city?: string;
    country: { name: string; code: string };
    coordinates?: { latitude: number; longitude: number };
    measurements: OpenAQLatestMeasurement[];
  }[];
}

function getApiKey(): string | null {
  const key = process.env.OPENAQ_API_KEY;
  if (!key || key.trim() === '') return null;
  return key;
}

export function isOpenAQConfigured(): boolean {
  return getApiKey() !== null;
}

// Map OpenAQ parameter names to our internal pollutant keys
// OpenAQ uses: pm25, pm10, no2, so2, co, o3, nh3 (lowercase)
function mapParameterName(name: string): string | null {
  const lower = name.toLowerCase().replace('.', '').replace(/[^a-z0-9]/g, '');
  switch (lower) {
    case 'pm25': return 'pm25';
    case 'pm10': return 'pm10';
    case 'no2': return 'no2';
    case 'so2': return 'so2';
    case 'co': return 'co';
    case 'o3': return 'o3';
    case 'nh3': return 'nh3';
    default: return null;
  }
}

// OpenAQ returns CO in various units; CPCB expects mg/m³
// OpenAQ typically returns CO in µg/m³ — convert to mg/m³
function normalizeCOValue(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === 'mg/m³' || u === 'mg/m3') return value;
  if (u === 'µg/m³' || u === 'ug/m³' || u === 'ug/m3' || u === 'µg/m3') return value / 1000;
  return value / 1000; // default assume µg/m³
}

function buildReadingFromLocation(loc: OpenAQLocation, cityOverride?: string): LiveStationReading | null {
  const readings: Partial<LiveStationReading> = {
    pm25: undefined,
    pm10: undefined,
    no2: undefined,
    so2: undefined,
    co: undefined,
    o3: undefined,
    nh3: undefined,
  };

  let observedAt = new Date().toISOString();

  for (const m of loc.latest || []) {
    const key = mapParameterName(m.parameter.name);
    if (!key) continue;
    if (key === 'co') {
      readings.co = normalizeCOValue(m.value, m.unit);
    } else {
      (readings as Record<string, number | undefined>)[key] = m.value;
    }
    // Use the most recent observation time
    const mTime = new Date(m.datetime).getTime();
    if (mTime > 0 && (!observedAt || new Date(observedAt).getTime() < mTime)) {
      observedAt = m.datetime;
    } else if (!observedAt) {
      observedAt = m.datetime;
    }
  }

  // Need at least one pollutant to be useful
  const hasAnyPollutant = readings.pm25 !== undefined || readings.pm10 !== undefined ||
    readings.no2 !== undefined || readings.so2 !== undefined ||
    readings.co !== undefined || readings.o3 !== undefined;

  if (!hasAnyPollutant) return null;

  // Calculate CPCB AQI from available pollutants
  const pollutantInput = {
    pm25: readings.pm25 ?? 0,
    pm10: readings.pm10 ?? 0,
    no2: readings.no2 ?? 0,
    o3: readings.o3 ?? 0,
    so2: readings.so2 ?? 0,
    co: readings.co ?? 0,
  };

  // Only calculate AQI if at least PM2.5 or PM10 is present
  let aqi: number | undefined;
  let aqiCategory: LiveStationReading['aqiCategory'];
  if (readings.pm25 !== undefined || readings.pm10 !== undefined) {
    const result = calculateCpcbAqi(pollutantInput);
    aqi = result.aqi;
    aqiCategory = getAqiCategory(aqi);
  }

  return {
    stationId: `openaq-${loc.id}`,
    stationName: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    city: cityOverride || loc.city || loc.country?.name || 'Unknown',
    country: loc.country?.name || 'Unknown',
    provider: 'OpenAQ',
    source: 'OPENAQ',
    observedAt,
    pm25: readings.pm25,
    pm10: readings.pm10,
    no2: readings.no2,
    so2: readings.so2,
    co: readings.co,
    o3: readings.o3,
    nh3: readings.nh3,
    aqi,
    aqiCategory,
  };
}

export interface OpenAQStationResult {
  stations: LiveStationReading[];
  status: 'ok' | 'error' | 'no_key' | 'no_stations' | 'unreachable';
  error?: string;
}

/**
 * Discover monitoring stations around a coordinate using OpenAQ V3 locations endpoint.
 * Uses a radius-based search around the city center.
 */
export async function fetchOpenAQStations(
  center: GeoPoint,
  radiusKm: number = 25,
  cityOverride?: string,
): Promise<OpenAQStationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { stations: [], status: 'no_key', error: 'OPENAQ_API_KEY not configured' };
  }

  const params = new URLSearchParams({
    coordinates: `${center.lat},${center.lng}`,
    radius: String(radiusKm * 1000), // OpenAQ expects meters
    limit: '100',
    order_by: 'distance',
  });

  try {
    const response = await fetch(`${OPENAQ_BASE}/locations?${params}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      // Cache for 2 minutes at the fetch level
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      return { stations: [], status: 'error', error: 'OpenAQ rate limit exceeded' };
    }
    if (!response.ok) {
      return { stations: [], status: 'error', error: `OpenAQ returned ${response.status}` };
    }

    const data = (await response.json()) as OpenAQLocationsResponse;
    if (!data.results || data.results.length === 0) {
      return { stations: [], status: 'no_stations', error: 'No stations found within radius' };
    }

    // Filter to stations that have at least some air quality parameters
    const aqParams = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
    const filtered = data.results.filter((loc) =>
      loc.parameters && loc.parameters.some((p) => aqParams.includes(p.name.toLowerCase()))
    );

    if (filtered.length === 0) {
      return { stations: [], status: 'no_stations', error: 'No AQ stations with relevant pollutants found' };
    }

    const stations: LiveStationReading[] = [];
    for (const loc of filtered) {
      const reading = buildReadingFromLocation(loc, cityOverride);
      if (reading) stations.push(reading);
    }

    if (stations.length === 0) {
      return { stations: [], status: 'no_stations', error: 'Stations found but none had current measurements' };
    }

    return { stations, status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { stations: [], status: 'unreachable', error: 'OpenAQ request timed out' };
    }
    return { stations: [], status: 'unreachable', error: msg };
  }
}

/**
 * Fetch latest measurements for a specific location ID from OpenAQ.
 * This is an alternative to the locations endpoint when we need fresh measurements.
 */
export async function fetchOpenAQLatest(
  center: GeoPoint,
  radiusKm: number = 25,
  cityOverride?: string,
): Promise<OpenAQStationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { stations: [], status: 'no_key', error: 'OPENAQ_API_KEY not configured' };
  }

  const params = new URLSearchParams({
    coordinates: `${center.lat},${center.lng}`,
    radius: String(radiusKm * 1000),
    limit: '100',
  });

  try {
    const response = await fetch(`${OPENAQ_BASE}/latest?${params}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      return { stations: [], status: 'error', error: 'OpenAQ rate limit exceeded' };
    }
    if (!response.ok) {
      return { stations: [], status: 'error', error: `OpenAQ returned ${response.status}` };
    }

    const data = (await response.json()) as OpenAQLatestResponse;
    if (!data.results || data.results.length === 0) {
      return { stations: [], status: 'no_stations', error: 'No latest measurements found' };
    }

    const stations: LiveStationReading[] = [];
    for (const result of data.results) {
      const readings: Partial<LiveStationReading> = {};
      let observedAt = new Date().toISOString();

      for (const m of result.measurements || []) {
        const key = mapParameterName(m.parameter.name);
        if (!key) continue;
        if (key === 'co') {
          readings.co = normalizeCOValue(m.value, m.unit);
        } else {
          (readings as Record<string, number | undefined>)[key] = m.value;
        }
        if (m.datetime) observedAt = m.datetime;
      }

      const hasAnyPollutant = readings.pm25 !== undefined || readings.pm10 !== undefined ||
        readings.no2 !== undefined || readings.so2 !== undefined ||
        readings.co !== undefined || readings.o3 !== undefined;

      if (!hasAnyPollutant) continue;

      const lat = result.coordinates?.latitude ?? center.lat;
      const lng = result.coordinates?.longitude ?? center.lng;

      let aqi: number | undefined;
      let aqiCategory: LiveStationReading['aqiCategory'];
      if (readings.pm25 !== undefined || readings.pm10 !== undefined) {
        const result2 = calculateCpcbAqi({
          pm25: readings.pm25 ?? 0,
          pm10: readings.pm10 ?? 0,
          no2: readings.no2 ?? 0,
          o3: readings.o3 ?? 0,
          so2: readings.so2 ?? 0,
          co: readings.co ?? 0,
        });
        aqi = result2.aqi;
        aqiCategory = getAqiCategory(aqi);
      }

      stations.push({
        stationId: `openaq-latest-${result.locationId}`,
        stationName: result.location || 'Unknown Station',
        latitude: lat,
        longitude: lng,
        city: cityOverride || result.city || 'Unknown',
        country: result.country?.name || 'Unknown',
        provider: 'OpenAQ',
        source: 'OPENAQ',
        observedAt,
        pm25: readings.pm25,
        pm10: readings.pm10,
        no2: readings.no2,
        so2: readings.so2,
        co: readings.co,
        o3: readings.o3,
        aqi,
        aqiCategory,
      });
    }

    if (stations.length === 0) {
      return { stations: [], status: 'no_stations', error: 'No stations with valid measurements' };
    }

    return { stations, status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { stations: [], status: 'unreachable', error: 'OpenAQ request timed out' };
    }
    return { stations: [], status: 'unreachable', error: msg };
  }
}
