// Core type system for AI AirGuard
// All modules consume these types - provider-specific formats are normalized to these.

export type DataSource =
  | 'ASIA_DEMO_DATA'
  | 'MODEL_FORECAST'
  | 'AI_ESTIMATE'
  | 'HISTORICAL_DATASET'
  | 'EXTERNAL_FORECAST'
  | 'LIVE_SENSOR'
  | 'OPENAQ'
  | 'OPEN_METEO';

export type DataMode = 'LIVE' | 'DEMO';

export type FreshnessLabel = 'LIVE' | 'RECENT' | 'STALE';

export interface LiveStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  provider: string;
  source: 'OPENAQ' | 'OPEN_METEO' | 'DEMO';
  observedAt: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  nh3?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  aqi?: number;
  aqiCategory?: AqiCategory;
}

export interface LiveWeatherData {
  temperatureC: number;
  humidity: number;
  windSpeedKph: number;
  windDirectionDeg: number;
  pressureMb: number;
  precipitationMm: number;
  cloud: number;
  visibilityKm: number;
  observedAt: string;
  source: 'OPEN_METEO' | 'DEMO';
}

export interface LiveForecastData {
  timestamps: string[];
  pm25: number[];
  pm10: number[];
  no2: number[];
  o3: number[];
  so2: number[];
  co: number[];
  aqi: number[];
  aqiCategory: AqiCategory[];
  source: 'OPEN_METEO' | 'MODEL_FORECAST';
  updatedAt: string;
}

export interface LiveDataBundle {
  stations: LiveStationReading[];
  weather: LiveWeatherData | null;
  forecast: LiveForecastData | null;
  location: LocationDef;
  mode: DataMode;
  providerStatus: {
    openaq: 'ok' | 'error' | 'no_key' | 'no_stations' | 'unreachable';
    openmeteo: 'ok' | 'error' | 'unreachable';
  };
  lastUpdated: string;
  errors: string[];
}

export interface DataQualityLive {
  mode: DataMode;
  liveStations: number;
  stationsQueried: number;
  stationsWithPm25: number;
  stationsWithPm10: number;
  newestObservation: string | null;
  oldestObservation: string | null;
  missingPollutants: string[];
  openaqStatus: string;
  openmeteoStatus: string;
  staleObservations: number;
  forecastSource: string;
}

export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderately Polluted'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Severe';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export type AlertSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';

export type TrendDirection = 'rising' | 'falling' | 'stable';

export type Stakeholder = 'PUBLIC' | 'GOVERNMENT' | 'INDUSTRY';

export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co';

export type MapLayer = 'aqi' | 'pm25' | 'pm10' | 'no2' | 'prediction_risk' | 'sensor_network';

export interface PollutantReadings {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
}

