// Gemini AI client — server-side only
// Calls Google's Gemini API to generate contextual interpretation of
// AirGuard's deterministic forecast data. Never invents AQI numbers.

import type {
  GeminiIntelligence,
  ForecastPoint,
  WeatherReadings,
  PollutantReadings,
  AqiCategory,
  ConfidenceLevel,
  TrendDirection,
} from '../types';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function getApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '') return null;
  return key;
}

export function isGeminiConfigured(): boolean {
  return getApiKey() !== null;
}

interface GeminiPromptData {
  city: string;
  currentAqi: number;
  currentCategory: AqiCategory;
  dominantPollutant: string;
  forecastAqi6h: number;
  forecastAqi12h: number;
  forecastAqi24h: number;
  trend: TrendDirection;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  weather: {
    temperatureC: number;
    humidity: number;
    windSpeedKph: number;
    windDirectionDeg: number;
    precipitationMm: number;
    cloud: number;
  };
  pollutants: PollutantReadings;
  stationCount: number;
  stationAgreement: number;
  dataFreshness: string;
  forecastDrivers: string[];
  mode: 'LIVE' | 'DEMO';
  userMode: 'default' | 'student' | 'respiratory';
}

function buildPrompt(data: GeminiPromptData): string {
  const weatherStr = `Temperature: ${data.weather.temperatureC}°C, Humidity: ${data.weather.humidity}%, Wind: ${data.weather.windSpeedKph} km/h from ${data.weather.windDirectionDeg}°, Precipitation: ${data.weather.precipitationMm} mm, Cloud: ${data.weather.cloud}%`;
  const pollutantStr = `PM2.5: ${data.pollutants.pm25} µg/m³, PM10: ${data.pollutants.pm10} µg/m³, NO2: ${data.pollutants.no2} µg/m³, O3: ${data.pollutants.o3} µg/m³, SO2: ${data.pollutants.so2} µg/m³, CO: ${data.pollutants.co} mg/m³`;
  const forecastStr = `Current AQI: ${data.currentAqi} (${data.currentCategory}), +6h: ${data.forecastAqi6h}, +12h: ${data.forecastAqi12h}, +24h: ${data.forecastAqi24h}, Trend: ${data.trend}, Confidence: ${data.confidence} (${Math.round(data.confidenceScore * 100)}%)`;
  const driverStr = data.forecastDrivers.length > 0 ? data.forecastDrivers.join('; ') : 'No specific drivers identified';

  return `You are an air quality analyst for ${data.city}. Interpret the following deterministic forecast data and provide contextual reasoning.

IMPORTANT RULES:
- Do NOT invent or recalculate AQI values. The numbers are provided.
- Only mention factors supported by the supplied data.
- If evidence is insufficient, say "Insufficient live data to determine the dominant cause."
- Keep all text concise (max 2 sentences per item).
- Do not make medical claims, diagnoses, or medication recommendations.
- For respiratory recommendations, use general risk-reduction language only.

DATA:
- City: ${data.city}
- Mode: ${data.mode}
- ${forecastStr}
- Dominant pollutant: ${data.dominantPollutant}
- Weather: ${weatherStr}
- Pollutants: ${pollutantStr}
- Station count: ${data.stationCount}
- Station agreement: ${Math.round(data.stationAgreement * 100)}%
- Data freshness: ${data.dataFreshness}
- Forecast drivers: ${driverStr}
- User mode: ${data.userMode}

Return a JSON object with exactly this structure:
{
  "summary": "1-2 sentence summary of expected AQI change and why",
  "why": ["factor 1", "factor 2", "factor 3"],
  "keyRisks": ["risk 1", "risk 2"],
  "generalRecommendations": ["rec 1", "rec 2"],
  "studentRecommendations": ["rec 1", "rec 2"],
  "respiratoryRecommendations": ["rec 1", "rec 2"],
  "governmentRecommendations": ["rec 1"],
  "industryRecommendations": ["rec 1"]
}

Each array should have 1-3 concise items. Return ONLY valid JSON, no markdown.`;
}

function validateGeminiResponse(parsed: unknown): parsed is GeminiIntelligence {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  return (
    typeof obj.summary === 'string' &&
    Array.isArray(obj.why) &&
    Array.isArray(obj.keyRisks) &&
    Array.isArray(obj.generalRecommendations) &&
    Array.isArray(obj.studentRecommendations) &&
    Array.isArray(obj.respiratoryRecommendations) &&
    Array.isArray(obj.governmentRecommendations) &&
    Array.isArray(obj.industryRecommendations)
  );
}

function sanitizeArray(arr: unknown, maxItems: number = 3): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => (item as string).trim());
}

export async function fetchGeminiIntelligence(data: GeminiPromptData): Promise<GeminiIntelligence | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const prompt = buildPrompt(data);

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          topP: 0.8,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[Gemini] API error: ${response.status}`);
      return null;
    }

    const body = await response.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') return null;

    // Extract JSON from the response (handle potential markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('[Gemini] Failed to parse JSON response');
      return null;
    }

    if (!validateGeminiResponse(parsed)) return null;

    const obj = parsed as unknown as Record<string, unknown>;
    return {
      summary: String(obj.summary).slice(0, 500),
      why: sanitizeArray(obj.why, 4),
      keyRisks: sanitizeArray(obj.keyRisks, 3),
      generalRecommendations: sanitizeArray(obj.generalRecommendations, 4),
      studentRecommendations: sanitizeArray(obj.studentRecommendations, 4),
      respiratoryRecommendations: sanitizeArray(obj.respiratoryRecommendations, 4),
      governmentRecommendations: sanitizeArray(obj.governmentRecommendations, 3),
      industryRecommendations: sanitizeArray(obj.industryRecommendations, 3),
      source: 'GEMINI',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Gemini] fetch failed: ${msg}`);
    return null;
  }
}
