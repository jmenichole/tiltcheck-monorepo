import { describe, it, expect, beforeEach } from 'vitest';
import { attachPublisher, publishMatch, publishRouteResult, predictSurveyMatch, routeSurveys, resetMetrics, getMetrics, getRollingMetrics, currentWeightVersion, type UserProfile, type SurveyMeta } from '../src/engine.js';

let events: { type: string; payload: any }[] = [];

beforeEach(() => {
  events = [];
  resetMetrics();
  attachPublisher({ publish: (type, payload) => { events.push({ type, payload }); } });
});

const user: UserProfile = {
  id: 'u1', country: 'US', age: 30, tags: ['engaged', 'tech'], hoursActiveLast7d: 8, completionRate: 75
};

const surveys: SurveyMeta[] = [
  { id: 's1', requiredTags: ['engaged'], minAge: 18, maxAge: 65, screenOutRate: 0.3 },
  { id: 's2', requiredTags: ['engaged','tech'], minAge: 21, maxAge: 50, screenOutRate: 0.7 },
];

describe('publisher integration', () => {
  it('publishes match and updates metrics & rolling window', () => {
    const match = predictSurveyMatch(user, surveys[0]);
    publishMatch(match);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('survey.match.predicted');
    expect(events[0].payload.weightVersion).toBe(currentWeightVersion());
    expect(events[0].payload.match.score).toBeGreaterThan(0);
    const metrics = getMetrics();
    expect(metrics.totalMatches).toBe(1);
    expect(metrics.averageScore).toBeGreaterThan(0);
    const rolling = getRollingMetrics();
    expect(rolling.count).toBe(1);
    expect(rolling.averageScore).toBeGreaterThan(0);
  });

  it('publishes route result tagging weight version and aggregates metrics', () => {
    const route = routeSurveys(user, surveys);
    publishRouteResult(route);
    // route publish + each match counted
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('survey.route.generated');
    expect(events[0].payload.weightVersion).toBe(currentWeightVersion());
    expect(events[0].payload.route.matches.length).toBeGreaterThan(0);
    const metrics = getMetrics();
    expect(metrics.totalRoutes).toBe(1);
    expect(metrics.totalMatches).toBe(route.matches.length);
    // riskFlagCounts may be empty if no risk flags triggered for provided surveys
    expect(metrics.riskFlagCounts).toBeTypeOf('object');
    const rolling = getRollingMetrics();
    expect(rolling.count).toBe(route.matches.length);
  });
});
