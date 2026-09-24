// Prediction-vs-Actual Demo Replay System
// Uses deterministic "actual" values to evaluate forecast accuracy.
// All values are DEMO REPLAY — not real-world accuracy.

import type {
  PredictionFeedback,
  PredictionPerformance,
  LocationDef,
  ForecastPoint,
} from '../types';
import { SeededRandom, hashStringToSeed } from '../demo/seeded-random';
import { getTimeOfDayMultiplier } from '../demo/generator';

export function generatePredictionFeedback(
  forecast: ForecastPoint[],
  location: LocationDef,
): PredictionPerformance {
  const pairs: PredictionFeedback[] = [];
  const now = Date.now();

  // Generate 12 historical prediction-actual pairs
  // Each pair represents a past forecast that was later compared to an "actual" reading
  for (let i = 0; i < 12; i++) {
    const hoursAgo = (i + 1) * 6;
    const predictedTime = new Date(now - hoursAgo * 3600 * 1000).toISOString();
    const actualTime = new Date(now - (hoursAgo - 6) * 3600 * 1000).toISOString();

    // Deterministic "predicted" value
    const seedPredicted = hashStringToSeed(`${location.id}:replay-predicted:${hoursAgo}`);
    const rngP = new SeededRandom(seedPredicted);
    const hourOfDay = new Date(predictedTime).getHours();
    const todMult = getTimeOfDayMultiplier(hourOfDay);
    const baseAqi = 120 + location.id.length * 5;
    const predictedAqi = Math.round(baseAqi * todMult * (0.8 + rngP.next() * 0.4));
    const predictedPm25 = Math.round((predictedAqi * 0.4) * 10) / 10;

    // Deterministic "actual" value (slightly different from predicted to create realistic error)
    const seedActual = hashStringToSeed(`${location.id}:replay-actual:${hoursAgo}`);
    const rngA = new SeededRandom(seedActual);
    const actualHour = new Date(actualTime).getHours();
    const actualTodMult = getTimeOfDayMultiplier(actualHour);
    const actualAqi = Math.round(baseAqi * actualTodMult * (0.8 + rngA.next() * 0.4));
    const actualPm25 = Math.round((actualAqi * 0.4) * 10) / 10;

    const error = Math.abs(predictedAqi - actualAqi);
    const pm25Error = Math.abs(predictedPm25 - actualPm25);
    const predictedDir = predictedAqi > 100 ? 'rising' : 'falling';
    const actualDir = actualAqi > 100 ? 'rising' : 'falling';
    const directionCorrect = predictedDir === actualDir;

    const confidence = error < 15 ? 'High' : error < 30 ? 'Medium' : 'Low';

    pairs.push({
      id: `replay-${i}`,
      location: location.city,
      predictedTime,
      actualTime,
      predictedAqi,
      actualAqi,
      predictedPm25,
      actualPm25,
      error,
      pm25Error,
      directionCorrect,
      confidence,
    });
  }

  // Calculate metrics
  const mae = Math.round(pairs.reduce((a, p) => a + p.error, 0) / pairs.length * 10) / 10;
  const rmse = Math.round(Math.sqrt(pairs.reduce((a, p) => a + p.error * p.error, 0) / pairs.length) * 10) / 10;
  const dirCorrect = pairs.filter((p) => p.directionCorrect).length;
  const directionalAccuracy = Math.round((dirCorrect / pairs.length) * 1000) / 10;

  return {
    pairs,
    mae,
    rmse,
    directionalAccuracy,
    count: pairs.length,
    label: 'DEMO REPLAY EVALUATION',
  };
}
