'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  DemoStation,
  ForecastPoint,
  HotspotJourney as HotspotJourneyType,
  ExplanationResult,
  Threat,
  Alert,
  Recommendation,
  PredictionPerformance as PredictionPerformanceType,
  ScenarioResult,
  ScenarioInput,
  LocationDef,
  AirQualitySummary,
  MapLayer,
  DatasetProfile,
  DemoDataStatus,
  LiveStationReading,
  LiveWeatherData,
  LiveForecastData,
  DataMode,
  DataQualityLive,
  PollutantReadings,
  WeatherReadings,
  TrendData,
  DataSource,
} from '@/lib/types';
import { ASIA_LOCATIONS, getDefaultLocation, getStationsForLocation } from '@/lib/demo/locations';
import { generateDemoStations } from '@/lib/demo/generator';
import { forecastForLocation, buildForecastInputFromStation, forecastAirQuality } from '@/lib/forecast/engine';
import { buildHotspotJourney } from '@/lib/forecast/hotspot';
import { explainForecast } from '@/lib/forecast/explainable';
import { detectThreats } from '@/lib/forecast/threats';
import { generateAlerts } from '@/lib/forecast/alerts';
import { generateRecommendations } from '@/lib/forecast/recommendations';
import { generatePredictionFeedback } from '@/lib/forecast/feedback';
import { runScenario } from '@/lib/forecast/scenario';
import { getDatasetProfile } from '@/lib/data/historical';
import { calculateCpcbAqi, getAqiCategory, getAqiRiskLevel } from '@/lib/aqi/cpcb';
import { SummaryStrip } from '@/components/dashboard/SummaryStrip';
import { CurrentAirQuality } from '@/components/dashboard/CurrentAirQuality';
import { AirQualityMap } from '@/components/dashboard/AirQualityMap';
import { ForecastTimeline } from '@/components/dashboard/ForecastTimeline';
import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { HotspotJourney as HotspotJourneyComponent } from '@/components/dashboard/HotspotJourney';
import { ExplainableAI } from '@/components/dashboard/ExplainableAI';
import { FutureThreats } from '@/components/dashboard/FutureThreats';
import { WhatIfSimulation } from '@/components/dashboard/WhatIfSimulation';
import { Recommendations } from '@/components/dashboard/Recommendations';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { PredictionPerformance as PredictionPerformanceComponent } from '@/components/dashboard/PredictionPerformance';
import { DataQualityPanel } from '@/components/dashboard/DataQualityPanel';
import { AboutPanel } from '@/components/dashboard/AboutPanel';
import { ModeBadge } from '@/components/shared/ModeBadge';
import { Shield, Search, Activity, MapPin, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

type SectionId = 'overview' | 'map' | 'forecast' | 'journey' | 'explanation' | 'threats' | 'simulation' | 'recommendations' | 'alerts' | 'performance' | 'data-quality' | 'about';

const SECTIONS: { id: SectionId; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'map', label: 'Live Map', icon: MapPin },
  { id: 'forecast', label: 'Forecast', icon: Activity },
  { id: 'journey', label: 'Hotspot Journey', icon: Activity },
  { id: 'explanation', label: 'Why?', icon: Activity },
  { id: 'threats', label: 'Future Threats', icon: Activity },
  { id: 'simulation', label: 'What-If', icon: Activity },
  { id: 'recommendations', label: 'Actions', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Activity },
  { id: 'performance', label: 'Prediction Eval', icon: Activity },
  { id: 'data-quality', label: 'Data Quality', icon: Activity },
  { id: 'about', label: 'About', icon: Activity },
];

