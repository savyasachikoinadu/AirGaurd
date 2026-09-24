// Open-Meteo API provider — server-side only
// No API key required for public API usage.
// Provides current weather and air-quality forecast data.

import type { GeoPoint, AqiCategory, LiveWeatherData, LiveForecastData, LiveStationReading } from '../types';
import { calculateCpcbAqi, getAqiCategory } from '../aqi/cpcb';

const OPEN_METEO_WEATHER = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

interface OpenMeteoWeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
    precipitation: number;
    cloud_cover: number;
    visibility: number;
    time: string;
  };
}

interface OpenMeteoAirResponse {
  current?: {
    pm2_5: number;
    pm10: number;
    nitrogen_dioxide: number;
    sulphur_dioxide: number;
    carbon_monoxide: number;
    ozone: number;
    time: string;
  };
  hourly?: {
    time: string[];
    pm2_5: number[];
    pm10: number[];
    nitrogen_dioxide: number[];
    sulphur_dioxide: number[];
    carbon_monoxide: number[];
    ozone: number[];
  };
}

// Open-Meteo returns CO in µg/m³; CPCB expects mg/m³
function coUgToMg(ug: number): number {
  return ug / 1000;
}

export async function fetchOpenMeteoWeather(
  center: GeoPoint,
): Promise<{ data: LiveWeatherData | null; status: 'ok' | 'error' | 'unreachable'; error?: string }> {
  const params = new URLSearchParams({
    latitude: String(center.lat),
    longitude: String(center.lng),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'surface_pressure',
      'precipitation',
      'cloud_cover',
      'visibility',
    ].join(','),
    timezone: 'auto',
  });

  try {
    const response = await fetch(`${OPEN_METEO_WEATHER}?${params}`, {
      next: { revalidate: 180 }, // 3 minutes
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { data: null, status: 'error', error: `Open-Meteo weather returned ${response.status}` };
    }

    const data = (await response.json()) as OpenMeteoWeatherResponse;
    if (!data.current) {
      return { data: null, status: 'error', error: 'No current weather data in response' };
    }

    const c = data.current;
    return {
      data: {
        temperatureC: Math.round(c.temperature_2m * 10) / 10,
        humidity: Math.round(c.relative_humidity_2m),
        windSpeedKph: Math.round(c.wind_speed_10m * 10) / 10,
        windDirectionDeg: Math.round(c.wind_direction_10m),
        pressureMb: Math.round(c.surface_pressure),
        precipitationMm: Math.round(c.precipitation * 10) / 10,
        cloud: Math.round(c.cloud_cover),
        visibilityKm: Math.round((c.visibility / 1000) * 10) / 10,
        observedAt: c.time,
        source: 'OPEN_METEO',
      },
      status: 'ok',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { data: null, status: 'unreachable', error: 'Open-Meteo weather timed out' };
    }
    return { data: null, status: 'unreachable', error: msg };
  }
}

