// OpenAQ V3 API provider — server-side only
// Fetches real monitoring station data from OpenAQ
// Requires OPENAQ_API_KEY in server environment (never exposed to browser)

import type { LiveStationReading, GeoPoint } from '../types';
import { calculateCpcbAqi, getAqiCategory } from '../aqi/cpcb';

const OPENAQ_BASE = 'https://api.openaq.org/v3';

// ─── OpenAQ v3 response interfaces (matching actual API schema) ───

interface OpenAQV3Sensor {
  id: number;
  name: string;
  parameter: {
    id: number;
    name: string;
    units: string;
    displayName: string;
  };
}

interface OpenAQV3Location {
  id: number;
  name: string;
  locality?: string;
  timezone?: string;
  country: { id: number; code: string; name: string };
  provider?: { id: number; name: string };
  owner?: { id: number; name: string };
  isMobile: boolean;
  isMonitor?: boolean;
  sensors: OpenAQV3Sensor[];
  coordinates: { latitude: number; longitude: number };
  bounds?: number[];
  distance?: number | null;
  datetimeFirst?: { utc: string; local: string };
  datetimeLast?: { utc: string; local: string };
}

interface OpenAQV3LocationsResponse {
  meta: { name: string; website: string; page: number; limit: number; found: number };
  results: OpenAQV3Location[];
}

// Latest measurement for a single location: GET /v3/locations/{id}/latest
interface OpenAQV3LatestResult {
  datetime: { utc: string; local: string };
  value: number;
  coordinates: { latitude: number; longitude: number };
  sensorsId: number;
  locationsId: number;
}

interface OpenAQV3LatestResponse {
  meta: { name: string; website: string; page: number; limit: number; found: number };
  results: OpenAQV3LatestResult[];
}

// ─── API key handling ───

function getApiKey(): string | null {
  const key = process.env.OPENAQ_API_KEY;
  if (!key || key.trim() === '') return null;
  return key;
}

export function isOpenAQConfigured(): boolean {
  return getApiKey() !== null;
}