export interface WeatherReadings {
  temperatureC: number;
  humidity: number;
  windSpeedKph: number;
  windDirectionDeg: number;
  pressureMb: number;
  precipitationMm: number;
  cloud: number;
  visibilityKm: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DemoStation {
  id: string;
  name: string;
  location: GeoPoint;
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  aqi: number;
  aqiCategory: AqiCategory;
  riskLevel: RiskLevel;
  dominantPollutant: PollutantKey;
  trend24h: TrendData[];
  source: DataSource;
}

export interface TrendData {
  timestamp: string;
  pm25: number;
  pm10: number;
  aqi: number;
}

export interface ForecastPoint {
  horizon: number; // hours ahead: 0, 6, 12, 18, 24
  label: string; // "NOW", "+6H", etc.
  timestamp: string;
  pollutants: PollutantReadings;
  aqi: number;
  aqiCategory: AqiCategory;
  riskLevel: RiskLevel;
  dominantPollutant: PollutantKey;
  confidence: ConfidenceLevel;
  confidenceScore: number; // 0-1 heuristic
  trendDirection: TrendDirection;
  source: DataSource;
}

export interface GridCell {
  id: string;
  row: number;
  col: number;
  location: GeoPoint;
  pm25: number;
  pm10: number;
  aqi: number;
  aqiCategory: AqiCategory;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  dataType: 'MEASURED' | 'MODEL_FORECAST' | 'AI_ESTIMATE';
  distanceToNearestSensor: number;
}

export interface HotspotGrid {
  horizon: number;
  label: string;
  cells: GridCell[];
  topHotspot: GridCell | null;
  hotspotCount: number;
  affectedAreaKm2: number;
  averageAqi: number;
}

export interface HotspotJourney {
  grids: HotspotGrid[];
  narrative: JourneyStep[];
}

export interface JourneyStep {
  horizon: number;
  label: string;
  status: string;
  description: string;
  aqi: number;
  category: AqiCategory;
}

export interface FactorContribution {
  factor: string;
  label: string;
  weight: number; // relative influence 0-1
  direction: 'increase' | 'decrease' | 'neutral';
  description: string;
}

export interface ExplanationResult {
  summary: string;
  factors: FactorContribution[];
  uncertaintyStatement: string;
  dominantTrend: TrendDirection;
}

export interface Threat {
  id: string;
  type: 'aqi_deterioration' | 'rapid_pm25_increase' | 'hotspot_formation' | 'prolonged_high_risk' | 'low_confidence' | 'insufficient_data';
  location: string;
  geoLocation: GeoPoint;
  expectedTime: string;
  horizon: number;
  pollutant: PollutantKey | 'multiple';
  severity: AlertSeverity;
  confidence: ConfidenceLevel;
  contributingFactors: string[];
  recommendedResponse: string;
  predictedValue: number;
}

export interface ScenarioInput {
  trafficReduction: number; // 0-100
  industrialReduction: number; // 0-100
  openBurningReduction: number; // 0-100
  temporaryTrafficRestriction: boolean;
  industrialMitigation: boolean;
  burningControl: boolean;
}

export interface ScenarioResult {
  baseline: ForecastPoint[];
  scenario: ForecastPoint[];
  improvementAqi: number;
  improvementPct: number;
  hotspotIntensityReduction: number;
  hotspotAreaReduction: number;
  scenarioConfidence: ConfidenceLevel;
  assumptions: string[];
  source: DataSource;
}

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  timestamp: string;
  location: string;
  reason: string;
  horizon: number;
  recommendedAction: string;
}

export interface Recommendation {
  id: string;
  stakeholder: Stakeholder;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedAqiCategory: AqiCategory;
  context: string;
}

export interface PredictionFeedback {
  id: string;
  location: string;
  predictedTime: string;
  actualTime: string;
  predictedAqi: number;
  actualAqi: number;
  predictedPm25: number;
  actualPm25: number;
  error: number;
  pm25Error: number;
  directionCorrect: boolean;
  confidence: ConfidenceLevel;
}

export interface PredictionPerformance {
  pairs: PredictionFeedback[];
  mae: number;
  rmse: number;
  directionalAccuracy: number;
  count: number;
  label: string;
}

export interface LocationDef {
  id: string;
  country: string;
  city: string;
  location: GeoPoint;
  timezone: string;
  isDefault: boolean;
  stationCount: number;
}

export interface DatasetProfile {
  connected: boolean;
  rowCount: number;
  columnCount: number;
  countries: number;
  locations: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  pollutantCoverage: string[];
  weatherCoverage: string[];
  missingDataRate: number;
  source: string;
  lastChecked: string;
}

export interface DemoDataStatus {
  locations: number;
  stations: number;
  pollutants: string[];
  weatherVariables: string[];
  generatedRecords: number;
  dataFreshness: string;
  source: DataSource;
  historicalCsvConnected: boolean;
}

export interface HistoricalWeatherAirQualityRecord {
  id: string;
  country: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timestamp: string;
  temperatureC: number;
  humidity: number;
  windSpeedKph: number;
  windDirectionDeg: number;
  pressureMb: number;
  precipitationMm: number;
  cloud: number;
  visibilityKm: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  o3: number;
  source: DataSource;
  dataQuality: 'good' | 'fair' | 'poor';
}

export interface AirQualitySummary {
  aqi: number;
  category: AqiCategory;
  riskLevel: RiskLevel;
  dominantPollutant: PollutantKey;
  pollutants: PollutantReadings;
  weather: WeatherReadings;
  source: DataSource;
  timestamp: string;
  freshness: string;
}
