import { describe, it, expect } from 'vitest';
import { predictSurveyMatch } from '../../modules/qualifyfirst/src/engine.js';

describe('QualifyFirst branch coverage', () => {
  const baseUser = { id: 'u', country: 'US', age: 30, tags: ['gaming','finance'], hoursActiveLast7d: 5, completionRate: 55 };

  it('flags country mismatch', () => {
    const survey = { id: 's', country: 'CA' };
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.riskFlags).toContain('country-mismatch');
  });

  it('flags age-range mismatch', () => {
    const survey = { id: 's', minAge: 35, maxAge: 40 };
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.riskFlags).toContain('age-range');
  });

  it('handles zero required tags path', () => {
    const survey = { id: 's', requiredTags: [] };
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.reasons).toContain('no-required-tags');
  });

  it('flags zero-tag-coverage when none match', () => {
    const survey = { id: 's', requiredTags: ['sports','music'] };
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.riskFlags).toContain('zero-tag-coverage');
  });

  it('partial tag coverage below 50% adds low-tag-coverage', () => {
    const survey = { id: 's', requiredTags: ['gaming','sports','music','art'] }; // 1/4 = 25%
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.riskFlags).toContain('low-tag-coverage');
    expect(match.reasons).toContain('partial-tags');
  });

  it('flags high-screen-out', () => {
    const survey = { id: 's', screenOutRate: 0.8 };
    const match: any = predictSurveyMatch(baseUser, survey);
    expect(match.riskFlags).toContain('high-screen-out');
  });
});
