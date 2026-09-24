// Hybrid Baseline Forecast Engine
// Deterministic forecasting using trend extrapolation, time-of-day patterns,
// weather adjustment, and local sensor correction.
// This is NOT a trained ML model. It is a baseline hybrid forecast.

import type {
  PollutantReadings,
  WeatherReadings,
  ForecastPoint,
  TrendData,
  DemoStation,
  ConfidenceLevel,
  TrendDirection,
  PollutantKey,
  AqiCategory,
  RiskLevel,
  DataSource,
} from '../types';
import { calculateCpcbAqi, getAqiCategory, getAqiRiskLevel } from '../aqi/cpcb';
import { getTimeOfDayMultiplier } from '../demo/generator';
import { SeededRandom, hashStringToSeed } from '../demo/seeded-random';
import type { DemoStationDef } from '../demo/locations';

const FORECAST_HORIZONS = [0, 6, 12, 18, 24];
const FORECAST_LABELS = ['NOW', '+6H', '+12H', '+18H', '+24H'];
const FORECAST_SOURCE: DataSource = 'MODEL_FORECAST';

export interface ForecastInput {
  currentPollutants: PollutantReadings;
  currentWeather: WeatherReadings;
  trend24h: TrendData[];
  hourOfDay: number;
  stationInfluences: { traffic: number; industrial: number; burning: number };
  stationId: string;
}

function calculateTrendSlope(trend: TrendData[]): { pm25Slope: number; pm10Slope: number; aqiSlope: number } {
  if (trend.length < 2) return { pm25Slope: 0, pm10Slope: 0, aqiSlope: 0 };
  const recent = trend.slice(-6); // last 6 hours
  if (recent.length < 2) return { pm25Slope: 0, pm10Slope: 0, aqiSlope: 0 };

  let pm25Sum = 0, pm10Sum = 0, aqiSum = 0;
  for (let i = 1; i < recent.length; i++) {
    pm25Sum += recent[i].pm25 - recent[i - 1].pm25;
    pm10Sum += recent[i].pm10 - recent[i - 1].pm10;
    aqiSum += recent[i].aqi - recent[i - 1].aqi;
  }
  const n = recent.length - 1;
  return {
    pm25Slope: pm25Sum / n,
    pm10Slope: pm10Sum / n,
    aqiSlope: aqiSum / n,
  };
}

function calculateWeatherAdjustment(weather: WeatherReadings, hoursAhead: number): number {
  let factor = 1.0;
  // Low wind speed → pollution accumulation
  if (weather.windSpeedKph < 5) factor *= 1.12;
  else if (weather.windSpeedKph < 10) factor *= 1.05;
  else if (weather.windSpeedKph > 20) factor *= 0.92;

  // Rainfall → washout
  if (weather.precipitationMm > 2) factor *= 0.85;
  else if (weather.precipitationMm > 0.5) factor *= 0.92;

  // High humidity → secondary particulate formation
  if (weather.humidity > 70) factor *= 1.04;

  // Distant forecast → slight degradation towards normalization
  const horizonFactor = 1.0 - (hoursAhead / 24) * 0.05;
  factor *= horizonFactor;

  return factor;
}

function calculateTrendDirection(slope: number): TrendDirection {
  if (slope > 1.5) return 'rising';
  if (slope < -1.5) return 'falling';
  return 'stable';
}

function calculateConfidence(
  hoursAhead: number,
  trendStability: number,
  dataCoverage: number,
): { level: ConfidenceLevel; score: number } {
  // Heuristic confidence: degrades with horizon, improves with stability and coverage
  const horizonPenalty = Math.max(0, (hoursAhead / 24) * 0.4);
  const stabilityBonus = trendStability * 0.3;
  const coverageBonus = dataCoverage * 0.3;
  const score = Math.max(0.2, Math.min(0.9, 0.8 - horizonPenalty + stabilityBonus + coverageBonus));

  let level: ConfidenceLevel = 'Medium';
  if (score >= 0.7) level = 'High';
  else if (score < 0.45) level = 'Low';

  return { level, score: Math.round(score * 100) / 100 };
}

function calculateTrendStability(trend: TrendData[]): number {
  if (trend.length < 3) return 0.3;
  const recent = trend.slice(-8);
  const values = recent.map((t) => t.aqi);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / Math.max(1, mean);
  // Lower coefficient of variation → higher stability
  return Math.max(0, Math.min(1, 1 - cv));
}

