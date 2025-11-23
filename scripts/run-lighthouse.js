#!/usr/bin/env node
const { execSync } = require('child_process');
const url = process.env.LH_URL || 'http://localhost:8080/';
try {
  console.log('Running Lighthouse against', url);
  execSync(`npx lighthouse ${url} --quiet --chrome-flags='--headless' --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lighthouse-report.json`, { stdio: 'inherit' });
  console.log('Lighthouse report saved to lighthouse-report.json');
} catch (e) {
  console.error('Lighthouse run failed', e.message);
  process.exitCode = 1;
}