// Convert live station readings into DemoStation format for the existing engines
function liveStationsToDemoStations(
  liveStations: LiveStationReading[],
  liveWeather: LiveWeatherData | null,
  location: LocationDef,
): DemoStation[] {
  return liveStations.map((ls) => {
    const pollutants: PollutantReadings = {
      pm25: ls.pm25 ?? 0,
      pm10: ls.pm10 ?? 0,
      no2: ls.no2 ?? 0,
      o3: ls.o3 ?? 0,
      so2: ls.so2 ?? 0,
      co: ls.co ?? 0,
    };

    const weather: WeatherReadings = liveWeather
      ? {
          temperatureC: liveWeather.temperatureC,
          humidity: liveWeather.humidity,
          windSpeedKph: liveWeather.windSpeedKph,
          windDirectionDeg: liveWeather.windDirectionDeg,
          pressureMb: liveWeather.pressureMb,
          precipitationMm: liveWeather.precipitationMm,
          cloud: liveWeather.cloud,
          visibilityKm: liveWeather.visibilityKm,
        }
      : {
          temperatureC: 25, humidity: 50, windSpeedKph: 5, windDirectionDeg: 180,
          pressureMb: 1013, precipitationMm: 0, cloud: 30, visibilityKm: 10,
        };

    const { aqi, dominantPollutant } = ls.aqi !== undefined
      ? { aqi: ls.aqi, dominantPollutant: calculateCpcbAqi(pollutants).dominantPollutant }
      : { aqi: 0, dominantPollutant: 'pm25' as const };

    const aqiCategory = getAqiCategory(aqi);
    const riskLevel = getAqiRiskLevel(aqi);

    // Build a minimal trend from current values (engines need at least 2 points)
    const trend24h: TrendData[] = [];
    const now = Date.now();
    for (let h = 24; h >= 0; h--) {
      trend24h.push({
        timestamp: new Date(now - h * 3600 * 1000).toISOString(),
        pm25: pollutants.pm25,
        pm10: pollutants.pm10,
        aqi,
      });
    }

    const source: DataSource = ls.source === 'OPENAQ' ? 'OPENAQ' : ls.source === 'OPEN_METEO' ? 'OPEN_METEO' : 'LIVE_SENSOR';

    return {
      id: ls.stationId,
      name: ls.stationName,
      location: { lat: ls.latitude, lng: ls.longitude },
      pollutants,
      weather,
      aqi,
      aqiCategory,
      riskLevel,
      dominantPollutant,
      trend24h,
      source,
    };
  });
}

// Convert Open-Meteo forecast data into ForecastPoint[] for the existing engines
function liveForecastToForecastPoints(forecast: LiveForecastData): ForecastPoint[] {
  const horizons = [0, 6, 12, 18, 24];
  const labels = ['NOW', '+6H', '+12H', '+18H', '+24H'];

  return horizons.map((h, idx) => {
    const i = Math.min(h, forecast.timestamps.length - 1);
    if (i < 0) {
      return {
        horizon: h, label: labels[idx], timestamp: new Date().toISOString(),
        pollutants: { pm25: 0, pm10: 0, no2: 0, o3: 0, so2: 0, co: 0 },
        aqi: 0, aqiCategory: 'Good' as const, riskLevel: 'Low' as const,
        dominantPollutant: 'pm25' as const, confidence: 'Low' as const,
        confidenceScore: 0.3, trendDirection: 'stable' as const,
        source: 'EXTERNAL_FORECAST' as DataSource,
      };
    }

    const pollutants: PollutantReadings = {
      pm25: forecast.pm25[i] ?? 0,
      pm10: forecast.pm10[i] ?? 0,
      no2: forecast.no2[i] ?? 0,
      o3: forecast.o3[i] ?? 0,
      so2: forecast.so2[i] ?? 0,
      co: forecast.co[i] ?? 0,
    };

    const { aqi, dominantPollutant } = calculateCpcbAqi(pollutants);
    const aqiCategory = getAqiCategory(aqi);
    const riskLevel = getAqiRiskLevel(aqi);

    return {
      horizon: h,
      label: labels[idx],
      timestamp: forecast.timestamps[i],
      pollutants,
      aqi,
      aqiCategory,
      riskLevel,
      dominantPollutant,
      confidence: 'Medium' as const,
      confidenceScore: 0.6,
      trendDirection: 'stable' as const,
      source: 'EXTERNAL_FORECAST' as DataSource,
    };
  });
}

interface LiveDataResponse {
  stations: LiveStationReading[];
  weather: LiveWeatherData | null;
  forecast: LiveForecastData | null;
  mode: DataMode;
  providerStatus: { openaq: string; openmeteo: string };
  lastUpdated: string;
  errors: string[];
}

