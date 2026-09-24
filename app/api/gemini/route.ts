// Gemini Intelligence API route
// Accepts AirGuard forecast data and returns Gemini's contextual interpretation.
// Falls back gracefully if GEMINI_API_KEY is not configured.
// The API key is only used server-side — never reaches client JavaScript.

import { NextRequest } from 'next/server';
import { fetchGeminiIntelligence, isGeminiConfigured } from '@/lib/gemini/client';
import { identifyForecastDrivers, driversToStrings } from '@/lib/forecast/drivers';
import { calculateConfidenceFactors, confidenceToPercent } from '@/lib/forecast/confidence';
import type {
  ForecastPoint,
  WeatherReadings,
  PollutantReadings,
  GeminiIntelligence,
  UserMode,
} from '@/lib/types';
import { jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

interface GeminiRequestBody {
  city: string;
  mode: 'LIVE' | 'DEMO';
  userMode: UserMode;
  forecast: ForecastPoint[];
  weather: WeatherReadings;
  pollutants: PollutantReadings;
  stationCount: number;
  stationAgreement?: number;
  dataFreshness?: string;
  liveStations?: Array<{ observedAt: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GeminiRequestBody;
    const {
      city, mode, userMode, forecast, weather, pollutants,
      stationCount, stationAgreement = 0.5, dataFreshness = 'unknown',
      liveStations,
    } = body;

    if (!forecast || forecast.length === 0) {
      return errorRes('Forecast data is required', 400);
    }

    // If Gemini is not configured, return fallback deterministic intelligence
    if (!isGeminiConfigured()) {
      return jsonRes({
        intelligence: generateFallbackIntelligence(forecast, city),
        geminiUsed: false,
        source: 'DETERMINISTIC_FALLBACK',
      });
    }

    // Identify forecast drivers from real data
    const drivers = identifyForecastDrivers(forecast, weather, pollutants);
    const driverStrings = driversToStrings(drivers);

    // Calculate confidence factors
    const demoStations = liveStations?.map((ls, i) => ({
      id: `station-${i}`,
      name: `Station ${i + 1}`,
      location: { lat: 0, lng: 0 },
      pollutants,
      weather,
      aqi: forecast[0]?.aqi || 0,
      aqiCategory: forecast[0]?.aqiCategory || 'Good' as const,
      riskLevel: forecast[0]?.riskLevel || 'Low' as const,
      dominantPollutant: forecast[0]?.dominantPollutant || 'pm25' as const,
      trend24h: [],
      source: 'LIVE_SENSOR' as const,
    })) || [];
    const confidence = calculateConfidenceFactors(demoStations, forecast, liveStations?.map((ls, i) => ({
      stationId: `station-${i}`,
      stationName: `Station ${i + 1}`,
      latitude: 0, longitude: 0, city, country: '',
      provider: '', source: 'OPENAQ' as const,
      observedAt: ls.observedAt,
    })));

    const current = forecast[0];
    const next6h = forecast[1];
    const next12h = forecast[2];
    const next24h = forecast[4];

    const intelligence = await fetchGeminiIntelligence({
      city,
      currentAqi: current.aqi,
      currentCategory: current.aqiCategory,
      dominantPollutant: current.dominantPollutant,
      forecastAqi6h: next6h?.aqi || current.aqi,
      forecastAqi12h: next12h?.aqi || current.aqi,
      forecastAqi24h: next24h?.aqi || current.aqi,
      trend: current.trendDirection,
      confidence: current.confidence,
      confidenceScore: confidence.overall,
      weather: {
        temperatureC: weather.temperatureC,
        humidity: weather.humidity,
        windSpeedKph: weather.windSpeedKph,
        windDirectionDeg: weather.windDirectionDeg,
        precipitationMm: weather.precipitationMm,
        cloud: weather.cloud,
      },
      pollutants,
      stationCount,
      stationAgreement,
      dataFreshness,
      forecastDrivers: driverStrings,
      mode,
      userMode,
    });

    if (!intelligence) {
      return jsonRes({
        intelligence: generateFallbackIntelligence(forecast, city),
        geminiUsed: false,
        source: 'DETERMINISTIC_FALLBACK',
        confidence: confidenceToPercent(confidence.overall),
        drivers: driverStrings,
      });
    }

    return jsonRes({
      intelligence,
      geminiUsed: true,
      source: 'GEMINI',
      confidence: confidenceToPercent(confidence.overall),
      drivers: driverStrings,
    });
  } catch (err) {
    return errorRes('Failed to generate intelligence', 500, err);
  }
}

function generateFallbackIntelligence(forecast: ForecastPoint[], city: string): GeminiIntelligence {
  const current = forecast[0];
  const next6h = forecast[1];
  const currentAqi = current?.aqi || 0;
  const nextAqi = next6h?.aqi || currentAqi;
  const change = nextAqi - currentAqi;
  const dominant = current?.dominantPollutant || 'pm25';

  let summary = `AQI in ${city} is ${currentAqi} (${current?.aqiCategory || 'Unknown'}).`;
  if (change > 10) {
    summary += ` Conditions are expected to rise to ${nextAqi} within 6 hours, driven by ${dominant.toUpperCase()} trends.`;
  } else if (change < -10) {
    summary += ` Conditions are expected to improve to ${nextAqi} within 6 hours.`;
  } else {
    summary += ` Conditions are expected to remain stable in the near term.`;
  }

  return {
    summary,
    why: change > 10
      ? [`${dominant.toUpperCase()} trend is increasing`, `Current AQI of ${currentAqi} provides a high baseline`]
      : change < -10
        ? [`${dominant.toUpperCase()} trend is decreasing`, `Conditions are improving`]
        : [`Trend is stable`, `No dominant change factor identified`],
    keyRisks: currentAqi > 200
      ? ['High AQI poses health risks for sensitive groups', 'Prolonged exposure may cause respiratory irritation']
      : currentAqi > 100
        ? ['Moderate AQI may affect sensitive individuals', 'Monitor for changing conditions']
        : ['Current risk is low', 'Monitor forecast for changes'],
    generalRecommendations: currentAqi > 200
      ? ['Avoid prolonged outdoor activity', 'Keep windows closed']
      : ['Normal activities are generally appropriate', 'Monitor forecast for changes'],
    studentRecommendations: currentAqi > 200
      ? ['Prefer indoor activities', 'Follow institutional safety guidance']
      : currentAqi > 100
        ? ['Consider scheduling outdoor sports for lower-AQI periods', 'Pace yourself during outdoor activities']
        : ['Normal outdoor activities are generally fine'],
    respiratoryRecommendations: currentAqi > 200
      ? ['Avoid outdoor exposure — follow your asthma action plan', 'Keep prescribed medication available as directed']
      : currentAqi > 100
        ? ['Reduce prolonged outdoor activity during peaks', 'Keep your asthma action plan available']
        : ['Monitor conditions during extended outdoor activity', 'Keep your clinician\'s advice in mind'],
    governmentRecommendations: currentAqi > 200
      ? ['Issue public health advisory', 'Prioritize hotspot inspection']
      : ['Continue monitoring conditions'],
    industryRecommendations: currentAqi > 200
      ? ['Reduce avoidable emissions during severe episodes', 'Verify emission control systems are operational']
      : ['Maintain emission controls', 'Monitor conditions for potential adjustments'],
    source: 'GEMINI',
    generatedAt: new Date().toISOString(),
  };
}
