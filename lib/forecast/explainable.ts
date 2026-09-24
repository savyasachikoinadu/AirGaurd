// Explainable AI Engine (deterministic)
// Analyzes forecast inputs to identify contributing factors and generate
// plain-language explanations. Does NOT claim verified causation.

import type {
  ForecastPoint,
  FactorContribution,
  ExplanationResult,
  TrendDirection,
} from '../types';
import type { ForecastInput } from './engine';

function calculateFactorWeights(input: ForecastInput, forecast: ForecastPoint[]): FactorContribution[] {
  const { currentPollutants, currentWeather, trend24h, stationInfluences } = input;
  const factors: FactorContribution[] = [];

  // 1. PM2.5 trend
  const recentTrend = trend24h.slice(-6);
  if (recentTrend.length >= 2) {
    const slope = (recentTrend[recentTrend.length - 1].pm25 - recentTrend[0].pm25) / recentTrend.length;
    const weight = Math.min(1, Math.abs(slope) / 5);
    factors.push({
      factor: 'pm25_trend',
      label: 'Rising PM2.5 trend',
      weight,
      direction: slope > 0.5 ? 'increase' : slope < -0.5 ? 'decrease' : 'neutral',
      description: `PM2.5 ${slope > 0.5 ? 'rising' : slope < -0.5 ? 'declining' : 'stable'} at ${Math.abs(slope).toFixed(1)} µg/m³ per hour`,
    });
  }

  // 2. High baseline pollution
  const baselineWeight = Math.min(1, currentPollutants.pm25 / 100);
  factors.push({
    factor: 'baseline_pollution',
    label: 'High baseline pollution',
    weight: baselineWeight,
    direction: baselineWeight > 0.5 ? 'increase' : 'neutral',
    description: `Current PM2.5 at ${currentPollutants.pm25} µg/m³`,
  });

  // 3. Low wind speed
  const windWeight = Math.max(0, Math.min(1, (12 - currentWeather.windSpeedKph) / 12));
  factors.push({
    factor: 'low_wind',
    label: 'Low wind speed',
    weight: windWeight,
    direction: windWeight > 0.4 ? 'increase' : 'neutral',
    description: `Wind at ${currentWeather.windSpeedKph} km/h ${windWeight > 0.4 ? 'reduces dispersion' : 'allows dispersion'}`,
  });

  // 4. Humidity
  const humidityWeight = Math.max(0, Math.min(0.5, (currentWeather.humidity - 50) / 50));
  factors.push({
    factor: 'humidity',
    label: 'High humidity',
    weight: humidityWeight,
    direction: humidityWeight > 0.25 ? 'increase' : 'neutral',
    description: `Humidity at ${currentWeather.humidity}% ${humidityWeight > 0.25 ? 'may promote secondary particulate formation' : ''}`,
  });

  // 5. Rainfall
  const rainWeight = Math.min(0.6, currentWeather.precipitationMm / 10);
  factors.push({
    factor: 'rainfall',
    label: 'Rainfall washout',
    weight: rainWeight,
    direction: rainWeight > 0.1 ? 'decrease' : 'neutral',
    description: rainWeight > 0.1
      ? `Precipitation at ${currentWeather.precipitationMm} mm may reduce particulate concentration`
      : 'No significant rainfall expected',
  });

  // 6. Wind direction change (simulated)
  factors.push({
    factor: 'wind_direction',
    label: 'Wind direction',
    weight: 0.3,
    direction: 'neutral',
    description: `Wind from ${currentWeather.windDirectionDeg}° may transport pollutants from nearby sources`,
  });

  // 7. Temporal pattern (time-of-day)
  const hour = input.hourOfDay;
  const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 21);
  const temporalWeight = isRushHour ? 0.6 : 0.2;
  factors.push({
    factor: 'temporal_pattern',
    label: 'Time-of-day pattern',
    weight: temporalWeight,
    direction: isRushHour ? 'increase' : 'neutral',
    description: isRushHour ? 'Rush hour period typically associated with higher traffic emissions' : 'Off-peak period with reduced traffic activity',
  });

  // 8. Traffic signal (simulated from station influence)
  const trafficWeight = stationInfluences.traffic * 0.7;
  factors.push({
    factor: 'traffic',
    label: 'Traffic emissions',
    weight: trafficWeight,
    direction: trafficWeight > 0.4 ? 'increase' : 'neutral',
    description: `Simulated traffic influence: ${Math.round(stationInfluences.traffic * 100)}% of local emissions`,
  });

  // 9. Local correction (sensor density)
  const sensorDensity = trend24h.length / 24;
  factors.push({
    factor: 'local_correction',
    label: 'Local sensor correction',
    weight: sensorDensity * 0.3,
    direction: 'neutral',
    description: `Forecast adjusted using ${trend24h.length} hours of local observations`,
  });

  // Sort by weight descending
  return factors.sort((a, b) => b.weight - a.weight);
}

