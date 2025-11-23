#!/usr/bin/env node
/**
 * Lighthouse CI Guardrail
 * Runs Lighthouse against a target URL and enforces score thresholds.
 * Usage: LHCI_TARGET=https://example.com pnpm lighthouse:ci
 */
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const TARGET = process.env.LHCI_TARGET || 'http://localhost:8083/';
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 1.0,
  seo: 0.95,
  'best-practices': 0.95
};

(async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'json', port: chrome.port }; // minimal
  const runnerResult = await lighthouse(TARGET, options);
  const categories = runnerResult.lhr.categories;

  console.log('Lighthouse CI results for', TARGET);
  const failures = [];
  Object.entries(categories).forEach(([key, cat]) => {
    const score = cat.score;
    const threshold = THRESHOLDS[key];
    const pct = Math.round(score * 100);
    if (threshold != null) {
      const need = Math.round(threshold * 100);
      const status = score >= threshold ? 'OK' : 'FAIL';
      console.log(`${key}: ${pct} (threshold ${need}) => ${status}`);
      if (score < threshold) failures.push({ key, score, threshold });
    } else {
      console.log(`${key}: ${pct} (no threshold)`);
    }
  });

  await chrome.kill();

  if (failures.length) {
    console.error('\nLighthouse CI failed thresholds:');
    failures.forEach(f => console.error(` - ${f.key}: ${Math.round(f.score * 100)} < ${Math.round(f.threshold * 100)}`));
    process.exit(1);
  }
  console.log('\nAll thresholds met. ✅');
})();
