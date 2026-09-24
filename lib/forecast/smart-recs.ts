// Smart Recommendations Engine
// Generates stakeholder-specific recommendations tied to real forecast state.
// Includes Student and Respiratory Sensitivity guidance groups.
// All recommendations are deterministic — derived from actual AQI, forecast,
// weather, and confidence data. Gemini may enhance language, but conditions
// are triggered by numbers, not AI.

import type {
  ForecastPoint,
  SmartRecommendationGroup,
  SmartRecommendation,
  StudentGuidance,
  RespiratoryGuidance,
  LocationDef,
  WeatherReadings,
  PollutantReadings,
  UserMode,
} from '../types';
import { getAqiCategory } from '../aqi/cpcb';

function isHigh(aqi: number): boolean { return aqi > 200; }
function isModerate(aqi: number): boolean { return aqi > 100 && aqi <= 200; }
function isSatisfactory(aqi: number): boolean { return aqi > 50 && aqi <= 100; }
function isGood(aqi: number): boolean { return aqi <= 50; }
function isVeryHigh(aqi: number): boolean { return aqi > 300; }

function timeRange(hour: number): string {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

export function generateSmartRecommendations(
  forecast: ForecastPoint[],
  location: LocationDef,
  weather: WeatherReadings,
  pollutants: PollutantReadings,
  userMode: UserMode = 'default',
): SmartRecommendationGroup[] {
  const currentAqi = forecast[0]?.aqi || 0;
  const futureAqi6h = forecast[1]?.aqi || currentAqi;
  const futureAqi24h = forecast[4]?.aqi || currentAqi;
  const category = getAqiCategory(currentAqi);
  const dominant = forecast[0]?.dominantPollutant || 'pm25';
  const isRising = futureAqi6h > currentAqi + 10;
  const isFalling = futureAqi6h < currentAqi - 10;
  const hour = new Date().getHours();
  const period = timeRange(hour);
  const groups: SmartRecommendationGroup[] = [];

  // ─── GENERAL PUBLIC ───
  const generalRecs: SmartRecommendation[] = [];

  if (isVeryHigh(currentAqi)) {
    generalRecs.push({
      title: 'Avoid outdoor exposure',
      description: `AQI is ${currentAqi} (${category}). Minimise all outdoor activity. Keep windows closed and use air purification if available.`,
      priority: 'high',
      context: `AQI ${currentAqi}, ${dominant.toUpperCase()} dominant`,
    });
  } else if (isHigh(currentAqi)) {
    generalRecs.push({
      title: 'Limit prolonged outdoor activity',
      description: `AQI is ${currentAqi} (${category}). Avoid strenuous outdoor exercise. Wear a mask in high-traffic areas if you must go out.`,
      priority: 'high',
      context: `AQI ${currentAqi}`,
    });
  } else if (isModerate(currentAqi)) {
    generalRecs.push({
      title: 'Reduce strenuous outdoor exertion',
      description: `AQI is ${currentAqi} (${category}). Sensitive groups should reduce prolonged outdoor effort. Consider lighter activities.`,
      priority: 'medium',
      context: `AQI ${currentAqi}`,
    });
  } else if (isSatisfactory(currentAqi)) {
    generalRecs.push({
      title: 'Normal outdoor activity with awareness',
      description: `AQI is ${currentAqi} (${category}). Air quality is acceptable. Very sensitive individuals may notice minor effects during prolonged exertion.`,
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  } else {
    generalRecs.push({
      title: 'Normal outdoor activity',
      description: `AQI is ${currentAqi} (${category}). Air quality is good. Safe for all outdoor activities.`,
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  }

  if (isRising) {
    generalRecs.push({
      title: 'Plan outdoor activities earlier',
      description: `AQI is forecast to rise from ${currentAqi} to ${futureAqi6h} within 6 hours. Schedule outdoor activities before conditions deteriorate.`,
      priority: isHigh(futureAqi6h) ? 'high' : 'medium',
      timing: 'Within the next 6 hours',
      context: `Rising: ${currentAqi} → ${futureAqi6h}`,
    });
  } else if (isFalling) {
    generalRecs.push({
      title: 'Conditions improving',
      description: `AQI is forecast to improve from ${currentAqi} to ${futureAqi6h} within 6 hours. Outdoor conditions should become more favourable.`,
      priority: 'low',
      timing: 'Within the next 6 hours',
      context: `Falling: ${currentAqi} → ${futureAqi6h}`,
    });
  }

  // Ventilation guidance
  if (isHigh(currentAqi) || (isRising && isModerate(futureAqi6h))) {
    generalRecs.push({
      title: 'Close windows during peak pollution',
      description: `Keep windows closed during ${period} hours when pollution peaks. Ventilate during early morning or late night when AQI is typically lower.`,
      priority: 'medium',
      timing: period,
      context: `${dominant.toUpperCase()} dominant`,
    });
  } else if (isGood(currentAqi)) {
    generalRecs.push({
      title: 'Good time to ventilate',
      description: `Air quality is good. Open windows to ventilate indoor spaces, especially during ${period}.`,
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  }

  groups.push({
    stakeholder: 'PUBLIC',
    title: 'General Public',
    icon: 'users',
    recommendations: generalRecs,
  });

  // ─── STUDENTS (always generated, shown prominently in student mode) ───
  const studentRecs: SmartRecommendation[] = [];

  const commuteHours = (hour >= 7 && hour <= 10) || (hour >= 15 && hour <= 18);
  const morningCommute = hour >= 7 && hour <= 10;

  if (isVeryHigh(currentAqi)) {
    studentRecs.push({
      title: 'Prefer indoor activities',
      description: `AQI is ${currentAqi}. Follow institutional safety guidance. Consider indoor alternatives for sports and extended outdoor classes.`,
      priority: 'high',
      context: 'Very high AQI',
    });
  } else if (isHigh(currentAqi)) {
    studentRecs.push({
      title: 'Reduce prolonged outdoor physical activity',
      description: `AQI is ${currentAqi}. Consider reducing prolonged outdoor sports and following school/college air-quality guidance.`,
      priority: 'high',
      context: 'High AQI',
    });
  } else if (isModerate(currentAqi)) {
    if (isRising) {
      studentRecs.push({
        title: 'Schedule outdoor sports earlier',
        description: `AQI is ${currentAqi} and rising. Consider scheduling strenuous outdoor sports for periods with lower predicted AQI.`,
        priority: 'medium',
        timing: 'Before conditions worsen',
        context: `Rising: ${currentAqi} → ${futureAqi6h}`,
      });
    } else {
      studentRecs.push({
        title: 'Normal activities with awareness',
        description: `AQI is ${currentAqi}. Normal outdoor activities are generally appropriate. Sensitive students may wish to pace themselves.`,
        priority: 'low',
        context: `AQI ${currentAqi}`,
      });
    }
  } else {
    studentRecs.push({
      title: 'Normal outdoor activities appropriate',
      description: `AQI is ${currentAqi}. Outdoor sports, commute, and campus activities are generally fine.`,
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  }

  if (commuteHours && (isModerate(currentAqi) || isHigh(currentAqi))) {
    studentRecs.push({
      title: `${morningCommute ? 'Morning' : 'Afternoon'} commute awareness`,
      description: `AQI is elevated during your commute (${currentAqi}). Consider routes away from heavy traffic where possible.`,
      priority: 'medium',
      timing: `${morningCommute ? 'Morning' : 'Afternoon'} commute`,
      context: `Commute period, AQI ${currentAqi}`,
    });
  }

  // Best window for outdoor activity
  let bestWindow = 'Early morning (before 7 AM) typically has lower AQI';
  if (isFalling && futureAqi6h < currentAqi) {
    bestWindow = `Conditions are improving — the next 6 hours should be better (forecast: ${futureAqi6h})`;
  } else if (isGood(currentAqi)) {
    bestWindow = 'Current conditions are good for outdoor activity';
  } else if (isRising) {
    bestWindow = 'Earlier is better — schedule outdoor activities before AQI rises further';
  }
  studentRecs.push({
    title: 'Best period for outdoor activity',
    description: bestWindow,
    priority: 'low',
    timing: 'See forecast timeline',
    context: `Based on forecast trend`,
  });

  groups.push({
    stakeholder: 'STUDENTS',
    title: 'Smart Guidance for Students',
    icon: 'graduation',
    recommendations: studentRecs,
  });

  // ─── RESPIRATORY SENSITIVITY ───
  const respRecs: SmartRecommendation[] = [];

  if (isVeryHigh(currentAqi)) {
    respRecs.push({
      title: 'Avoid outdoor exposure',
      description: 'For people with asthma or airway sensitivity, higher pollution may increase the chance of respiratory irritation. Stay indoors where practical.',
      priority: 'high',
      context: `AQI ${currentAqi}`,
    });
  } else if (isHigh(currentAqi)) {
    respRecs.push({
      title: 'Reduce prolonged outdoor activity',
      description: 'Avoid strenuous outdoor activity when pollution is elevated. Follow your personal asthma action plan and your clinician\'s advice.',
      priority: 'high',
      context: `AQI ${currentAqi}`,
    });
  } else if (isModerate(currentAqi)) {
    respRecs.push({
      title: 'Monitor symptoms during outdoor activity',
      description: 'Consider indoor alternatives during forecast pollution peaks. Keep your prescribed medication/action plan available as directed by your clinician.',
      priority: 'medium',
      context: `AQI ${currentAqi}, ${dominant.toUpperCase()} dominant`,
    });
  } else {
    respRecs.push({
      title: 'General risk-reduction awareness',
      description: 'Air quality is currently acceptable. Keep your asthma action plan available and follow your clinician\'s guidance.',
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  }

  if (isRising && (isModerate(futureAqi6h) || isHigh(futureAqi6h))) {
    respRecs.push({
      title: 'Forecast peak approaching',
      description: `AQI is forecast to rise to ${futureAqi6h}. Consider planning indoor activities during the peak period. Follow your personal asthma action plan.`,
      priority: 'high',
      timing: `Peak expected within 6 hours`,
      context: `Rising: ${currentAqi} → ${futureAqi6h}`,
    });
  }

  respRecs.push({
    title: 'Keep medication and action plan available',
    description: 'Ensure your prescribed reliever medication and personal asthma action plan are available as directed by your clinician. This is general risk-reduction information and does not replace medical advice.',
    priority: isHigh(currentAqi) ? 'high' : 'medium',
    context: 'General guidance',
  });

  if (isHigh(currentAqi) || isVeryHigh(currentAqi)) {
    respRecs.push({
      title: 'When to seek medical help',
      description: 'Seek medical care or emergency help for severe or worsening symptoms according to your healthcare guidance. Do not delay if breathing difficulties escalate.',
      priority: 'high',
      context: 'Severe AQI conditions',
    });
  }

  groups.push({
    stakeholder: 'RESPIRATORY',
    title: 'Smart Guidance for People with Asthma or Airway Sensitivity',
    icon: 'lungs',
    recommendations: respRecs,
  });

  // ─── GOVERNMENT ───
  const govRecs: SmartRecommendation[] = [];

  if (isHigh(currentAqi)) {
    govRecs.push({
      title: 'Issue public health advisory',
      description: `AQI at ${currentAqi} warrants a public notification. Issue health advisory through official channels and media.`,
      priority: 'high',
      context: `AQI ${currentAqi}`,
    });
  }

  govRecs.push({
    title: 'Traffic management considerations',
    description: isRising
      ? `Rising pollution trend suggests traffic management measures may help. Consider restrictions in high-emission corridors during peak hours.`
      : `Monitor traffic corridors. Implement traffic management if conditions deteriorate.`,
    priority: isHigh(currentAqi) ? 'high' : 'medium',
    context: isRising ? 'Rising trend detected' : 'Stable conditions',
  });

  govRecs.push({
    title: 'Hotspot inspection priority',
    description: `Prioritize inspection of predicted hotspot areas. Deploy monitoring teams to locations with AQI above 200.`,
    priority: isHigh(currentAqi) ? 'high' : 'medium',
    context: 'See hotspot journey',
  });

  if (forecast.some((f) => f.confidence === 'Low')) {
    govRecs.push({
      title: 'Monitoring enhancement',
      description: 'Some forecast horizons have low confidence. Consider deploying additional temporary monitoring stations to improve data coverage.',
      priority: 'medium',
      context: 'Low confidence detected',
    });
  }

  groups.push({
    stakeholder: 'GOVERNMENT',
    title: 'Government / City Administration',
    icon: 'building',
    recommendations: govRecs,
  });

  // ─── INDUSTRY ───
  const indRecs: SmartRecommendation[] = [];

  if (isHigh(currentAqi)) {
    indRecs.push({
      title: 'Reduce avoidable emissions',
      description: `AQI at ${currentAqi} requires emission reduction. Temporarily reduce high-emission operations and activate emission control systems.`,
      priority: 'high',
      context: `AQI ${currentAqi}`,
    });
  } else {
    indRecs.push({
      title: 'Maintain emission controls',
      description: `AQI at ${currentAqi}. Ensure emission control systems are operational. Prepare for potential reduction if conditions deteriorate.`,
      priority: 'low',
      context: `AQI ${currentAqi}`,
    });
  }

  indRecs.push({
    title: 'Operational awareness',
    description: isRising
      ? `Pollution rising. Schedule high-emission activities outside peak pollution hours. Coordinate with local authorities on mitigation.`
      : `Monitor conditions. Maintain awareness of forecast changes that may require operational adjustments.`,
    priority: isRising ? 'medium' : 'low',
    context: isRising ? 'Rising trend' : 'Stable',
  });

  groups.push({
    stakeholder: 'INDUSTRY',
    title: 'Industry',
    icon: 'factory',
    recommendations: indRecs,
  });

  // Filter groups based on user mode
  if (userMode === 'student') {
    return groups.filter((g) => g.stakeholder === 'STUDENTS' || g.stakeholder === 'PUBLIC');
  }
  if (userMode === 'respiratory') {
    return groups.filter((g) => g.stakeholder === 'RESPIRATORY' || g.stakeholder === 'PUBLIC');
  }

  return groups;
}

// ─── Student Guidance (for the Student Mode panel) ───

export function generateStudentGuidance(
  forecast: ForecastPoint[],
  weather: WeatherReadings,
  location: LocationDef,
): StudentGuidance {
  const currentAqi = forecast[0]?.aqi || 0;
  const futureAqi6h = forecast[1]?.aqi || currentAqi;
  const hour = new Date().getHours();
  const isRising = futureAqi6h > currentAqi + 10;
  const dominant = forecast[0]?.dominantPollutant || 'pm25';

  // Determine best window for outdoor activity
  let bestWindow = 'Early morning (before 7 AM) typically has lower AQI';
  if (futureAqi6h < currentAqi - 10) {
    bestWindow = `Conditions improving — next 6 hours look better (forecast: ${futureAqi6h})`;
  } else if (isRising) {
    bestWindow = 'Earlier is better — schedule outdoor activities before AQI rises further';
  } else if (currentAqi <= 50) {
    bestWindow = 'Current conditions are good for outdoor activity';
  }

  // Commute advice
  const commuteHours = (hour >= 7 && hour <= 10) || (hour >= 15 && hour <= 18);
  let commuteAdvice = 'Normal commute conditions.';
  if (commuteHours && currentAqi > 100) {
    commuteAdvice = `AQI is ${currentAqi} during your commute. Consider routes away from heavy traffic and avoid prolonged exposure at junctions.`;
  } else if (commuteHours && currentAqi > 50) {
    commuteAdvice = `AQI is ${currentAqi}. Generally fine for commute, but consider lighter exertion if walking or cycling.`;
  }

  // Outdoor sports advice
  let outdoorSportsAdvice = 'Normal outdoor sports are generally appropriate.';
  if (currentAqi > 300) {
    outdoorSportsAdvice = 'Prefer indoor activities. Follow institutional safety guidance for outdoor sports.';
  } else if (currentAqi > 200) {
    outdoorSportsAdvice = 'Consider reducing prolonged outdoor physical activity and following school/college air-quality guidance.';
  } else if (currentAqi > 100) {
    outdoorSportsAdvice = isRising
      ? 'Consider scheduling strenuous outdoor sports for periods with lower predicted AQI.'
      : 'Normal activities generally fine. Sensitive students may wish to pace themselves.';
  }

  // Campus exposure note
  const campusExposureNote = `Dominant pollutant is ${dominant.toUpperCase()}. Wind: ${weather.windSpeedKph} km/h. ${
    weather.windSpeedKph < 5 ? 'Low wind may allow pollutants to accumulate near campus.' : 'Wind is helping disperse pollutants.'
  }`;

  // Forecast note
  let forecastNote = `Current AQI ${currentAqi}, forecast ${futureAqi6h} in 6 hours.`;
  if (isRising) {
    forecastNote = `Your campus AQI is forecast to rise from ${currentAqi} to ${futureAqi6h} within 6 hours. Consider scheduling outdoor sports earlier if your institution permits.`;
  } else if (futureAqi6h < currentAqi - 10) {
    forecastNote = `Conditions are improving — AQI forecast to drop from ${currentAqi} to ${futureAqi6h} within 6 hours.`;
  }

  return {
    commuteAdvice,
    outdoorSportsAdvice,
    bestWindowForOutdoor: bestWindow,
    campusExposureNote,
    forecastNote,
    disclaimer: 'This guidance is based on air quality data and does not constitute medical or institutional policy advice.',
  };
}

// ─── Respiratory Guidance (for the Respiratory Sensitivity Mode panel) ───

export function generateRespiratoryGuidance(
  forecast: ForecastPoint[],
  weather: WeatherReadings,
  pollutants: PollutantReadings,
  confidenceScore: number,
): RespiratoryGuidance {
  const currentAqi = forecast[0]?.aqi || 0;
  const dominant = forecast[0]?.dominantPollutant || 'pm25';

  // Find forecast peak
  let peakAqi = currentAqi;
  let peakHorizon = 0;
  let peakLabel = 'Now';
  for (const fp of forecast) {
    if (fp.aqi > peakAqi) {
      peakAqi = fp.aqi;
      peakHorizon = fp.horizon;
      peakLabel = fp.label;
    }
  }

  const currentRisk = currentAqi > 300 ? 'Very High — minimise outdoor exposure'
    : currentAqi > 200 ? 'High — reduce outdoor activity'
    : currentAqi > 100 ? 'Moderate — take precautions during prolonged outdoor activity'
    : currentAqi > 50 ? 'Satisfactory — general risk is low'
    : 'Low — air quality is good';

  const dominantPollutantNote = `${dominant.toUpperCase()} is the dominant pollutant at ${
    dominant === 'co' ? pollutants.co.toFixed(2) + ' mg/m³' : (pollutants as unknown as Record<string, number>)[dominant] + ' µg/m³'
  }. ${dominant === 'pm25' ? 'Fine particulate matter can penetrate deep into airways.' : dominant === 'pm10' ? 'Coarse particulate matter can irritate airways.' : dominant === 'no2' ? 'NO2 can inflame airways and worsen asthma symptoms.' : dominant === 'o3' ? 'Ozone can irritate the respiratory tract.' : 'This pollutant may affect airway sensitivity.'}`;

  const forecastPeak = `Forecast peak AQI: ${peakAqi}`;
  const forecastPeakTime = `Peak expected at ${peakLabel} (${peakHorizon > 0 ? `+${peakHorizon}h` : 'current'})`;

  const tips: string[] = [];
  if (currentAqi > 200) {
    tips.push('Avoid outdoor exposure during peak pollution hours.');
    tips.push('Keep windows closed and use air purification if available.');
  } else if (currentAqi > 100) {
    tips.push('Reduce prolonged outdoor activity when pollution is elevated.');
    tips.push('Consider indoor alternatives during forecast pollution peaks.');
  } else {
    tips.push('Monitor conditions if you plan extended outdoor activity.');
  }
  tips.push('Keep your prescribed medication and personal asthma action plan available as directed by your clinician.');
  tips.push('Follow your personal asthma action plan and your clinician\'s advice.');

  const confidenceNote = confidenceScore >= 0.7
    ? 'Forecast confidence is relatively high.'
    : confidenceScore >= 0.45
      ? 'Forecast confidence is moderate — conditions may differ from predictions.'
      : 'Forecast confidence is low — predictions should be treated with caution.';

  return {
    currentRisk,
    dominantPollutantNote,
    forecastPeak,
    forecastPeakTime,
    exposureReductionTips: tips,
    confidenceNote,
    disclaimer: 'This feature provides general air-quality risk information and does not replace medical advice or an individual asthma action plan. Never change medication doses based on this guidance. Seek medical care for severe or worsening symptoms.',
  };
}