function generateSummary(factors: FactorContribution[], forecast: ForecastPoint[]): string {
  const increasingFactors = factors.filter((f) => f.direction === 'increase' && f.weight > 0.3);
  const decreasingFactors = factors.filter((f) => f.direction === 'decrease' && f.weight > 0.1);

  const nextForecast = forecast[1] || forecast[0];
  const currentAqi = forecast[0]?.aqi || 0;
  const nextAqi = nextForecast.aqi || 0;
  const change = nextAqi - currentAqi;

  let summary = '';

  if (change > 10) {
    summary = `The model indicates AQI may rise from ${currentAqi} to approximately ${nextAqi} within 6 hours. `;
    if (increasingFactors.length > 0) {
      summary += `Likely contributing factors include ${increasingFactors.slice(0, 3).map((f) => f.label.toLowerCase()).join(', ')}. `;
    }
    if (decreasingFactors.length > 0) {
      summary += `${decreasingFactors[0].label} may partially offset this increase. `;
    }
  } else if (change < -10) {
    summary = `The model indicates AQI may decrease from ${currentAqi} to approximately ${nextAqi} within 6 hours. `;
    if (decreasingFactors.length > 0) {
      summary += `Associated factors include ${decreasingFactors.map((f) => f.label.toLowerCase()).join(', ')}. `;
    }
  } else {
    summary = `The model indicates AQI may remain near ${currentAqi} in the near term. `;
    if (increasingFactors.length > 0 && decreasingFactors.length > 0) {
      summary += `Contributing factors in both directions appear to partially balance. `;
    }
  }

  return summary.trim();
}

function generateUncertaintyStatement(forecast: ForecastPoint[]): string {
  const avgConfidence = forecast.reduce((a, f) => a + f.confidenceScore, 0) / forecast.length;
  if (avgConfidence >= 0.7) {
    return 'Model confidence is relatively high given current data coverage and trend stability. However, this is a heuristic baseline, not a calibrated probability.';
  } else if (avgConfidence >= 0.45) {
    return 'Model confidence is moderate. Forecast uncertainty increases with horizon length. This is a heuristic estimate, not a calibrated probability.';
  } else {
    return 'Model confidence is low due to limited data coverage or high trend volatility. Predictions beyond 12 hours should be treated with caution.';
  }
}

export function explainForecast(input: ForecastInput, forecast: ForecastPoint[]): ExplanationResult {
  const factors = calculateFactorWeights(input, forecast);
  const summary = generateSummary(factors, forecast);
  const uncertaintyStatement = generateUncertaintyStatement(forecast);

  const dominantTrend: TrendDirection = forecast[1]
    ? forecast[1].aqi > forecast[0].aqi + 5
      ? 'rising'
      : forecast[1].aqi < forecast[0].aqi - 5
        ? 'falling'
        : 'stable'
    : 'stable';

  return {
    summary,
    factors,
    uncertaintyStatement,
    dominantTrend,
  };
}
