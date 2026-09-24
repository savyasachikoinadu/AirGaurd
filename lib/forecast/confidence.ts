// Forecast confidence engine — calculates confidence from measurable factors
// rather than heuristics. Factors: observation completeness, station count,
// data freshness, station agreement, weather availability, trend consistency.

import type {
  ConfidenceFactors,
  DemoStation,
  ForecastPoint,
  LiveStationReading,
} from '../types';

export function calculateConfidenceFactors(
  stations: DemoStation[],
  forecast: ForecastPoint[],
  liveStations?: LiveStationReading[],
): ConfidenceFactors {
  // 1. Observation completeness: fraction of stations that have non-zero AQI
  const stationsWithReadings = stations.filter((s) => s.aqi > 0);
  const observationCompleteness = stations.length > 0
    ? stationsWithReadings.length / stations.length
    : 0;

  // 2. Station count: more stations = better spatial coverage
  const rawCount = liveStations?.length ?? stations.length;
  const stationCount = rawCount;
  // Full confidence at 5+ stations, half at 2, zero at 0
  const stationScore = Math.min(1, rawCount / 5);

  // 3. Data freshness: how recent is the newest observation?
  let freshnessScore = 0.3; // default for demo mode
  if (liveStations && liveStations.length > 0) {
    const newest = liveStations
      .map((s) => new Date(s.observedAt).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => b - a)[0];
    if (newest) {
      const ageMin = (Date.now() - newest) / 60000;
      if (ageMin < 60) freshnessScore = 1.0;
      else if (ageMin < 180) freshnessScore = 0.7;
      else if (ageMin < 360) freshnessScore = 0.4;
      else freshnessScore = 0.2;
    }
  }

  // 4. Station agreement: how much do station AQI values agree?
  let stationAgreement = 0.5; // default moderate
  if (stationsWithReadings.length >= 2) {
    const aqis = stationsWithReadings.map((s) => s.aqi);
    const mean = aqis.reduce((a, b) => a + b, 0) / aqis.length;
    const stdDev = Math.sqrt(aqis.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / aqis.length);
    const cv = stdDev / Math.max(1, mean);
    // Lower CV = better agreement. CV < 0.15 is excellent, > 0.5 is poor
    stationAgreement = Math.max(0, Math.min(1, 1 - cv / 0.5));
  }

  // 5. Weather availability: do we have real weather data?
  const hasWeather = stations.some((s) =>
    s.weather.temperatureC !== 25 || s.weather.humidity !== 50
  );
  const weatherAvailability = hasWeather ? 1.0 : 0.4;

  // 6. Trend consistency: how stable are the forecast confidence scores?
  const fcScores = forecast.map((f) => f.confidenceScore);
  const avgFcScore = fcScores.length > 0
    ? fcScores.reduce((a, b) => a + b, 0) / fcScores.length
    : 0.4;
  const trendConsistency = avgFcScore;

  // Overall confidence: weighted combination
  const overall = Math.round(
    (observationCompleteness * 0.2 +
    stationScore * 0.15 +
    freshnessScore * 0.2 +
    stationAgreement * 0.15 +
    weatherAvailability * 0.1 +
    trendConsistency * 0.2) * 100
  ) / 100;

  return {
    observationCompleteness: Math.round(observationCompleteness * 100) / 100,
    stationCount,
    dataFreshness: Math.round(freshnessScore * 100) / 100,
    stationAgreement: Math.round(stationAgreement * 100) / 100,
    weatherAvailability: Math.round(weatherAvailability * 100) / 100,
    trendConsistency: Math.round(trendConsistency * 100) / 100,
    overall: Math.max(0.1, Math.min(1, overall)),
  };
}

export function confidenceToLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 0.7) return 'High';
  if (score >= 0.45) return 'Medium';
  return 'Low';
}

export function confidenceToPercent(score: number): number {
  return Math.round(score * 100);
}
