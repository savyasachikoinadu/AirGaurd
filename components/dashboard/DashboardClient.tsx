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
import { DemoModeBadge } from '@/components/shared/DemoModeBadge';
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
import { Shield, Search, Activity, MapPin, Clock } from 'lucide-react';

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

export function DashboardClient() {
  const [selectedLocation, setSelectedLocation] = useState<LocationDef>(getDefaultLocation());
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

  // Compute all demo data for the selected location
  const computeData = useCallback((location: LocationDef) => {
    setLoading(true);
    const demoStations = generateDemoStations(location);
    const stationDefs = getStationsForLocation(location);
    const fc = forecastForLocation(demoStations, stationDefs);
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

    // Threats
    const thr = detectThreats(fc, jy.grids, location);
    setThreats(thr);

    // Alerts
    const al = generateAlerts(fc, jy.grids, thr, location);
    setAlerts(al);

    // Recommendations
    const recs = generateRecommendations(fc, location);
    setRecommendations(recs);

    // Performance
    const perf = generatePredictionFeedback(fc, location);
    setPerformance(perf);

    setStations(demoStations);
    setForecast(fc);
    setJourney(jy);
    setScenarioResult(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    computeData(selectedLocation);
  }, [selectedLocation, computeData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Current air quality summary
  const currentSummary: AirQualitySummary | null = stations.length > 0
    ? (() => {
        const avgAqi = Math.round(stations.reduce((a, s) => a + s.aqi, 0) / stations.length);
        const avgPm25 = Math.round((stations.reduce((a, s) => a + s.pollutants.pm25, 0) / stations.length) * 10) / 10;
        const avgPm10 = Math.round((stations.reduce((a, s) => a + s.pollutants.pm10, 0) / stations.length) * 10) / 10;
        const avgNo2 = Math.round((stations.reduce((a, s) => a + s.pollutants.no2, 0) / stations.length) * 10) / 10;
        const avgO3 = Math.round((stations.reduce((a, s) => a + s.pollutants.o3, 0) / stations.length) * 10) / 10;
        const avgSo2 = Math.round((stations.reduce((a, s) => a + s.pollutants.so2, 0) / stations.length) * 10) / 10;
        const avgCo = Math.round((stations.reduce((a, s) => a + s.pollutants.co, 0) / stations.length) * 100) / 100;
        const avgTemp = Math.round((stations.reduce((a, s) => a + s.weather.temperatureC, 0) / stations.length) * 10) / 10;
        const avgHum = Math.round(stations.reduce((a, s) => a + s.weather.humidity, 0) / stations.length);
        const avgWind = Math.round((stations.reduce((a, s) => a + s.weather.windSpeedKph, 0) / stations.length) * 10) / 10;
        const avgWindDir = Math.round(stations.reduce((a, s) => a + s.weather.windDirectionDeg, 0) / stations.length);
        const avgPress = Math.round(stations.reduce((a, s) => a + s.weather.pressureMb, 0) / stations.length);
        const avgPrecip = Math.round(stations.reduce((a, s) => a + s.weather.precipitationMm, 0) / stations.length * 10) / 10;
        const avgVis = Math.round((stations.reduce((a, s) => a + s.weather.visibilityKm, 0) / stations.length) * 10) / 10;
        const { dominantPollutant } = calculateCpcbAqi({
          pm25: avgPm25, pm10: avgPm10, no2: avgNo2, o3: avgO3, so2: avgSo2, co: avgCo,
        });
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
          source: 'ASIA_DEMO_DATA',
          timestamp: new Date().toISOString(),
          freshness: 'Generated on request (demo mode)',
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

  const mapLayers: { value: MapLayer; label: string }[] = [
    { value: 'aqi', label: 'AQI' },
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'no2', label: 'NO₂' },
    { value: 'prediction_risk', label: 'Prediction Risk' },
    { value: 'sensor_network', label: 'Sensor Network' },
  ];

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

            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>

            <DemoModeBadge />
          </div>
        </div>

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
        ) : (
          <>
            {/* Summary strip - always visible */}
            <SummaryStrip forecast={forecast} />

            {/* Overview: Map + Current Air Quality */}
            {(activeSection === 'overview' || activeSection === 'map') && (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interactive Map</h3>
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
              <DataQualityPanel profile={profile} demoData={demoDataStatus} />
            )}

            {/* About */}
            {activeSection === 'about' && <AboutPanel />}

            {/* Footer */}
            <footer className="pt-6 pb-4 text-center text-[10px] text-muted-foreground border-t">
              AI AirGuard — Phase 1 Demo | All data is ASIA DEMO DATA | CPCB AQI Standard |
              No external APIs connected | No fabricated accuracy claims
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
