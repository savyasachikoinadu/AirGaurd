// Alert Engine
// Generates alerts from forecast state and current conditions.

import type {
  ForecastPoint,
  HotspotGrid,
  Alert,
  AlertSeverity,
  LocationDef,
  Threat,
} from '../types';

export function generateAlerts(
  forecast: ForecastPoint[],
  grids: HotspotGrid[],
  threats: Threat[],
  location: LocationDef,
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // 1. AQI deterioration alert
  for (let i = 1; i < forecast.length; i++) {
    const prev = forecast[i - 1];
    const curr = forecast[i];
    if (curr.aqi > prev.aqi + 30) {
      const severity: AlertSeverity = curr.aqi > 300 ? 'CRITICAL' : curr.aqi > 200 ? 'WARNING' : 'WATCH';
      alerts.push({
        id: `alert-aqi-deterioration-${i}`,
        type: 'AQI Deterioration',
        severity,
        timestamp: now,
        location: location.city,
        reason: `AQI predicted to rise from ${prev.aqi} to ${curr.aqi} by ${curr.label}`,
        horizon: curr.horizon,
        recommendedAction: getAqiDeteriorationAction(severity),
      });
    }
  }

  // 2. Hotspot risk alert
  for (const grid of grids) {
    if (grid.horizon === 0) continue;
    if (grid.topHotspot && grid.topHotspot.aqi > 200) {
      const severity: AlertSeverity = grid.topHotspot.aqi > 350 ? 'CRITICAL' : 'WARNING';
      alerts.push({
        id: `alert-hotspot-${grid.horizon}`,
        type: 'High-Risk Hotspot',
        severity,
        timestamp: now,
        location: location.city,
        reason: `Hotspot predicted at AQI ${grid.topHotspot.aqi} by ${grid.label}`,
        horizon: grid.horizon,
        recommendedAction: 'Prioritize inspection of predicted hotspot area. Alert local monitoring teams.',
      });
    }
  }

  // 3. Rapid PM2.5 rise alert
  for (let i = 1; i < forecast.length; i++) {
    const prev = forecast[i - 1];
    const curr = forecast[i];
    const pm25Change = curr.pollutants.pm25 - prev.pollutants.pm25;
    const hoursDiff = curr.horizon - prev.horizon;
    if (pm25Change / hoursDiff > 4) {
      alerts.push({
        id: `alert-pm25-rise-${i}`,
        type: 'Rapid PM2.5 Rise',
        severity: 'WARNING',
        timestamp: now,
        location: location.city,
        reason: `PM2.5 rising at ${(pm25Change / hoursDiff).toFixed(1)} µg/m³ per hour`,
        horizon: curr.horizon,
        recommendedAction: 'Investigate emission sources. Warn sensitive populations about rapidly deteriorating conditions.',
      });
    }
  }

  // 4. Prolonged high-risk period alert
  const elevatedHorizons = forecast.filter((f) => f.aqi > 200);
  if (elevatedHorizons.length >= 3) {
    alerts.push({
      id: 'alert-prolonged-high-risk',
      type: 'Prolonged High-Risk Period',
      severity: elevatedHorizons[0].aqi > 300 ? 'CRITICAL' : 'WARNING',
      timestamp: now,
      location: location.city,
      reason: `AQI above 200 for ${elevatedHorizons.length} consecutive forecast horizons`,
      horizon: elevatedHorizons[elevatedHorizons.length - 1].horizon,
      recommendedAction: 'Activate sustained public health guidance. Consider long-duration exposure mitigation.',
    });
  }

  // 5. Low-confidence forecast alert
  const lowConfCount = forecast.filter((f) => f.confidence === 'Low').length;
  if (lowConfCount >= 2) {
    alerts.push({
      id: 'alert-low-confidence',
      type: 'Low Forecast Confidence',
      severity: 'INFO',
      timestamp: now,
      location: location.city,
      reason: `${lowConfCount} forecast horizon(s) have low model confidence`,
      horizon: 24,
      recommendedAction: 'Treat predictions with caution. Supplement with additional data when available.',
    });
  }

  // 6. Data quality alert (demo mode)
  alerts.push({
    id: 'alert-demo-mode',
    type: 'Data Source Notice',
    severity: 'INFO',
    timestamp: now,
    location: location.city,
    reason: 'System operating in DEMO DATA mode. All values are fictional and deterministic.',
    horizon: 0,
    recommendedAction: 'Connect live data sources for operational use. Do not use demo data for real decision-making.',
  });

  // Sort by severity
  const severityOrder: Record<AlertSeverity, number> = { CRITICAL: 0, WARNING: 1, WATCH: 2, INFO: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

function getAqiDeteriorationAction(severity: AlertSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'Issue public health advisory immediately. Activate emergency response protocols.';
    case 'WARNING':
      return 'Prepare public notifications. Monitor conditions closely. Alert sensitive groups.';
    case 'WATCH':
      return 'Continue monitoring. Inform sensitive populations about potential deterioration.';
    default:
      return 'Continue routine monitoring.';
  }
}
