// CPCB (Central Pollution Control Board) National Air Quality Index
// Based on India's National AQI standard with 8 pollutants and 6 categories.
// Reference: https://www.cpcb.nic.in/

import type {
  PollutantReadings,
  AqiCategory,
  RiskLevel,
  PollutantKey,
} from '../types';

interface SubIndexBreakpoint {
  pollutant: PollutantKey;
  concentrationRange: [number, number];
  aqiRange: [number, number];
}

// CPCB sub-index breakpoints for each pollutant
// PM2.5 (24-hr avg, µg/m³), PM10 (24-hr avg, µg/m³),
// NO2 (24-hr avg, µg/m³), O3 (8-hr avg, µg/m³),
// SO2 (24-hr avg, µg/m³), CO (8-hr avg, mg/m³)
const BREAKPOINTS: SubIndexBreakpoint[] = [
  // Good (0-50)
  { pollutant: 'pm25', concentrationRange: [0, 30], aqiRange: [0, 50] },
  { pollutant: 'pm10', concentrationRange: [0, 50], aqiRange: [0, 50] },
  { pollutant: 'no2', concentrationRange: [0, 40], aqiRange: [0, 50] },
  { pollutant: 'o3', concentrationRange: [0, 50], aqiRange: [0, 50] },
  { pollutant: 'so2', concentrationRange: [0, 40], aqiRange: [0, 50] },
  { pollutant: 'co', concentrationRange: [0, 1.0], aqiRange: [0, 50] },
  // Satisfactory (51-100)
  { pollutant: 'pm25', concentrationRange: [31, 60], aqiRange: [51, 100] },
  { pollutant: 'pm10', concentrationRange: [51, 100], aqiRange: [51, 100] },
  { pollutant: 'no2', concentrationRange: [41, 80], aqiRange: [51, 100] },
  { pollutant: 'o3', concentrationRange: [51, 100], aqiRange: [51, 100] },
  { pollutant: 'so2', concentrationRange: [41, 80], aqiRange: [51, 100] },
  { pollutant: 'co', concentrationRange: [1.1, 2.0], aqiRange: [51, 100] },
  // Moderately Polluted (101-200)
  { pollutant: 'pm25', concentrationRange: [61, 90], aqiRange: [101, 200] },
  { pollutant: 'pm10', concentrationRange: [101, 250], aqiRange: [101, 200] },
  { pollutant: 'no2', concentrationRange: [81, 180], aqiRange: [101, 200] },
  { pollutant: 'o3', concentrationRange: [101, 168], aqiRange: [101, 200] },
  { pollutant: 'so2', concentrationRange: [81, 380], aqiRange: [101, 200] },
  { pollutant: 'co', concentrationRange: [2.1, 10], aqiRange: [101, 200] },
  // Poor (201-300)
  { pollutant: 'pm25', concentrationRange: [91, 120], aqiRange: [201, 300] },
  { pollutant: 'pm10', concentrationRange: [251, 350], aqiRange: [201, 300] },
  { pollutant: 'no2', concentrationRange: [181, 280], aqiRange: [201, 300] },
  { pollutant: 'o3', concentrationRange: [169, 208], aqiRange: [201, 300] },
  { pollutant: 'so2', concentrationRange: [381, 800], aqiRange: [201, 300] },
  { pollutant: 'co', concentrationRange: [10.1, 17], aqiRange: [201, 300] },
  // Very Poor (301-400)
  { pollutant: 'pm25', concentrationRange: [121, 250], aqiRange: [301, 400] },
  { pollutant: 'pm10', concentrationRange: [351, 430], aqiRange: [301, 400] },
  { pollutant: 'no2', concentrationRange: [281, 400], aqiRange: [301, 400] },
  { pollutant: 'o3', concentrationRange: [209, 748], aqiRange: [301, 400] },
  { pollutant: 'so2', concentrationRange: [801, 1600], aqiRange: [301, 400] },
  { pollutant: 'co', concentrationRange: [17.1, 34], aqiRange: [301, 400] },
  // Severe (401-500)
  { pollutant: 'pm25', concentrationRange: [251, 500], aqiRange: [401, 500] },
  { pollutant: 'pm10', concentrationRange: [431, 600], aqiRange: [401, 500] },
  { pollutant: 'no2', concentrationRange: [401, 600], aqiRange: [401, 500] },
  { pollutant: 'o3', concentrationRange: [749, 1000], aqiRange: [401, 500] },
  { pollutant: 'so2', concentrationRange: [1601, 2600], aqiRange: [401, 500] },
  { pollutant: 'co', concentrationRange: [34.1, 50], aqiRange: [401, 500] },
];

