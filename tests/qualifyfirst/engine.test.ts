import { describe, it, expect } from 'vitest';
import { predictSurveyMatch, routeSurveys, setWeights, getWeights } from '../../modules/qualifyfirst/src/engine.js';

describe('QualifyFirst Engine', () => {
  const user = {
    id: 'u1', country: 'US', age: 28, tags: ['gaming', 'finance'], hoursActiveLast7d: 12, completionRate: 72
  };
  const survey = {
    id: 's1', country: 'US', minAge: 18, maxAge: 35, requiredTags: ['gaming'], estMinutes: 5, payoutUsd: 1.5, screenOutRate: 0.4
  };

  it('predictSurveyMatch returns probability and breakdown', () => {
    const match: any = predictSurveyMatch(user, survey, true);
    expect(match.score).toBeGreaterThan(0);
    expect(match.breakdown).toBeDefined();
    expect(match.breakdown.rawBeforePenalty).toBeGreaterThan(0);
    expect(match.riskFlags).toEqual(expect.any(Array));
  });

  it('routeSurveys filters by minScoreThreshold', () => {
    const before = getWeights().minScoreThreshold;
    setWeights({ minScoreThreshold: 10 });
    const routed = routeSurveys(user, [survey]);
    expect(routed.matches.length).toBe(1);
    setWeights({ minScoreThreshold: before });
  });

  it('lower completion rate yields risk flag', () => {
    const lowUser = { ...user, completionRate: 15 };
    const match: any = predictSurveyMatch(lowUser, survey, true);
    expect(match.riskFlags).toContain('low-completion-rate');
  });
});
