// Deterministic Asia Demo Data engine
// Generates stable, realistic-looking pollution and weather values for demo stations.
// All values are fictional. Source = ASIA_DEMO_DATA.

import type {
  DemoStation,
  PollutantReadings,
  WeatherReadings,
  TrendData,
  LocationDef,
  GeoPoint,
  DataSource,
} from '../types';
import { SeededRandom, hashStringToSeed, getStationSeed } from './seeded-random';
import { calculateCpcbAqi, getAqiCategory, getAqiRiskLevel } from '../aqi/cpcb';
import {
  getStationsForLocation,
  type DemoStationDef,
} from './locations';

const DEMO_SOURCE: DataSource = 'ASIA_DEMO_DATA';

// Time-of-day pollution multiplier (typical urban diurnal pattern)
// Two peaks: morning rush (8-10h) and evening rush (18-21h)
function getTimeOfDayMultiplier(hour: number): number {
  const morningPeak = Math.exp(-Math.pow(hour - 9, 2) / 8);
  const eveningPeak = Math.exp(-Math.pow(hour - 19.5, 2) / 10);
  const baseLevel = 0.7;
  return baseLevel + morningPeak * 0.5 + eveningPeak * 0.6;
}

function generateWeather(rng: SeededRandom, stationDef: DemoStationDef, location: LocationDef): WeatherReadings {
  const latFactor = Math.abs(location.location.lat) / 50;
  return {
    temperatureC: rng.range(22 - latFactor * 8, 34 - latFactor * 10),
    humidity: rng.range(40, 75),
    windSpeedKph: rng.range(3, 18),
    windDirectionDeg: rng.int(0, 359),
    pressureMb: rng.range(1005, 1018),
    precipitationMm: rng.next() > 0.8 ? rng.range(0.1, 5) : 0,
    cloud: rng.range(10, 80),
    visibilityKm: rng.range(4, 12),
  };
}

function generatePollutants(
  rng: SeededRandom,
  stationDef: DemoStationDef,
  hourOfDay: number,
): PollutantReadings {
  const todMult = getTimeOfDayMultiplier(hourOfDay);
  const variation = (rng.next() - 0.5) * 0.2; // ±10% variation

  const pm25 = Math.max(5, stationDef.basePm25 * todMult * (1 + variation));
  const pm10 = Math.max(10, stationDef.basePm10 * todMult * (1 + variation * 0.8));
  const no2 = Math.max(5, stationDef.baseNo2 * todMult * (1 + variation * 1.2));
  const o3 = Math.max(5, stationDef.baseO3 * (1 + (1 - todMult) * 0.3 + variation * 0.5));
  const so2 = Math.max(2, stationDef.baseSo2 * (1 + variation * 0.6));
  const co = Math.max(0.3, stationDef.baseCo * todMult * (1 + variation * 0.9));

  return {
    pm25: Math.round(pm25 * 10) / 10,
    pm10: Math.round(pm10 * 10) / 10,
    no2: Math.round(no2 * 10) / 10,
    o3: Math.round(o3 * 10) / 10,
    so2: Math.round(so2 * 10) / 10,
    co: Math.round(co * 100) / 100,
  };
}

function generateTrend24h(stationDef: DemoStationDef, baseHour: number): TrendData[] {
  const trend: TrendData[] = [];
  for (let h = 24; h >= 0; h--) {
    const hour = (baseHour - h + 24) % 24;
    const seed = getStationSeed(stationDef.id, h);
    const rng = new SeededRandom(seed);
    const pollutants = generatePollutants(rng, stationDef, hour);
    const { aqi } = calculateCpcbAqi(pollutants);
    const timestamp = new Date(Date.now() - h * 3600 * 1000).toISOString();
    trend.push({
      timestamp,
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      aqi,
    });
  }
  return trend;
}

export function generateDemoStations(location: LocationDef, baseHour?: number): DemoStation[] {
  const hour = baseHour ?? new Date().getHours();
  const stationDefs = getStationsForLocation(location);

  return stationDefs.map((def) => {
    const seed = hashStringToSeed(`${def.id}:${location.id}:current`);
    const rng = new SeededRandom(seed);
    const pollutants = generatePollutants(rng, def, hour);
    const weather = generateWeather(rng, def, location);
    const { aqi, dominantPollutant } = calculateCpcbAqi(pollutants);
    const aqiCategory = getAqiCategory(aqi);
    const riskLevel = getAqiRiskLevel(aqi);
    const trend24h = generateTrend24h(def, hour);

    const stationLocation: GeoPoint = {
      lat: location.location.lat + def.offsetLat,
      lng: location.location.lng + def.offsetLng,
    };

    return {
      id: def.id,
      name: def.name,
      location: stationLocation,
      pollutants,
      weather,
      aqi,
      aqiCategory,
      riskLevel,
      dominantPollutant,
      trend24h,
      source: DEMO_SOURCE,
    };
  });
}

export function getStationDef(stationId: string, location: LocationDef): DemoStationDef | undefined {
  return getStationsForLocation(location).find((s) => s.id === stationId);
}

export function getDemoSourceLabel(): string {
  return 'ASIA DEMO DATA';
}

export { DEMO_SOURCE, getTimeOfDayMultiplier, generatePollutants };
