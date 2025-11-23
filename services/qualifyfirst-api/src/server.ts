import express from 'express';
import { predictSurveyMatch, routeSurveys, getWeights, setWeights, attachPublisher, publishMatch, publishRouteResult, getMetrics, getRollingMetrics, getRollingMetricsWindow, currentWeightVersion, currentExperimentLabel, resetMetrics } from '@tiltcheck/qualifyfirst/dist/engine.js';

const app = express();
app.use(express.json());

// Basic health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qualifyfirst-api' });
});

// Return current weight configuration
app.get('/qualifyfirst/weights', (_req, res) => {
  res.json({ weights: getWeights(), weightVersion: currentWeightVersion(), experimentLabel: currentExperimentLabel() });
});

// Override weights (partial) - expects JSON body with optional experimentLabel
app.patch('/qualifyfirst/weights', (req, res) => {
  try {
    const { experimentLabel, ...weightUpdates } = req.body || {};
    setWeights(weightUpdates, experimentLabel);
    res.json({ ok: true, weights: getWeights(), weightVersion: currentWeightVersion(), experimentLabel: currentExperimentLabel() });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || 'Invalid weights' });
  }
});

// Predict a single survey match
// Body: { user: {...}, survey: {...}, breakdown?: boolean }
app.post('/qualifyfirst/match', (req, res) => {
  const { user, survey, breakdown } = req.body || {};
  if (!user || !survey) {
    return res.status(400).json({ ok: false, error: 'Missing user or survey' });
  }
  try {
    const result = predictSurveyMatch(user, survey, { breakdown: !!breakdown });
    // publish event for analytics / downstream consumers
    publishMatch(result);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'Prediction failed' });
  }
});

// Route an array of surveys
// Body: { user: {...}, surveys: [...], minScoreThreshold?: number }
app.post('/qualifyfirst/route', (req, res) => {
  const { user, surveys, minScoreThreshold } = req.body || {};
  if (!user || !Array.isArray(surveys)) {
    return res.status(400).json({ ok: false, error: 'Missing user or surveys[]' });
  }
  try {
    const routed = routeSurveys(user, surveys, { minScoreThreshold });
    publishRouteResult(routed);
    res.json({ ok: true, routed });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'Route failed' });
  }
});

// Metrics snapshot
app.get('/qualifyfirst/metrics', (_req, res) => {
  res.json({
    weightVersion: currentWeightVersion(),
    experimentLabel: currentExperimentLabel(),
    metrics: getMetrics(),
    rolling: getRollingMetrics()
  });
});

// Metrics with custom window size
app.get('/qualifyfirst/metrics/window', (req, res) => {
  const size = parseInt(req.query.size as string || '50');
  if (isNaN(size) || size < 1 || size > 1000) {
    return res.status(400).json({ ok: false, error: 'size must be 1-1000' });
  }
  res.json({
    weightVersion: currentWeightVersion(),
    experimentLabel: currentExperimentLabel(),
    window: getRollingMetricsWindow(size)
  });
});

// Reset metrics accumulators & rolling window
app.post('/qualifyfirst/metrics/reset', (_req, res) => {
  resetMetrics();
  res.json({ ok: true, weightVersion: currentWeightVersion(), experimentLabel: currentExperimentLabel(), metrics: getMetrics(), rolling: getRollingMetrics() });
});

// Attach a basic publisher (stdout). In production, replace with event router.
attachPublisher({ publish: (type: string, payload: any) => {
  if (process.env.QF_API_EVENTS_LOG === 'silent') return;
  console.log(`[event:${type}]`, JSON.stringify(payload));
}});

const port = process.env.QUALIFYFIRST_API_PORT || 6105;
app.listen(port, () => {
  console.log(`[qualifyfirst-api] listening on :${port}`);
});
