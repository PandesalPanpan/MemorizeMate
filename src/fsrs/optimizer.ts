import {
  FSRSAlgorithm,
  forgetting_curve,
  CLAMP_PARAMETERS,
  W17_W18_Ceiling,
  default_w,
  Rating as FsrsRating,
  generatorParameters,
  type FSRSState,
} from 'ts-fsrs';
import type { ReviewLog, Rating } from '../types/models';

export interface OptimizationResult {
  parameters: number[];
  loss: number;
  accuracy: number;
  cycles: number;
  defaultLoss: number;
  defaultAccuracy: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function ratingToGrade(rating: Rating): number {
  switch (rating) {
    case 'again': return FsrsRating.Again;
    case 'hard': return FsrsRating.Hard;
    case 'good': return FsrsRating.Good;
    case 'easy': return FsrsRating.Easy;
  }
}

function groupByCard(logs: ReviewLog[], existingCardIds: Set<string>): Map<string, ReviewLog[]> {
  const map = new Map<string, ReviewLog[]>();
  for (const log of logs) {
    if (!existingCardIds.has(log.cardId)) continue;
    const arr = map.get(log.cardId);
    if (arr) arr.push(log);
    else map.set(log.cardId, [log]);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.timestamp - b.timestamp);
  }
  return map;
}

function computeLoss(
  parameters: number[],
  grouped: Map<string, ReviewLog[]>,
): { totalLoss: number; totalComparisons: number; correctPredictions: number } {
  const algo = new FSRSAlgorithm({ w: parameters });
  let totalLoss = 0;
  let totalComparisons = 0;
  let correctPredictions = 0;

  for (const logs of grouped.values()) {
    let state: FSRSState | null = null;
    for (const log of logs) {
      const g = ratingToGrade(log.rating);
      const t = log.elapsedDays;

      if (state !== null) {
        const p = clamp(forgetting_curve(parameters, t, state.stability), 1e-8, 1 - 1e-8);
        const y = (g as number) >= (FsrsRating.Hard as number) ? 1 : 0;
        totalLoss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
        totalComparisons++;
        if ((p >= 0.5 && y === 1) || (p < 0.5 && y === 0)) {
          correctPredictions++;
        }
      }

      state = algo.next_state(state, t, g);
    }
  }

  return { totalLoss, totalComparisons, correctPredictions };
}

export function runOptimization(
  logs: ReviewLog[],
  existingCardIds: Set<string>,
  options: { minReviews?: number; maxCycles?: number; numSamples?: number } = {},
): OptimizationResult {
  const minReviews = options.minReviews ?? 100;
  const maxCycles = options.maxCycles ?? 3;
  const numSamples = options.numSamples ?? 17;
  const tolerance = 1e-8;

  if (logs.length < minReviews) {
    throw new Error(`Need at least ${minReviews} reviews to optimize (have ${logs.length})`);
  }

  const grouped = groupByCard(logs, existingCardIds);

  let comparableLogs = 0;
  for (const cardLogs of grouped.values()) {
    comparableLogs += cardLogs.length - 1; // first review per card has no prior state
  }
  if (comparableLogs < 10) {
    throw new Error(`Need at least 10 review comparisons across cards (have ${comparableLogs}). Try studying more before optimizing.`);
  }

  const bounds = CLAMP_PARAMETERS(W17_W18_Ceiling, true);
  let w = [...default_w];

  const defaultResult = computeLoss(w, grouped);
  const defaultLoss = defaultResult.totalComparisons > 0
    ? defaultResult.totalLoss / defaultResult.totalComparisons
    : Infinity;
  const defaultAccuracy = defaultResult.totalComparisons > 0
    ? defaultResult.correctPredictions / defaultResult.totalComparisons
    : 0;

  const nWeights = Math.min(w.length, bounds.length);
  let cycles = 0;

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    cycles = cycle + 1;
    let improved = false;

    for (let i = 0; i < nWeights; i++) {
      const [lo, hi] = bounds[i];
      if (lo === hi) continue;

      let bestVal = w[i];
      let bestLoss = Infinity;

      for (let j = 0; j < numSamples; j++) {
        const candidate = lo + (hi - lo) * j / (numSamples - 1);
        const testW = [...w];
        testW[i] = candidate;
        const { totalLoss, totalComparisons } = computeLoss(testW, grouped);
        const avgLoss = totalComparisons > 0 ? totalLoss / totalComparisons : Infinity;
        if (avgLoss < bestLoss) {
          bestLoss = avgLoss;
          bestVal = candidate;
        }
      }

      if (Math.abs(bestVal - w[i]) > tolerance) {
        improved = true;
        w[i] = bestVal;
      }
    }

    if (!improved) break;
  }

  const finalResult = computeLoss(w, grouped);
  const finalLoss = finalResult.totalComparisons > 0
    ? finalResult.totalLoss / finalResult.totalComparisons
    : Infinity;
  const finalAccuracy = finalResult.totalComparisons > 0
    ? finalResult.correctPredictions / finalResult.totalComparisons
    : 0;

  try {
    generatorParameters({ w });
  } catch {
    throw new Error('Optimized parameters are invalid');
  }

  return {
    parameters: w,
    loss: finalLoss,
    accuracy: finalAccuracy,
    cycles,
    defaultLoss,
    defaultAccuracy,
  };
}