export function DashboardClient() {
  const [selectedLocation, setSelectedLocation] = useState<LocationDef>(getDefaultLocation());
  const [mode, setMode] = useState<DataMode>('LIVE');
  const [stations, setStations] = useState<DemoStation[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [journey, setJourney] = useState<HotspotJourneyType | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [performance, setPerformance] = useState<PredictionPerformanceType | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayer>('aqi');
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState<LiveDataResponse | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // Compute all data for the selected location
  const computeData = useCallback(async (location: LocationDef, currentMode: DataMode) => {
    setLoading(true);
    setLiveError(null);

    if (currentMode === 'LIVE') {
      try {
        const res = await fetch(`/api/live/air-quality?location=${location.id}&mode=LIVE`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = (await res.json()) as LiveDataResponse;
        setLiveData(data);
        setLastUpdated(data.lastUpdated);

        if (data.stations.length === 0) {
          // No live stations — clear everything, show error state
          setStations([]);
          setForecast([]);
          setJourney(null);
          setExplanation(null);
          setThreats([]);
          setAlerts([]);
          setRecommendations([]);
          setPerformance(null);
          setLiveError(data.errors.length > 0 ? data.errors.join('; ') : 'No live monitoring stations available from this provider');
          setLoading(false);
          return;
        }

        // Convert live data to demo station format for existing engines
        const demoStations = liveStationsToDemoStations(data.stations, data.weather, location);
        const stationDefs = getStationsForLocation(location);

        // Build forecast: use Open-Meteo forecast if available, else use our engine
        let fc: ForecastPoint[];
        if (data.forecast && data.forecast.timestamps.length > 0) {
          fc = liveForecastToForecastPoints(data.forecast);
        } else {
          fc = forecastForLocation(demoStations, stationDefs);
        }

        // Hotspot journey from real station coords
        const jy = buildHotspotJourney(demoStations, stationDefs, location);

        // Explanation from first station
        const firstStation = demoStations[0];
        const firstDef = stationDefs[0];
        if (firstStation) {
          const input = buildForecastInputFromStation(firstStation, firstDef);
          const fcStation = forecastAirQuality(input);
          const exp = explainForecast(input, fcStation);
          setExplanation(exp);
        }

        const thr = detectThreats(fc, jy.grids, location);
        setThreats(thr);

        const al = generateAlerts(fc, jy.grids, thr, location, 'LIVE');
        setAlerts(al);

        const recs = generateRecommendations(fc, location);
        setRecommendations(recs);

        const perf = generatePredictionFeedback(fc, location);
        setPerformance(perf);

        setStations(demoStations);
        setForecast(fc);
        setJourney(jy);
        setScenarioResult(null);
        setLoading(false);
      } catch (err) {
        setLiveError(err instanceof Error ? err.message : 'Failed to fetch live data');
        setStations([]);
        setForecast([]);
        setJourney(null);
        setLoading(false);
      }
    } else {
      // DEMO mode — use existing deterministic data
      const demoStations = generateDemoStations(location);
      const stationDefs = getStationsForLocation(location);
      const fc = forecastForLocation(demoStations, stationDefs);
      const jy = buildHotspotJourney(demoStations, stationDefs, location);

      const firstStation = demoStations[0];
      const firstDef = stationDefs[0];
      if (firstStation) {
        const input = buildForecastInputFromStation(firstStation, firstDef);
        const fcStation = forecastAirQuality(input);
        const exp = explainForecast(input, fcStation);
        setExplanation(exp);
      }

      const thr = detectThreats(fc, jy.grids, location);
      setThreats(thr);

      const al = generateAlerts(fc, jy.grids, thr, location, 'DEMO');
      setAlerts(al);

      const recs = generateRecommendations(fc, location);
      setRecommendations(recs);

      const perf = generatePredictionFeedback(fc, location);
      setPerformance(perf);

      setStations(demoStations);
      setForecast(fc);
      setJourney(jy);
      setScenarioResult(null);
      setLiveData(null);
      setLastUpdated(new Date().toISOString());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    computeData(selectedLocation, mode);
  }, [selectedLocation, mode, computeData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Current air quality summary
  const currentSummary: AirQualitySummary | null = stations.length > 0
    ? (() => {
        // Only average over stations that have actual AQI (have measurements)
        const stationsWithAqi = stations.filter((s) => s.aqi !== undefined && s.aqi > 0);
        const stationsForAvg = stationsWithAqi.length > 0 ? stationsWithAqi : stations;
        const n = stationsForAvg.length;
        const avgAqi = Math.round(stationsForAvg.reduce((a, s) => a + (s.aqi || 0), 0) / n);
        // Average pollutants only from stations that have them defined
        const avgIfAny = (key: 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co') => {
          const vals = stationsForAvg.map((s) => s.pollutants[key]).filter((v) => v !== undefined && v !== null) as number[];
          if (vals.length === 0) return 0;
          return Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10;
        };
        const avgPm25 = avgIfAny('pm25');
        const avgPm10 = avgIfAny('pm10');
        const avgNo2 = avgIfAny('no2');
        const avgO3 = avgIfAny('o3');
        const avgSo2 = avgIfAny('so2');
        const avgCo = Math.round(avgIfAny('co') * 10) / 10;
        const avgTemp = Math.round((stationsForAvg.reduce((a, s) => a + s.weather.temperatureC, 0) / n) * 10) / 10;
        const avgHum = Math.round(stationsForAvg.reduce((a, s) => a + s.weather.humidity, 0) / n);
        const avgWind = Math.round((stationsForAvg.reduce((a, s) => a + s.weather.windSpeedKph, 0) / n) * 10) / 10;
        const avgWindDir = Math.round(stationsForAvg.reduce((a, s) => a + s.weather.windDirectionDeg, 0) / n);
        const avgPress = Math.round(stationsForAvg.reduce((a, s) => a + s.weather.pressureMb, 0) / n);
        const avgPrecip = Math.round(stationsForAvg.reduce((a, s) => a + s.weather.precipitationMm, 0) / n * 10) / 10;
        const avgVis = Math.round((stationsForAvg.reduce((a, s) => a + s.weather.visibilityKm, 0) / n) * 10) / 10;
        const { dominantPollutant } = calculateCpcbAqi({
          pm25: avgPm25, pm10: avgPm10, no2: avgNo2, o3: avgO3, so2: avgSo2, co: avgCo,
        });
        // Determine the actual data source: only label as OPENAQ when real
        // OpenAQ station observations exist; use OPEN_METEO when the fallback
        // modelled reading is being shown.
        const hasOpenAQMeasurements = stations.some(
          (s) => s.source === 'OPENAQ' && s.aqi > 0
        );
        const source: DataSource = mode === 'LIVE'
          ? (hasOpenAQMeasurements ? 'OPENAQ' : 'OPEN_METEO')
          : 'ASIA_DEMO_DATA';
        const freshness = mode === 'LIVE'
          ? (hasOpenAQMeasurements
            ? (liveData?.stations.find((s) => s.source === 'OPENAQ' && s.observedAt)?.observedAt
              ? `Observed ${new Date(liveData.stations.find((s) => s.source === 'OPENAQ')!.observedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
              : 'Live observation')
            : 'MODELLED · Open-Meteo (no live station data)')
          : 'Generated on request (demo mode)';
        return {
          aqi: avgAqi,
          category: getAqiCategory(avgAqi),
          aqiCategory: getAqiCategory(avgAqi),
          riskLevel: getAqiRiskLevel(avgAqi),
          dominantPollutant,
          pollutants: { pm25: avgPm25, pm10: avgPm10, no2: avgNo2, o3: avgO3, so2: avgSo2, co: avgCo },
          weather: {
            temperatureC: avgTemp, humidity: avgHum, windSpeedKph: avgWind, windDirectionDeg: avgWindDir,
            pressureMb: avgPress, precipitationMm: avgPrecip, cloud: 40, visibilityKm: avgVis,
          },
          source,
          timestamp: liveData?.lastUpdated || new Date().toISOString(),
          freshness,
        };
      })()
    : null;

  const handleRunScenario = async (input: ScenarioInput): Promise<ScenarioResult | null> => {
    const result = runScenario(forecast, input);
    setScenarioResult(result);
    return result;
  };

  // Data quality info
  const profile = getDatasetProfile();
  const demoDataStatus: DemoDataStatus = {
    locations: ASIA_LOCATIONS.length,
    stations: ASIA_LOCATIONS.reduce((a, l) => a + l.stationCount, 0),
    pollutants: ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO'],
    weatherVariables: ['Temperature', 'Humidity', 'Wind Speed', 'Wind Direction', 'Pressure', 'Precipitation', 'Cloud', 'Visibility'],
    generatedRecords: ASIA_LOCATIONS.reduce((a, l) => a + l.stationCount, 0) * 25,
    dataFreshness: new Date().toISOString(),
    source: 'ASIA_DEMO_DATA',
    historicalCsvConnected: false,
  };

  const liveDataQuality: DataQualityLive | null = liveData ? {
    mode: liveData.mode,
    liveStations: liveData.stations.length,
    stationsQueried: liveData.stations.length,
    stationsWithPm25: liveData.stations.filter((s) => s.pm25 !== undefined).length,
    stationsWithPm10: liveData.stations.filter((s) => s.pm10 !== undefined).length,
    newestObservation: liveData.stations
      .map((s) => s.observedAt)
      .sort()
      .pop() || null,
    oldestObservation: liveData.stations
      .map((s) => s.observedAt)
      .sort()[0] || null,
    missingPollutants: ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO'].filter((p) => {
      const key = p.toLowerCase().replace('.', '').replace('2', '2') as keyof LiveStationReading;
      return !liveData.stations.some((s) => s[key as 'pm25'] !== undefined);
    }),
    openaqStatus: liveData.providerStatus.openaq,
    openmeteoStatus: liveData.providerStatus.openmeteo,
    staleObservations: liveData.stations.filter((s) => {
      const ageMin = (Date.now() - new Date(s.observedAt).getTime()) / 60000;
      return ageMin > 180;
    }).length,
    forecastSource: liveData.forecast?.source || 'unavailable',
  } : null;

  const mapLayers: { value: MapLayer; label: string }[] = [
    { value: 'aqi', label: 'AQI' },
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'no2', label: 'NO₂' },
    { value: 'prediction_risk', label: 'Prediction Risk' },
    { value: 'sensor_network', label: 'Sensor Network' },
  ];

  const isLive = mode === 'LIVE';
  const openaqOk = liveData?.providerStatus.openaq === 'ok';
  const openmeteoOk = liveData?.providerStatus.openmeteo === 'ok';

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-base font-bold tracking-tight">AI AirGuard</span>
            </div>
            <span className="hidden md:inline text-xs text-muted-foreground">Air Quality Prediction & Early Warning</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Location selector */}
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const loc = ASIA_LOCATIONS.find((l) => l.id === e.target.value);
                if (loc) setSelectedLocation(loc);
              }}
              className="text-xs rounded-lg border bg-card px-2.5 py-1.5 max-w-[180px] focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ASIA_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.city}, {loc.country}
                </option>
              ))}
            </select>

            {/* LIVE / DEMO toggle */}
            <button
              onClick={() => setMode((m) => m === 'LIVE' ? 'DEMO' : 'LIVE')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ring-1 transition-colors ${
                isLive
                  ? 'bg-green-100 text-green-800 ring-green-300 hover:bg-green-200'
                  : 'bg-amber-100 text-amber-800 ring-amber-300 hover:bg-amber-200'
              }`}
            >
              {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isLive ? 'LIVE' : 'DEMO'}
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Live data source indicators */}
        {isLive && (
          <div className="flex items-center gap-3 px-4 pb-1.5 text-[10px]">
            <span className="text-muted-foreground">Data sources:</span>
            <span className={`flex items-center gap-1 font-medium ${openaqOk ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${openaqOk ? 'bg-green-500' : 'bg-red-400'}`} />
              OpenAQ {openaqOk ? 'connected' : (liveData?.providerStatus.openaq || 'connecting...')}
            </span>
            <span className={`flex items-center gap-1 font-medium ${openmeteoOk ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${openmeteoOk ? 'bg-green-500' : 'bg-red-400'}`} />
              Open-Meteo {openmeteoOk ? 'connected' : (liveData?.providerStatus.openmeteo || 'connecting...')}
            </span>
            <span className="text-muted-foreground ml-auto flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              Last updated: {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Section navigation */}
        <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <section.icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-7xl mx-auto space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton-shimmer h-20 rounded-xl" />
            <div className="skeleton-shimmer h-96 rounded-xl" />
            <div className="skeleton-shimmer h-64 rounded-xl" />
          </div>
        ) : liveError && stations.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
                <WifiOff className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold">No live monitoring stations available</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {liveError}. This may be because the data provider is unavailable, the API key is not configured, or no stations exist near this location.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setMode('DEMO')}
                  className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-200"
                >
                  Switch to DEMO mode
                </button>
                <button
                  onClick={() => computeData(selectedLocation, mode)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Retry live data
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary strip - always visible */}
            <SummaryStrip forecast={forecast} />

            {/* Overview: Map + Current Air Quality */}
            {(activeSection === 'overview' || activeSection === 'map') && (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {isLive ? 'Live Monitoring Map' : 'Interactive Map'}
                    </h3>
                    <div className="flex items-center gap-1">
                      {mapLayers.map((ml) => (
                        <button
                          key={ml.value}
                          onClick={() => setMapLayer(ml.value)}
                          className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                            mapLayer === ml.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {ml.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[450px] rounded-lg overflow-hidden border">
                    <AirQualityMap
                      location={selectedLocation}
                      stations={stations}
                      gridCells={journey?.grids[0]?.cells}
                      layer={mapLayer}
                      liveMode={isLive}
                      className="h-full w-full"
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                    <span className="font-medium">CPCB AQI:</span>
                    {[
                      { label: 'Good (0-50)', color: '#16a34a' },
                      { label: 'Satisfactory (51-100)', color: '#84cc16' },
                      { label: 'Moderate (101-200)', color: '#eab308' },
                      { label: 'Poor (201-300)', color: '#f97316' },
                      { label: 'Very Poor (301-400)', color: '#dc2626' },
                      { label: 'Severe (401+)', color: '#991b1b' },
                    ].map((item) => (
                      <span key={item.label} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <CurrentAirQuality summary={currentSummary} forecast={forecast} />
                </div>
              </div>
            )}

            {/* Forecast */}
            {(activeSection === 'overview' || activeSection === 'forecast') && (
              <>
                <ForecastTimeline forecast={forecast} />
                <ForecastChart forecast={forecast} />
              </>
            )}

            {/* Hotspot Journey */}
            {(activeSection === 'overview' || activeSection === 'journey') && journey && (
              <HotspotJourneyComponent journey={journey} stations={stations} location={selectedLocation} />
            )}

            {/* Explanation */}
            {(activeSection === 'overview' || activeSection === 'explanation') && (
              <ExplainableAI explanation={explanation} />
            )}

            {/* Threats */}
            {(activeSection === 'overview' || activeSection === 'threats') && (
              <FutureThreats threats={threats} />
            )}

            {/* Simulation */}
            {(activeSection === 'overview' || activeSection === 'simulation') && (
              <WhatIfSimulation
                forecast={forecast}
                onRunSimulation={handleRunScenario}
                result={scenarioResult}
              />
            )}

            {/* Recommendations */}
            {(activeSection === 'overview' || activeSection === 'recommendations') && (
              <Recommendations recommendations={recommendations} />
            )}

            {/* Alerts */}
            {(activeSection === 'overview' || activeSection === 'alerts') && (
              <AlertsPanel alerts={alerts} />
            )}

            {/* Performance */}
            {(activeSection === 'overview' || activeSection === 'performance') && (
              <PredictionPerformanceComponent performance={performance} />
            )}

            {/* Data Quality */}
            {(activeSection === 'overview' || activeSection === 'data-quality') && (
              <DataQualityPanel
                profile={profile}
                demoData={demoDataStatus}
                liveDataQuality={isLive ? liveDataQuality : null}
              />
            )}

            {/* About */}
            {activeSection === 'about' && <AboutPanel />}

            {/* Footer */}
            <footer className="pt-6 pb-4 text-center text-[10px] text-muted-foreground border-t">
              AI AirGuard — {isLive ? 'LIVE MODE' : 'Phase 1 Demo'} |
              {isLive ? ' Data: OpenAQ + Open-Meteo' : ' All data is ASIA DEMO DATA'} |
              CPCB AQI Standard |
              {isLive ? ' Real monitoring data' : ' No external APIs connected | No fabricated accuracy claims'}
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
