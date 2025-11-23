import { setWeights, getWeights, DEFAULT_WEIGHTS, WeightConfig } from './engine.js';

/**
 * Runtime weight management helpers.
 * Allows gradual tuning (A/B or rollout) without code redeploy of engine internals.
 */

export function overrideWeights(partial: Partial<WeightConfig>) {
  setWeights(partial);
  return getWeights();
}

export function resetWeights() {
  setWeights({ ...DEFAULT_WEIGHTS });
  return getWeights();
}

export function currentWeights() {
  return getWeights();
}
