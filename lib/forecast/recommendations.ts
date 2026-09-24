// Recommendations Engine
// Generates stakeholder-specific recommendations tied to forecast state.

import type {
  ForecastPoint,
  Recommendation,
  Stakeholder,
  AqiCategory,
  LocationDef,
} from '../types';
import { getAqiCategory } from '../aqi/cpcb';

export function generateRecommendations(
  forecast: ForecastPoint[],
  location: LocationDef,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const currentAqi = forecast[0]?.aqi || 0;
  const futureAqi = forecast[1]?.aqi || currentAqi;
  const category = getAqiCategory(currentAqi);
  const futureCategory = getAqiCategory(futureAqi);
  const dominantPollutant = forecast[0]?.dominantPollutant || 'pm25';
  const isRising = futureAqi > currentAqi + 10;
  const isHigh = currentAqi > 200;

  // PUBLIC recommendations
  if (isHigh) {
    recs.push({
      id: 'pub-1',
      stakeholder: 'PUBLIC',
      title: 'Limit outdoor exposure',
      description: `Current AQI is ${currentAqi} (${category}). Avoid prolonged outdoor activity, especially for children, elderly, and those with respiratory conditions.`,
      priority: 'high',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}, dominant pollutant ${dominantPollutant.toUpperCase()}`,
    });
  } else if (currentAqi > 100) {
    recs.push({
      id: 'pub-1',
      stakeholder: 'PUBLIC',
      title: 'Reduce strenuous outdoor activity',
      description: `AQI is ${currentAqi} (${category}). Sensitive groups should reduce prolonged outdoor exertion. Consider wearing masks in high-traffic areas.`,
      priority: 'medium',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}`,
    });
  } else {
    recs.push({
      id: 'pub-1',
      stakeholder: 'PUBLIC',
      title: 'Normal outdoor activity',
      description: `AQI is ${currentAqi} (${category}). Air quality is acceptable for outdoor activities for all groups.`,
      priority: 'low',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}`,
    });
  }

  if (isRising) {
    recs.push({
      id: 'pub-2',
      stakeholder: 'PUBLIC',
      title: 'Plan activities for earlier in the day',
      description: `Pollution is expected to rise from ${currentAqi} to ${futureAqi} within 6 hours. Schedule outdoor activities before conditions deteriorate.`,
      priority: isHigh ? 'high' : 'medium',
      relatedAqiCategory: futureCategory,
      context: `Rising trend: ${currentAqi} → ${futureAqi}`,
    });
  }

  recs.push({
    id: 'pub-3',
    stakeholder: 'PUBLIC',
    title: 'Hotspot awareness',
    description: `Avoid areas near predicted hotspots. Check the interactive map for real-time risk zones in ${location.city}.`,
    priority: isHigh ? 'high' : 'low',
    relatedAqiCategory: category,
    context: 'See map for hotspot locations',
  });

  // GOVERNMENT recommendations
  if (isHigh) {
    recs.push({
      id: 'gov-1',
      stakeholder: 'GOVERNMENT',
      title: 'Issue public health advisory',
      description: `AQI at ${currentAqi} warrants a public notification. Issue health advisory through official channels and media.`,
      priority: 'high',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}`,
    });
  }

  recs.push({
    id: 'gov-2',
    stakeholder: 'GOVERNMENT',
    title: 'Traffic management considerations',
    description: isRising
      ? `Rising pollution trend suggests traffic management measures may help. Consider traffic restrictions in high-emission corridors during peak hours.`
      : `Monitor traffic corridors. Implement traffic management if conditions deteriorate.`,
    priority: isHigh ? 'high' : 'medium',
    relatedAqiCategory: category,
    context: isRising ? 'Rising trend detected' : 'Stable conditions',
  });

  recs.push({
    id: 'gov-3',
    stakeholder: 'GOVERNMENT',
    title: 'Hotspot inspection priority',
    description: `Prioritize inspection of predicted hotspot areas. Deploy monitoring teams to locations with AQI above 200.`,
    priority: isHigh ? 'high' : 'medium',
    relatedAqiCategory: category,
    context: 'See hotspot journey for locations',
  });

  if (forecast.some((f) => f.confidence === 'Low')) {
    recs.push({
      id: 'gov-4',
      stakeholder: 'GOVERNMENT',
      title: 'Monitoring enhancement',
      description: 'Some forecast horizons have low confidence. Consider deploying additional temporary monitoring stations to improve data coverage.',
      priority: 'medium',
      relatedAqiCategory: category,
      context: 'Low confidence detected in forecast',
    });
  }

  // INDUSTRY recommendations
  if (isHigh) {
    recs.push({
      id: 'ind-1',
      stakeholder: 'INDUSTRY',
      title: 'Reduce emissions immediately',
      description: `AQI at ${currentAqi} requires emission reduction. Temporarily reduce production intensity and activate emission control systems.`,
      priority: 'high',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}`,
    });
  } else {
    recs.push({
      id: 'ind-1',
      stakeholder: 'INDUSTRY',
      title: 'Maintain emission controls',
      description: `AQI at ${currentAqi}. Ensure emission control systems are operational. Prepare for potential reduction if conditions deteriorate.`,
      priority: 'low',
      relatedAqiCategory: category,
      context: `AQI ${currentAqi}`,
    });
  }

  recs.push({
    id: 'ind-2',
    stakeholder: 'INDUSTRY',
    title: 'Operational awareness',
    description: isRising
      ? `Pollution rising. Schedule high-emission activities outside peak pollution hours. Coordinate with local authorities on mitigation measures.`
      : `Monitor conditions. Maintain awareness of forecast changes that may require operational adjustments.`,
    priority: isRising ? 'medium' : 'low',
    relatedAqiCategory: category,
    context: isRising ? 'Rising trend' : 'Stable conditions',
  });

  recs.push({
    id: 'ind-3',
    stakeholder: 'INDUSTRY',
    title: 'Monitoring and inspection',
    description: 'Ensure continuous emission monitoring systems are calibrated and reporting. Prepare for potential regulatory inspection during high-risk periods.',
    priority: isHigh ? 'high' : 'medium',
    relatedAqiCategory: category,
    context: isHigh ? 'High-risk period' : 'Routine monitoring',
  });

  return recs;
}