export function forecastAtHorizon(input: ForecastInput, hoursAhead: number): ForecastPoint {
  const { currentPollutants, currentWeather, trend24h, hourOfDay, stationInfluences, stationId } = input;

  const slopes = calculateTrendSlope(trend24h);
  const stability = calculateTrendStability(trend24h);
  const futureHour = (hourOfDay + hoursAhead) % 24;
  const todMultFuture = getTimeOfDayMultiplier(futureHour);
  const todMultCurrent = getTimeOfDayMultiplier(hourOfDay);
  const todRatio = todMultFuture / Math.max(0.5, todMultCurrent);
  const weatherAdj = calculateWeatherAdjustment(currentWeather, hoursAhead);

  // Trend extrapolation (damped with horizon)
  const damping = 1 / (1 + hoursAhead / 12);
  const pm25TrendAdd = slopes.pm25Slope * hoursAhead * damping;
  const pm10TrendAdd = slopes.pm10Slope * hoursAhead * damping;

  // Add small deterministic variation
  const seed = hashStringToSeed(`${stationId}:forecast:${hoursAhead}`);
  const rng = new SeededRandom(seed);
  const noise = (rng.next() - 0.5) * 0.05;

  const pm25 = Math.max(5, currentPollutants.pm25 * todRatio * weatherAdj + pm25TrendAdd * (1 + noise));
  const pm10 = Math.max(10, currentPollutants.pm10 * todRatio * weatherAdj + pm10TrendAdd * (1 + noise));

  // Scale other pollutants similarly but with less trend influence
  const no2 = Math.max(5, currentPollutants.no2 * todRatio * weatherAdj + slopes.pm25Slope * hoursAhead * 0.3 * damping);
  const o3 = Math.max(5, currentPollutants.o3 * (1 + (1 - todRatio) * 0.3) * (1 + noise));
  const so2 = Math.max(2, currentPollutants.so2 * (1 + noise * 0.5));
  const co = Math.max(0.3, currentPollutants.co * todRatio * weatherAdj * (1 + noise * 0.3));

  const pollutants: PollutantReadings = {
    pm25: Math.round(pm25 * 10) / 10,
    pm10: Math.round(pm10 * 10) / 10,
    no2: Math.round(no2 * 10) / 10,
    o3: Math.round(o3 * 10) / 10,
    so2: Math.round(so2 * 10) / 10,
    co: Math.round(co * 100) / 100,
  };

  const { aqi, dominantPollutant } = calculateCpcbAqi(pollutants);
  const aqiCategory = getAqiCategory(aqi);
  const riskLevel = getAqiRiskLevel(aqi);

  const dataCoverage = Math.min(1, trend24h.length / 24);
  const { level: confidence, score: confidenceScore } = calculateConfidence(
    hoursAhead, stability, dataCoverage,
  );

  const trendDirection = calculateTrendDirection(slopes.aqiSlope);
  const timestamp = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
  const label = FORECAST_LABELS[FORECAST_HORIZONS.indexOf(hoursAhead)] || `+${hoursAhead}H`;

  return {
    horizon: hoursAhead,
    label,
    timestamp,
    pollutants,
    aqi,
    aqiCategory,
    riskLevel,
    dominantPollutant,
    confidence,
    confidenceScore,
    trendDirection,
    source: FORECAST_SOURCE,
  };
}

export function forecastAirQuality(input: ForecastInput): ForecastPoint[] {
  return FORECAST_HORIZONS.map((h) => forecastAtHorizon(input, h));
}

export function buildForecastInputFromStation(station: DemoStation, stationDef?: DemoStationDef): ForecastInput {
  const hourOfDay = new Date().getHours();
  return {
    currentPollutants: station.pollutants,
    currentWeather: station.weather,
    trend24h: station.trend24h,
    hourOfDay,
    stationInfluences: stationDef
      ? { traffic: stationDef.trafficInfluence, industrial: stationDef.industrialInfluence, burning: stationDef.burningInfluence }
      : { traffic: 0.5, industrial: 0.3, burning: 0.2 },
    stationId: station.id,
  };
}

// Build an aggregate forecast for a location from all its stations
export function forecastForLocation(stations: DemoStation[], stationDefs?: DemoStationDef[]): ForecastPoint[] {
  if (stations.length === 0) return [];

  // Use the average of station forecasts for the location-level forecast
  const allForecasts = stations.map((s, i) => {
    const def = stationDefs?.[i];
    const input = buildForecastInputFromStation(s, def);
    return forecastAirQuality(input);
  });

  return FORECAST_HORIZONS.map((h, hIdx) => {
    const horizonForecasts = allForecasts.map((f) => f[hIdx]);
    const avgPm25 = avg(horizonForecasts.map((f) => f.pollutants.pm25));
    const avgPm10 = avg(horizonForecasts.map((f) => f.pollutants.pm10));
    const avgNo2 = avg(horizonForecasts.map((f) => f.pollutants.no2));
    const avgO3 = avg(horizonForecasts.map((f) => f.pollutants.o3));
    const avgSo2 = avg(horizonForecasts.map((f) => f.pollutants.so2));
    const avgCo = avg(horizonForecasts.map((f) => f.pollutants.co));

    const pollutants: PollutantReadings = {
      pm25: Math.round(avgPm25 * 10) / 10,
      pm10: Math.round(avgPm10 * 10) / 10,
      no2: Math.round(avgNo2 * 10) / 10,
      o3: Math.round(avgO3 * 10) / 10,
      so2: Math.round(avgSo2 * 10) / 10,
      co: Math.round(avgCo * 100) / 100,
    };

    const { aqi, dominantPollutant } = calculateCpcbAqi(pollutants);
    const aqiCategory = getAqiCategory(aqi);
    const riskLevel = getAqiRiskLevel(aqi);
    const avgConfidenceScore = avg(horizonForecasts.map((f) => f.confidenceScore));
    const confidenceLevel: ConfidenceLevel = avgConfidenceScore >= 0.7 ? 'High' : avgConfidenceScore < 0.45 ? 'Low' : 'Medium';
    const trendDirections = horizonForecasts.map((f) => f.trendDirection);
    const risingCount = trendDirections.filter((d) => d === 'rising').length;
    const fallingCount = trendDirections.filter((d) => d === 'falling').length;
    const trendDirection: TrendDirection = risingCount > fallingCount ? 'rising' : fallingCount > risingCount ? 'falling' : 'stable';

    const timestamp = new Date(Date.now() + h * 3600 * 1000).toISOString();
    const label = FORECAST_LABELS[hIdx];

    return {
      horizon: h,
      label,
      timestamp,
      pollutants,
      aqi,
      aqiCategory,
      riskLevel,
      dominantPollutant,
      confidence: confidenceLevel,
      confidenceScore: Math.round(avgConfidenceScore * 100) / 100,
      trendDirection,
      source: FORECAST_SOURCE,
    };
  });
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export { FORECAST_HORIZONS, FORECAST_LABELS };