const CATEGORY_INFO: Record<AqiCategory, {
  range: [number, number];
  color: string;
  bgColor: string;
  textColor: string;
  healthMessage: string;
  riskLevel: RiskLevel;
}> = {
  'Good': {
    range: [0, 50],
    color: '#16a34a',
    bgColor: '#dcfce7',
    textColor: '#15803d',
    healthMessage: 'Air quality is good and poses minimal health risk. Safe for outdoor activities.',
    riskLevel: 'Low',
  },
  'Satisfactory': {
    range: [51, 100],
    color: '#84cc16',
    bgColor: '#ecfccb',
    textColor: '#65a30d',
    healthMessage: 'Air quality is satisfactory. Sensitive groups should monitor prolonged exertion.',
    riskLevel: 'Low',
  },
  'Moderately Polluted': {
    range: [101, 200],
    color: '#eab308',
    bgColor: '#fef9c3',
    textColor: '#a16207',
    healthMessage: 'May cause breathing discomfort to people with lung disease and children.',
    riskLevel: 'Moderate',
  },
  'Poor': {
    range: [201, 300],
    color: '#f97316',
    bgColor: '#ffedd5',
    textColor: '#c2410c',
    healthMessage: 'Breathing discomfort to most people on prolonged exposure.',
    riskLevel: 'High',
  },
  'Very Poor': {
    range: [301, 400],
    color: '#dc2626',
    bgColor: '#fee2e2',
    textColor: '#b91c1c',
    healthMessage: 'Respiratory illness on prolonged exposure. Sensitive groups should avoid outdoor activity.',
    riskLevel: 'Very High',
  },
  'Severe': {
    range: [401, 500],
    color: '#991b1b',
    bgColor: '#7f1d1d',
    textColor: '#fef2f2',
    healthMessage: 'Serious health impact even on healthy people. Avoid all outdoor exposure.',
    riskLevel: 'Severe',
  },
};

function calculateSubIndex(pollutant: PollutantKey, concentration: number): number {
  if (concentration < 0 || !isFinite(concentration)) return -1;

  for (const bp of BREAKPOINTS) {
    if (bp.pollutant === pollutant) {
      if (concentration >= bp.concentrationRange[0] && concentration <= bp.concentrationRange[1]) {
        const [cLow, cHigh] = bp.concentrationRange;
        const [aLow, aHigh] = bp.aqiRange;
        return Math.round(((concentration - cLow) / (cHigh - cLow)) * (aHigh - aLow) + aLow);
      }
    }
  }
  // Above highest breakpoint → cap at 500
  return 500;
}

export function calculateCpcbAqi(pollutants: PollutantReadings): {
  aqi: number;
  subIndices: Record<PollutantKey, number>;
  dominantPollutant: PollutantKey;
} {
  const subIndices: Record<PollutantKey, number> = {
    pm25: calculateSubIndex('pm25', pollutants.pm25),
    pm10: calculateSubIndex('pm10', pollutants.pm10),
    no2: calculateSubIndex('no2', pollutants.no2),
    o3: calculateSubIndex('o3', pollutants.o3),
    so2: calculateSubIndex('so2', pollutants.so2),
    co: calculateSubIndex('co', pollutants.co),
  };

  let maxSubIndex = 0;
  let dominantPollutant: PollutantKey = 'pm25';

  (Object.keys(subIndices) as PollutantKey[]).forEach((key) => {
    if (subIndices[key] > maxSubIndex) {
      maxSubIndex = subIndices[key];
      dominantPollutant = key;
    }
  });

  return { aqi: maxSubIndex, subIndices, dominantPollutant };
}

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderately Polluted';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getAqiRiskLevel(aqi: number): RiskLevel {
  const category = getAqiCategory(aqi);
  return CATEGORY_INFO[category].riskLevel;
}

export function getCategoryInfo(category: AqiCategory) {
  return CATEGORY_INFO[category];
}

export function getAqiColor(aqi: number): string {
  return CATEGORY_INFO[getAqiCategory(aqi)].color;
}

export function getAqiHealthMessage(aqi: number): string {
  return CATEGORY_INFO[getAqiCategory(aqi)].healthMessage;
}

export function getPollutantLabel(key: PollutantKey): string {
  const labels: Record<PollutantKey, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    no2: 'NO₂',
    o3: 'O₃',
    so2: 'SO₂',
    co: 'CO',
  };
  return labels[key];
}

export function getPollutantUnit(key: PollutantKey): string {
  if (key === 'co') return 'mg/m³';
  return 'µg/m³';
}

export function getAllCategories(): AqiCategory[] {
  return ['Good', 'Satisfactory', 'Moderately Polluted', 'Poor', 'Very Poor', 'Severe'];
}

export function getCategoryColor(category: AqiCategory): string {
  return CATEGORY_INFO[category].color;
}

export function getCategoryBgColor(category: AqiCategory): string {
  return CATEGORY_INFO[category].bgColor;
}

export function getCategoryTextColor(category: AqiCategory): string {
  return CATEGORY_INFO[category].textColor;
}
