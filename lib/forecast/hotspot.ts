// Spatial Hotspot Engine
// Uses inverse distance weighting (IDW) interpolation from demo sensor locations
// combined with forecast trends to estimate a pollution risk surface across a grid.
// Interpolated values are AI ESTIMATES, not measured sensor data.

import type {
  GridCell,
  HotspotGrid,
  HotspotJourney,
  GeoPoint,
  DemoStation,
  ForecastPoint,
  AqiCategory,
  RiskLevel,
  ConfidenceLevel,
  LocationDef,
} from '../types';
import { calculateCpcbAqi, getAqiCategory, getAqiRiskLevel } from '../aqi/cpcb';
import { forecastAirQuality, buildForecastInputFromStation, FORECAST_HORIZONS, FORECAST_LABELS } from './engine';
import type { DemoStationDef } from '../demo/locations';
import { SeededRandom, hashStringToSeed } from '../demo/seeded-random';

const GRID_SIZE = 7;
const GRID_SPACING = 0.04; // degrees (~4.4km)

function haversineKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function idwInterpolate(
  target: GeoPoint,
  stations: { location: GeoPoint; value: number }[],
  power: number = 2,
): number {
  let weightedSum = 0;
  let weightSum = 0;

  for (const s of stations) {
    const dist = haversineKm(target, s.location);
    if (dist < 0.1) return s.value; // essentially at the sensor
    const weight = 1 / Math.pow(dist, power);
    weightedSum += weight * s.value;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

function getConfidenceForCell(
  distToSensor: number,
  horizon: number,
): { level: ConfidenceLevel; score: number } {
  const distScore = Math.max(0.2, 1 - distToSensor / 15);
  const horizonPenalty = Math.max(0, (horizon / 24) * 0.35);
  const score = Math.max(0.15, Math.min(0.9, distScore - horizonPenalty));
  let level: ConfidenceLevel = 'Medium';
  if (score >= 0.65) level = 'High';
  else if (score < 0.4) level = 'Low';
  return { level, score: Math.round(score * 100) / 100 };
}

function getJourneyNarrative(
  grids: HotspotGrid[],
): { horizon: number; label: string; status: string; description: string; aqi: number; category: AqiCategory }[] {
  return grids.map((grid, idx) => {
    const aqi = Math.round(grid.averageAqi);
    const category = getAqiCategory(aqi);
    const topAqi = grid.topHotspot?.aqi ?? aqi;

    let status: string;
    let description: string;

    if (idx === 0) {
      status = category === 'Good' || category === 'Satisfactory' ? 'Stable' : 'Current Risk';
      description = `Current average AQI ${aqi}${grid.topHotspot ? `, hotspot near ${grid.topHotspot.id}` : ''}`;
    } else {
      const prevAqi = Math.round(grids[idx - 1].averageAqi);
      const change = aqi - prevAqi;
      if (change > 20) {
        status = 'Rising Risk';
        description = `Pollution accumulation expected. AQI may increase by ${change} points.`;
      } else if (change > 5) {
        status = 'Gradually Rising';
        description = `Slight increase expected. AQI may rise by ${change} points.`;
      } else if (change < -20) {
        status = 'Improving';
        description = `Conditions expected to improve. AQI may drop by ${Math.abs(change)} points.`;
      } else if (change < -5) {
        status = 'Stabilizing';
        description = `Gradual improvement expected. AQI may fall by ${Math.abs(change)} points.`;
      } else {
        status = 'Stable';
        description = `Conditions expected to remain similar. AQI change within ${Math.abs(change)} points.`;
      }
    }

    return {
      horizon: grid.horizon,
      label: grid.label,
      status,
      description,
      aqi,
      category,
    };
  });
}

export function forecastGrid(
  stations: DemoStation[],
  stationDefs: DemoStationDef[],
  location: LocationDef,
  horizon: number,
): HotspotGrid {
  const center = location.location;
  const halfGrid = Math.floor(GRID_SIZE / 2);
  const cells: GridCell[] = [];

  // Get forecasted pollutant values for each station at this horizon
  const stationForecasts = stations.map((s, i) => {
    const def = stationDefs[i];
    const input = buildForecastInputFromStation(s, def);
    const forecast = forecastAirQuality(input);
    const horizonForecast = forecast.find((f) => f.horizon === horizon) || forecast[0];
    return {
      station: s,
      def,
      forecast: horizonForecast,
    };
  });

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellLocation: GeoPoint = {
        lat: center.lat + (row - halfGrid) * GRID_SPACING,
        lng: center.lng + (col - halfGrid) * GRID_SPACING,
      };

      // Find nearest station
      let minDist = Infinity;
      let nearestStationIdx = 0;
      stationForecasts.forEach((sf, idx) => {
        const d = haversineKm(cellLocation, sf.station.location);
        if (d < minDist) {
          minDist = d;
          nearestStationIdx = idx;
        }
      });

      // IDW interpolation for each pollutant
      const pm25Stations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.pm25,
      }));
      const pm10Stations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.pm10,
      }));
      const no2Stations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.no2,
      }));
      const o3Stations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.o3,
      }));
      const so2Stations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.so2,
      }));
      const coStations = stationForecasts.map((sf) => ({
        location: sf.station.location,
        value: sf.forecast.pollutants.co,
      }));

      const pm25 = idwInterpolate(cellLocation, pm25Stations);
      const pm10 = idwInterpolate(cellLocation, pm10Stations);
      const no2 = idwInterpolate(cellLocation, no2Stations);
      const o3 = idwInterpolate(cellLocation, o3Stations);
      const so2 = idwInterpolate(cellLocation, so2Stations);
      const co = idwInterpolate(cellLocation, coStations);

      const pollutants = {
        pm25: Math.round(pm25 * 10) / 10,
        pm10: Math.round(pm10 * 10) / 10,
        no2: Math.round(no2 * 10) / 10,
        o3: Math.round(o3 * 10) / 10,
        so2: Math.round(so2 * 10) / 10,
        co: Math.round(co * 100) / 100,
      };

      const { aqi } = calculateCpcbAqi(pollutants);
      const aqiCategory = getAqiCategory(aqi);
      const riskLevel = getAqiRiskLevel(aqi);
      const { level: confidence } = getConfidenceForCell(minDist, horizon);

      // Determine data type
      const dataType: GridCell['dataType'] = minDist < 0.5 ? 'MEASURED' : minDist < 3 ? 'MODEL_FORECAST' : 'AI_ESTIMATE';

      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        location: cellLocation,
        pm25: pollutants.pm25,
        pm10: pollutants.pm10,
        aqi,
        aqiCategory,
        riskLevel,
        confidence,
        dataType,
        distanceToNearestSensor: Math.round(minDist * 10) / 10,
      });
    }
  }

  // Find top hotspot (highest AQI cell that is not a sensor)
  const nonSensorCells = cells.filter((c) => c.dataType !== 'MEASURED');
  const sortedByAqi = [...nonSensorCells].sort((a, b) => b.aqi - a.aqi);
  const topHotspot = sortedByAqi[0] || null;

  // Count hotspots (cells with AQI > 200)
  const hotspotCount = cells.filter((c) => c.aqi > 200).length;

  // Estimate affected area (cells with AQI > 150)
  const affectedCells = cells.filter((c) => c.aqi > 150).length;
  const cellAreaKm2 = Math.pow(GRID_SPACING * 111, 2); // approx km² per cell
  const affectedAreaKm2 = Math.round(affectedCells * cellAreaKm2 * 10) / 10;

  const averageAqi = Math.round(cells.reduce((a, c) => a + c.aqi, 0) / cells.length);

  const label = FORECAST_LABELS[FORECAST_HORIZONS.indexOf(horizon)] || `+${horizon}H`;

  return {
    horizon,
    label,
    cells,
    topHotspot,
    hotspotCount,
    affectedAreaKm2,
    averageAqi,
  };
}

export function buildHotspotJourney(
  stations: DemoStation[],
  stationDefs: DemoStationDef[],
  location: LocationDef,
): HotspotJourney {
  const grids = FORECAST_HORIZONS.map((h) => forecastGrid(stations, stationDefs, location, h));
  const narrative = getJourneyNarrative(grids);

  return { grids, narrative };
}
