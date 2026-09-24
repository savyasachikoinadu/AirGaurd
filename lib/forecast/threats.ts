// Future Threat Detection Engine
// Scans forecast state for upcoming pollution threats.
// All threats are derived from actual forecast data, not random generation.

import type {
  ForecastPoint,
  HotspotGrid,
  Threat,
  LocationDef,
  AlertSeverity,
  ConfidenceLevel,
} from '../types';
import { getAqiCategory } from '../aqi/cpcb';

export function detectThreats(
  forecast: ForecastPoint[],
  grids: HotspotGrid[],
  location: LocationDef,
): Threat[] {
  const threats: Threat[] = [];

  // 1. AQI Deterioration: category jump between horizons
  for (let i = 1; i < forecast.length; i++) {
    const prev = forecast[i - 1];
    const curr = forecast[i];
    const prevCat = getAqiCategory(prev.aqi);
    const currCat = getAqiCategory(curr.aqi);
    const categoryOrder = ['Good', 'Satisfactory', 'Moderately Polluted', 'Poor', 'Very Poor', 'Severe'];
    const prevIdx = categoryOrder.indexOf(prevCat);
    const currIdx = categoryOrder.indexOf(currCat);

    if (currIdx > prevIdx) {
      const severity: AlertSeverity = currIdx - prevIdx >= 2 ? 'CRITICAL' : currIdx >= 3 ? 'WARNING' : 'WATCH';
      threats.push({
        id: `threat-aqi-deterioration-${i}`,
        type: 'aqi_deterioration',
        location: location.city,
        geoLocation: location.location,
        expectedTime: curr.timestamp,
        horizon: curr.horizon,
        pollutant: curr.dominantPollutant,
        severity,
        confidence: curr.confidence,
        contributingFactors: [
          `AQI may rise from ${prev.aqi} (${prevCat}) to ${curr.aqi} (${currCat})`,
          `Dominant pollutant: ${curr.dominantPollutant.toUpperCase()}`,
        ],
        recommendedResponse: severity === 'CRITICAL'
          ? 'Issue public health advisory. Consider activating emergency response protocols.'
          : severity === 'WARNING'
            ? 'Prepare public notifications. Monitor conditions closely.'
            : 'Continue monitoring. Inform sensitive groups.',
        predictedValue: curr.aqi,
      });
    }
  }

  // 2. Rapid PM2.5 Increase: rate of change above threshold
  for (let i = 1; i < forecast.length; i++) {
    const prev = forecast[i - 1];
    const curr = forecast[i];
    const pm25Change = curr.pollutants.pm25 - prev.pollutants.pm25;
    const hoursDiff = curr.horizon - prev.horizon;
    const ratePerHour = pm25Change / hoursDiff;

    if (ratePerHour > 3) {
      threats.push({
        id: `threat-rapid-pm25-${i}`,
        type: 'rapid_pm25_increase',
        location: location.city,
        geoLocation: location.location,
        expectedTime: curr.timestamp,
        horizon: curr.horizon,
        pollutant: 'pm25',
        severity: ratePerHour > 6 ? 'WARNING' : 'WATCH',
        confidence: curr.confidence,
        contributingFactors: [
          `PM2.5 increasing at ${ratePerHour.toFixed(1)} µg/m³ per hour`,
          `May reach ${curr.pollutants.pm25} µg/m³ by ${curr.label}`,
        ],
        recommendedResponse: 'Investigate local emission sources. Warn sensitive populations about rapidly deteriorating conditions.',
        predictedValue: curr.pollutants.pm25,
      });
    }
  }

  // 3. Hotspot Formation: grid cells crossing into Poor or worse
  for (const grid of grids) {
    if (grid.horizon === 0) continue; // skip current
    const poorCells = grid.cells.filter((c) => c.aqi > 200);
    if (poorCells.length > 0 && grid.topHotspot) {
      const severity: AlertSeverity = grid.topHotspot.aqi > 350 ? 'CRITICAL' : grid.topHotspot.aqi > 250 ? 'WARNING' : 'WATCH';
      threats.push({
        id: `threat-hotspot-${grid.horizon}`,
        type: 'hotspot_formation',
        location: location.city,
        geoLocation: grid.topHotspot.location,
        expectedTime: new Date(Date.now() + grid.horizon * 3600 * 1000).toISOString(),
        horizon: grid.horizon,
        pollutant: 'multiple',
        severity,
        confidence: grid.topHotspot.confidence,
        contributingFactors: [
          `${poorCells.length} grid cell(s) predicted above AQI 200`,
          `Top hotspot AQI: ${grid.topHotspot.aqi}`,
        ],
        recommendedResponse: 'Prioritize inspection of predicted hotspot areas. Alert local authorities for monitoring.',
        predictedValue: grid.topHotspot.aqi,
      });
    }
  }

  // 4. Prolonged High Risk: multiple consecutive horizons staying elevated
  const elevatedHorizons = forecast.filter((f) => f.aqi > 200);
  if (elevatedHorizons.length >= 3) {
    threats.push({
      id: 'threat-prolonged-high-risk',
      type: 'prolonged_high_risk',
      location: location.city,
      geoLocation: location.location,
      expectedTime: elevatedHorizons[0].timestamp,
      horizon: elevatedHorizons[0].horizon,
      pollutant: 'multiple',
      severity: elevatedHorizons[0].aqi > 300 ? 'CRITICAL' : 'WARNING',
      confidence: elevatedHorizons[elevatedHorizons.length - 1].confidence,
      contributingFactors: [
        `AQI above 200 for ${elevatedHorizons.length} consecutive forecast horizons`,
        `Peak AQI: ${Math.max(...elevatedHorizons.map((f) => f.aqi))}`,
      ],
      recommendedResponse: 'Activate prolonged exposure protocols. Issue sustained public health guidance.',
      predictedValue: Math.max(...elevatedHorizons.map((f) => f.aqi)),
    });
  }

  // 5. Low Confidence Forecast
  const lowConfidenceHorizons = forecast.filter((f) => f.confidence === 'Low');
  if (lowConfidenceHorizons.length > 0) {
    threats.push({
      id: 'threat-low-confidence',
      type: 'low_confidence',
      location: location.city,
      geoLocation: location.location,
      expectedTime: lowConfidenceHorizons[0].timestamp,
      horizon: lowConfidenceHorizons[0].horizon,
      pollutant: 'multiple',
      severity: 'INFO',
      confidence: 'Low',
      contributingFactors: [
        `${lowConfidenceHorizons.length} horizon(s) have low model confidence`,
        'Decision-makers should treat predictions with additional caution',
      ],
      recommendedResponse: 'Supplement with additional data sources when available. Do not rely solely on model output for critical decisions.',
      predictedValue: lowConfidenceHorizons[0].aqi,
    });
  }

  // Sort by severity (CRITICAL first)
  const severityOrder: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, WATCH: 2, INFO: 3 };
  threats.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return threats;
}
