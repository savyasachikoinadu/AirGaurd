// What-If Scenario Engine
// Applies configurable reduction factors to baseline forecast.
// Uses DEMO SCENARIO ASSUMPTIONS - not measured source-apportionment results.

import type {
  ScenarioInput,
  ScenarioResult,
  ForecastPoint,
  PollutantReadings,
  DataSource,
} from '../types';
import { calculateCpcbAqi, getAqiCategory, getAqiRiskLevel } from '../aqi/cpcb';

const SCENARIO_SOURCE: DataSource = 'AI_ESTIMATE';

// Demo sensitivity coefficients
// These represent estimated contribution fractions, NOT measured source apportionment
const DEMO_SENSITIVITY = {
  // Estimated fraction of PM2.5 attributable to each source (demo assumptions)
  pm25: { traffic: 0.35, industrial: 0.25, burning: 0.15 },
  pm10: { traffic: 0.30, industrial: 0.30, burning: 0.12 },
  no2: { traffic: 0.45, industrial: 0.15, burning: 0.05 },
  o3: { traffic: 0.20, industrial: 0.15, burning: 0.05 },
  so2: { traffic: 0.05, industrial: 0.50, burning: 0.03 },
  co: { traffic: 0.50, industrial: 0.10, burning: 0.08 },
};

const SCENARIO_ASSUMPTIONS = [
  'Traffic emissions are estimated to contribute approximately 35% of PM2.5 in urban demo areas.',
  'Industrial emissions are estimated to contribute approximately 25% of PM2.5 in demo areas.',
  'Open burning is estimated to contribute approximately 15% of PM2.5 in demo areas.',
  'Reduction percentages are applied linearly to the estimated contribution fraction.',
  'Temporary traffic restriction adds a 10% bonus to traffic reduction effectiveness.',
  'Industrial mitigation adds a 10% bonus to industrial reduction effectiveness.',
  'Burning control adds a 10% bonus to burning reduction effectiveness.',
  'These are DEMO SCENARIO ASSUMPTIONS, not measured scientific source-apportionment results.',
  'Scenario confidence decreases with larger total reductions due to real-world compliance uncertainty.',
];

function applyReduction(
  baseline: number,
  sourceFraction: number,
  reductionPct: number,
  bonus: boolean,
): number {
  const effectiveReduction = Math.min(100, reductionPct + (bonus ? 10 : 0));
  const reductionAmount = baseline * sourceFraction * (effectiveReduction / 100);
  return Math.max(0, baseline - reductionAmount);
}