// Read the OpenAQ error response body and return a safe message.
// Never includes the API key. Surfaces provider detail for debugging.
async function safeReadErrorBody(response: Response): Promise<string> {
  const status = response.status;
  const statusText = response.statusText || '';
  try {
    const body = await response.json();
    const detail = (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string')
      ? body.detail
      : (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string')
        ? body.message
        : JSON.stringify(body).slice(0, 200);
    return `OpenAQ ${status}: ${detail}`;
  } catch {
    return `OpenAQ ${status}${statusText ? ` ${statusText}` : ''}`;
  }
}

// ─── Pollutant mapping ───

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
function normalizeCOValue(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === 'mg/m³' || u === 'mg/m3') return value;
  if (u === 'µg/m³' || u === 'ug/m³' || u === 'ug/m3' || u === 'µg/m3') return value / 1000;
  return value / 1000;
}

// ─── Result type ───

export interface OpenAQStationResult {
  stations: LiveStationReading[];
  status: 'ok' | 'error' | 'no_key' | 'no_stations' | 'unreachable';
  error?: string;
  locationsFound?: number;
  locationsRetained?: number;
  stationsWithMeasurements?: number;
}

// ─── Station discovery + latest measurements ───

/**
 * Discover monitoring stations around a coordinate using OpenAQ V3 locations endpoint,
 * then fetch latest measurements for each location via /v3/locations/{id}/latest.
 *
 * A station is kept on the map if it has at least one supported pollutant sensor,
 * even if the latest measurement fetch fails — it will be shown without current readings.
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

  const coords = `${center.lat},${center.lng}`;
  const radiusM = String(Math.min(Math.round(radiusKm * 1000), 25000));
  const params = new URLSearchParams({
    coordinates: coords,
    radius: radiusM,
    limit: '100',
    order_by: 'id',
  });

  const locationsUrl = `${OPENAQ_BASE}/locations?${params}`;
  console.log(`[OpenAQ] GET ${locationsUrl}`);

  let locations: OpenAQV3Location[];
  let locationsFound = 0;
  try {
    const response = await fetch(locationsUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`[OpenAQ] locations HTTP status: ${response.status}`);

    if (response.status === 429) {
      return { stations: [], status: 'error', error: 'OpenAQ rate limit exceeded' };
    }
    if (!response.ok) {
      const detail = await safeReadErrorBody(response);
      console.error(`[OpenAQ] locations error: ${detail}`);
      return { stations: [], status: 'error', error: detail };
    }

    const data = (await response.json()) as OpenAQV3LocationsResponse;
    locations = data.results || [];
    locationsFound = data.meta?.found ?? locations.length;

    console.log(`[OpenAQ] locations returned: ${locations.length} (found: ${locationsFound})`);
    for (const loc of locations) {
      console.log(`[OpenAQ] location id=${loc.id} name="${loc.name}" coords=(${loc.coordinates?.latitude}, ${loc.coordinates?.longitude}) sensors=${loc.sensors?.length ?? 0}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { stations: [], status: 'unreachable', error: 'OpenAQ request timed out' };
    }
    return { stations: [], status: 'unreachable', error: msg };
  }

  if (locations.length === 0) {
    return { stations: [], status: 'no_stations', error: 'No stations found within radius', locationsFound: 0, locationsRetained: 0 };
  }

  // Keep locations that have at least one supported AQ pollutant sensor.
  // We do NOT require every pollutant — even a single one (e.g. only PM2.5) is enough.
  const supportedPollutants = new Set(['pm25', 'pm10', 'no2', 'so2', 'co', 'o3']);

  const retained = locations.filter((loc) => {
    if (!loc.sensors || loc.sensors.length === 0) return false;
    return loc.sensors.some((s) => supportedPollutants.has(s.parameter?.name?.toLowerCase()));
  });

  console.log(`[OpenAQ] locations after pollutant filter: ${retained.length} (was ${locations.length})`);

  if (retained.length === 0) {
    return {
      stations: [],
      status: 'no_stations',
      error: 'No AQ stations with relevant pollutants found',
      locationsFound,
      locationsRetained: 0,
      stationsWithMeasurements: 0,
    };
  }

  // Build a sensorId → pollutant-key map for each location
  // Then fetch /v3/locations/{id}/latest for each station in parallel
  const stationPromises = retained.map(async (loc) => {
    const sensorMap = new Map<number, { key: string; units: string }>();
    for (const s of loc.sensors) {
      const key = mapParameterName(s.parameter?.name || '');
      if (key) {
        sensorMap.set(s.id, { key, units: s.parameter?.units || '' });
      }
    }

    // Fetch latest measurements for this location
    let latestResults: OpenAQV3LatestResult[] = [];
    let latestError: string | null = null;
    try {
      const latestUrl = `${OPENAQ_BASE}/locations/${loc.id}/latest`;
      const latestResp = await fetch(latestUrl, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        next: { revalidate: 120 },
        signal: AbortSignal.timeout(10000),
      });

      if (latestResp.ok) {
        const latestData = (await latestResp.json()) as OpenAQV3LatestResponse;
        latestResults = latestData.results || [];
      } else if (latestResp.status === 404) {
        // No latest measurements for this location — keep station with no readings
        latestError = 'no measurements';
      } else {
        latestError = `HTTP ${latestResp.status}`;
      }
    } catch (err) {
      latestError = err instanceof Error ? err.message : 'fetch failed';
    }

    // Build readings from latest results, matching sensorId to pollutant key
    const readings: Partial<LiveStationReading> = {
      pm25: undefined, pm10: undefined, no2: undefined,
      so2: undefined, co: undefined, o3: undefined, nh3: undefined,
    };
    let observedAt: string | undefined;

    for (const m of latestResults) {
      const sensorInfo = sensorMap.get(m.sensorsId);
      if (!sensorInfo) continue;

      if (sensorInfo.key === 'co') {
        readings.co = normalizeCOValue(m.value, sensorInfo.units);
      } else {
        (readings as Record<string, number | undefined>)[sensorInfo.key] = m.value;
      }

      // Use the UTC datetime from the provider
      const utcTime = m.datetime?.utc;
      if (utcTime) {
        const t = new Date(utcTime).getTime();
        if (!isNaN(t) && (!observedAt || new Date(observedAt).getTime() < t)) {
          observedAt = utcTime;
        }
      }
    }

    const hasAnyPollutant = readings.pm25 !== undefined || readings.pm10 !== undefined ||
      readings.no2 !== undefined || readings.so2 !== undefined ||
      readings.co !== undefined || readings.o3 !== undefined;

    // Calculate CPCB AQI only from pollutants actually available
    let aqi: number | undefined;
    let aqiCategory: LiveStationReading['aqiCategory'];

    if (hasAnyPollutant && (readings.pm25 !== undefined || readings.pm10 !== undefined)) {
      const result = calculateCpcbAqi({
        pm25: readings.pm25 ?? 0,
        pm10: readings.pm10 ?? 0,
        no2: readings.no2 ?? 0,
        o3: readings.o3 ?? 0,
        so2: readings.so2 ?? 0,
        co: readings.co ?? 0,
      });
      aqi = result.aqi;
      aqiCategory = getAqiCategory(aqi);
    }

    // Keep the station even if no latest measurements — show it without readings
    const station: LiveStationReading = {
      stationId: `openaq-${loc.id}`,
      stationName: loc.name,
      latitude: loc.coordinates?.latitude ?? center.lat,
      longitude: loc.coordinates?.longitude ?? center.lng,
      city: cityOverride || loc.locality || loc.country?.name || 'Unknown',
      country: loc.country?.name || 'Unknown',
      provider: 'OpenAQ',
      source: 'OPENAQ',
      observedAt: observedAt || (loc.datetimeLast?.utc || new Date().toISOString()),
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

    if (latestError && !hasAnyPollutant) {
      console.log(`[OpenAQ] location id=${loc.id} name="${loc.name}" — no current measurements (${latestError})`);
    } else if (hasAnyPollutant) {
      const pollutantList: string[] = [];
      if (readings.pm25 !== undefined) pollutantList.push('pm25');
      if (readings.pm10 !== undefined) pollutantList.push('pm10');
      if (readings.no2 !== undefined) pollutantList.push('no2');
      if (readings.o3 !== undefined) pollutantList.push('o3');
      if (readings.so2 !== undefined) pollutantList.push('so2');
      if (readings.co !== undefined) pollutantList.push('co');
      console.log(`[OpenAQ] location id=${loc.id} name="${loc.name}" — measurements: ${pollutantList.join(', ')} observed=${observedAt}`);
    }

    return station;
  });

  const allStations = await Promise.all(stationPromises);

  const stationsWithMeas = allStations.filter((s) => s.pm25 !== undefined || s.pm10 !== undefined ||
    s.no2 !== undefined || s.so2 !== undefined || s.co !== undefined || s.o3 !== undefined);

  console.log(`[OpenAQ] final: ${allStations.length} stations on map, ${stationsWithMeas.length} with current measurements`);

  if (allStations.length === 0) {
    return {
      stations: [],
      status: 'no_stations',
      error: 'Stations found but none could be processed',
      locationsFound,
      locationsRetained: retained.length,
      stationsWithMeasurements: 0,
    };
  }

  // Status is 'ok' if we have any stations with measurements, otherwise 'no_stations'
  // but we still return the stations without measurements for map display
  const status = stationsWithMeas.length > 0 ? 'ok' : 'no_stations';

  return {
    stations: allStations,
    status,
    error: stationsWithMeas.length > 0 ? undefined : 'Stations found but none have current measurements',
    locationsFound,
    locationsRetained: retained.length,
    stationsWithMeasurements: stationsWithMeas.length,
  };
}