export async function fetchOpenMeteoForecast(
  center: GeoPoint,
  hoursAhead: number = 24,
): Promise<{ data: LiveForecastData | null; status: 'ok' | 'error' | 'unreachable'; error?: string }> {
  const params = new URLSearchParams({
    latitude: String(center.lat),
    longitude: String(center.lng),
    hourly: ['pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide', 'ozone'].join(','),
    timezone: 'auto',
    forecast_days: '2',
  });

  try {
    const response = await fetch(`${OPEN_METEO_AIR}?${params}`, {
      next: { revalidate: 300 }, // 5 minutes
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { data: null, status: 'error', error: `Open-Meteo air quality returned ${response.status}` };
    }

    const data = (await response.json()) as OpenMeteoAirResponse;
    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      return { data: null, status: 'error', error: 'No hourly forecast data in response' };
    }

    const now = Date.now();
    const timestamps: string[] = [];
    const pm25Arr: number[] = [];
    const pm10Arr: number[] = [];
    const no2Arr: number[] = [];
    const o3Arr: number[] = [];
    const so2Arr: number[] = [];
    const coArr: number[] = [];
    const aqiArr: number[] = [];
    const aqiCatArr: AqiCategory[] = [];

    // Take the next N hours starting from the current hour
    let count = 0;
    for (let i = 0; i < data.hourly.time.length && count < hoursAhead; i++) {
      const t = data.hourly.time[i];
      const tMs = new Date(t).getTime();
      if (tMs < now - 3600000) continue; // skip past hours (allow 1h tolerance)

      const pm25 = data.hourly.pm2_5?.[i] ?? 0;
      const pm10 = data.hourly.pm10?.[i] ?? 0;
      const no2 = data.hourly.nitrogen_dioxide?.[i] ?? 0;
      const so2 = data.hourly.sulphur_dioxide?.[i] ?? 0;
      const co = coUgToMg(data.hourly.carbon_monoxide?.[i] ?? 0);
      const o3 = data.hourly.ozone?.[i] ?? 0;

      const { aqi } = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });

      timestamps.push(t);
      pm25Arr.push(Math.round(pm25 * 10) / 10);
      pm10Arr.push(Math.round(pm10 * 10) / 10);
      no2Arr.push(Math.round(no2 * 10) / 10);
      o3Arr.push(Math.round(o3 * 10) / 10);
      so2Arr.push(Math.round(so2 * 10) / 10);
      coArr.push(Math.round(co * 100) / 100);
      aqiArr.push(aqi);
      aqiCatArr.push(getAqiCategory(aqi));
      count++;
    }

    if (timestamps.length === 0) {
      return { data: null, status: 'error', error: 'No future forecast hours available' };
    }

    return {
      data: {
        timestamps,
        pm25: pm25Arr,
        pm10: pm10Arr,
        no2: no2Arr,
        o3: o3Arr,
        so2: so2Arr,
        co: coArr,
        aqi: aqiArr,
        aqiCategory: aqiCatArr,
        source: 'OPEN_METEO',
        updatedAt: new Date().toISOString(),
      },
      status: 'ok',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { data: null, status: 'unreachable', error: 'Open-Meteo air quality timed out' };
    }
    return { data: null, status: 'unreachable', error: msg };
  }
}

// Fetch current modelled air quality from Open-Meteo (used when no OpenAQ stations available)
export async function fetchOpenMeteoCurrentAir(
  center: GeoPoint,
): Promise<{ reading: LiveStationReading | null; status: 'ok' | 'error' | 'unreachable'; error?: string }> {
  const params = new URLSearchParams({
    latitude: String(center.lat),
    longitude: String(center.lng),
    current: ['pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide', 'ozone'].join(','),
    timezone: 'auto',
  });

  try {
    const response = await fetch(`${OPEN_METEO_AIR}?${params}`, {
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { reading: null, status: 'error', error: `Open-Meteo current air returned ${response.status}` };
    }

    const data = (await response.json()) as OpenMeteoAirResponse;
    if (!data.current) {
      return { reading: null, status: 'error', error: 'No current air quality data' };
    }

    const c = data.current;
    const pm25 = c.pm2_5 ?? 0;
    const pm10 = c.pm10 ?? 0;
    const no2 = c.nitrogen_dioxide ?? 0;
    const so2 = c.sulphur_dioxide ?? 0;
    const co = coUgToMg(c.carbon_monoxide ?? 0);
    const o3 = c.ozone ?? 0;

    const { aqi, dominantPollutant } = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });
    const aqiCategory = getAqiCategory(aqi);

    return {
      reading: {
        stationId: `openmeteo-current`,
        stationName: 'Open-Meteo Model (City Center)',
        latitude: center.lat,
        longitude: center.lng,
        city: 'Modelled',
        country: 'Modelled',
        provider: 'Open-Meteo',
        source: 'OPEN_METEO',
        observedAt: c.time,
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        no2: Math.round(no2 * 10) / 10,
        so2: Math.round(so2 * 10) / 10,
        co: Math.round(co * 100) / 100,
        o3: Math.round(o3 * 10) / 10,
        aqi,
        aqiCategory,
      },
      status: 'ok',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('timeout') || msg.includes('abort')) {
      return { reading: null, status: 'unreachable', error: 'Open-Meteo current air timed out' };
    }
    return { reading: null, status: 'unreachable', error: msg };
  }
}