function applyScenarioToForecast(
  baseline: ForecastPoint[],
  input: ScenarioInput,
): ForecastPoint[] {
  const trafficBonus = input.temporaryTrafficRestriction;
  const industrialBonus = input.industrialMitigation;
  const burningBonus = input.burningControl;

  return baseline.map((fp) => {
    const pollutants: PollutantReadings = {
      pm25: applyReduction(fp.pollutants.pm25, DEMO_SENSITIVITY.pm25.traffic, input.trafficReduction, trafficBonus)
        - applyReduction(fp.pollutants.pm25 * DEMO_SENSITIVITY.pm25.industrial, DEMO_SENSITIVITY.pm25.industrial, input.industrialReduction, industrialBonus) * DEMO_SENSITIVITY.pm25.industrial / DEMO_SENSITIVITY.pm25.traffic
        + 0, // Simplified: apply each source reduction independently below
      pm10: 0, no2: 0, o3: 0, so2: 0, co: 0,
    };

    // Recalculate properly: apply each source independently
    const pm25Traffic = fp.pollutants.pm25 * DEMO_SENSITIVITY.pm25.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const pm25Industrial = fp.pollutants.pm25 * DEMO_SENSITIVITY.pm25.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const pm25Burning = fp.pollutants.pm25 * DEMO_SENSITIVITY.pm25.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const pm25Other = fp.pollutants.pm25 * (1 - DEMO_SENSITIVITY.pm25.traffic - DEMO_SENSITIVITY.pm25.industrial - DEMO_SENSITIVITY.pm25.burning);
    pollutants.pm25 = Math.max(5, Math.round((pm25Traffic + pm25Industrial + pm25Burning + pm25Other) * 10) / 10);

    const pm10Traffic = fp.pollutants.pm10 * DEMO_SENSITIVITY.pm10.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const pm10Industrial = fp.pollutants.pm10 * DEMO_SENSITIVITY.pm10.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const pm10Burning = fp.pollutants.pm10 * DEMO_SENSITIVITY.pm10.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const pm10Other = fp.pollutants.pm10 * (1 - DEMO_SENSITIVITY.pm10.traffic - DEMO_SENSITIVITY.pm10.industrial - DEMO_SENSITIVITY.pm10.burning);
    pollutants.pm10 = Math.max(10, Math.round((pm10Traffic + pm10Industrial + pm10Burning + pm10Other) * 10) / 10);

    const no2Traffic = fp.pollutants.no2 * DEMO_SENSITIVITY.no2.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const no2Industrial = fp.pollutants.no2 * DEMO_SENSITIVITY.no2.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const no2Burning = fp.pollutants.no2 * DEMO_SENSITIVITY.no2.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const no2Other = fp.pollutants.no2 * (1 - DEMO_SENSITIVITY.no2.traffic - DEMO_SENSITIVITY.no2.industrial - DEMO_SENSITIVITY.no2.burning);
    pollutants.no2 = Math.max(5, Math.round((no2Traffic + no2Industrial + no2Burning + no2Other) * 10) / 10);

    const o3Traffic = fp.pollutants.o3 * DEMO_SENSITIVITY.o3.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const o3Industrial = fp.pollutants.o3 * DEMO_SENSITIVITY.o3.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const o3Burning = fp.pollutants.o3 * DEMO_SENSITIVITY.o3.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const o3Other = fp.pollutants.o3 * (1 - DEMO_SENSITIVITY.o3.traffic - DEMO_SENSITIVITY.o3.industrial - DEMO_SENSITIVITY.o3.burning);
    pollutants.o3 = Math.max(5, Math.round((o3Traffic + o3Industrial + o3Burning + o3Other) * 10) / 10);

    const so2Traffic = fp.pollutants.so2 * DEMO_SENSITIVITY.so2.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const so2Industrial = fp.pollutants.so2 * DEMO_SENSITIVITY.so2.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const so2Burning = fp.pollutants.so2 * DEMO_SENSITIVITY.so2.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const so2Other = fp.pollutants.so2 * (1 - DEMO_SENSITIVITY.so2.traffic - DEMO_SENSITIVITY.so2.industrial - DEMO_SENSITIVITY.so2.burning);
    pollutants.so2 = Math.max(2, Math.round((so2Traffic + so2Industrial + so2Burning + so2Other) * 10) / 10);

    const coTraffic = fp.pollutants.co * DEMO_SENSITIVITY.co.traffic * (1 - Math.min(1, (input.trafficReduction + (trafficBonus ? 10 : 0)) / 100));
    const coIndustrial = fp.pollutants.co * DEMO_SENSITIVITY.co.industrial * (1 - Math.min(1, (input.industrialReduction + (industrialBonus ? 10 : 0)) / 100));
    const coBurning = fp.pollutants.co * DEMO_SENSITIVITY.co.burning * (1 - Math.min(1, (input.openBurningReduction + (burningBonus ? 10 : 0)) / 100));
    const coOther = fp.pollutants.co * (1 - DEMO_SENSITIVITY.co.traffic - DEMO_SENSITIVITY.co.industrial - DEMO_SENSITIVITY.co.burning);
    pollutants.co = Math.max(0.3, Math.round((coTraffic + coIndustrial + coBurning + coOther) * 100) / 100);

    const { aqi, dominantPollutant } = calculateCpcbAqi(pollutants);
    const aqiCategory = getAqiCategory(aqi);
    const riskLevel = getAqiRiskLevel(aqi);

    return {
      ...fp,
      pollutants,
      aqi,
      aqiCategory,
      riskLevel,
      dominantPollutant,
      source: SCENARIO_SOURCE,
    };
  });
}

function calculateScenarioConfidence(input: ScenarioInput): { level: 'Low' | 'Medium' | 'High'; score: number } {
  const totalReduction = input.trafficReduction + input.industrialReduction + input.openBurningReduction;
  const bonusCount = (input.temporaryTrafficRestriction ? 1 : 0) + (input.industrialMitigation ? 1 : 0) + (input.burningControl ? 1 : 0);
  const score = Math.max(0.2, 0.8 - (totalReduction / 300) * 0.3 - bonusCount * 0.05);
  const level = score >= 0.6 ? 'High' : score >= 0.4 ? 'Medium' : 'Low';
  return { level, score: Math.round(score * 100) / 100 };
}

export function runScenario(
  baseline: ForecastPoint[],
  input: ScenarioInput,
): ScenarioResult {
  const scenario = applyScenarioToForecast(baseline, input);

  const baselineAqi24 = baseline[baseline.length - 1]?.aqi || 0;
  const scenarioAqi24 = scenario[scenario.length - 1]?.aqi || 0;
  const improvementAqi = baselineAqi24 - scenarioAqi24;
  const improvementPct = baselineAqi24 > 0 ? Math.round((improvementAqi / baselineAqi24) * 1000) / 10 : 0;

  const baselineMaxAqi = Math.max(...baseline.map((f) => f.aqi));
  const scenarioMaxAqi = Math.max(...scenario.map((f) => f.aqi));
  const hotspotIntensityReduction = baselineMaxAqi - scenarioMaxAqi;

  // Estimate area reduction (simplified: proportion of cells below 200)
  const baselineHighHorizons = baseline.filter((f) => f.aqi > 200).length;
  const scenarioHighHorizons = scenario.filter((f) => f.aqi > 200).length;
  const hotspotAreaReduction = Math.round(((baselineHighHorizons - scenarioHighHorizons) / Math.max(1, baselineHighHorizons)) * 100);

  const { level: scenarioConfidence } = calculateScenarioConfidence(input);

  return {
    baseline,
    scenario,
    improvementAqi,
    improvementPct,
    hotspotIntensityReduction,
    hotspotAreaReduction: isNaN(hotspotAreaReduction) ? 0 : hotspotAreaReduction,
    scenarioConfidence,
    assumptions: SCENARIO_ASSUMPTIONS,
    source: SCENARIO_SOURCE,
  };
}

export function getAssumptions(): string[] {
  return SCENARIO_ASSUMPTIONS;
}
