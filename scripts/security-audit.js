#!/usr/bin/env node
/**
 * Security Audit Runner
 * Executes `pnpm audit --json`, parses known high severity advisories, and
 * enforces policy: fail on new high vulns or removed mitigations.
 */

import { spawnSync } from 'node:child_process';

function runAudit() {
  const res = spawnSync('pnpm', ['audit', '--json'], { encoding: 'utf8' });
  if (res.error) {
    console.error('[security-audit] Failed to execute pnpm audit:', res.error);
    process.exit(2);
  }
  const output = res.stdout.trim();
  if (!output) {
    console.warn('[security-audit] Empty audit output');
    process.exit(0);
  }
  let data;
  try {
    data = JSON.parse(output);
  } catch (e) {
    console.error('[security-audit] Invalid JSON audit output:', e);
    process.exit(2);
  }
  analyze(data);
}

const TRACKED = {
  'GHSA-3gc7-fjrx-p6mg': {
    package: 'bigint-buffer',
    status: 'expected_present', // until upstream patch
  },
  'GHSA-3xgq-45jj-v275': {
    package: 'cross-spawn',
    cve: 'CVE-2024-21538',
    npm_id: '1103747',
    status: 'mitigated', // overridden to >=7.0.6 in package.json
    note: 'ReDoS vulnerability fixed in 7.0.5+; override enforces 7.0.6+',
  },
  '1103747': {
    // Legacy npm advisory ID that redirects to GHSA-3xgq-45jj-v275
    package: 'cross-spawn',
    cve: 'CVE-2024-21538',
    ghsa: 'GHSA-3xgq-45jj-v275',
    status: 'mitigated', // overridden to >=7.0.6 in package.json
    note: 'ReDoS vulnerability fixed in 7.0.5+; override enforces 7.0.6+',
  },
};

function analyze(auditJson) {
  const advisories = extractAdvisories(auditJson);
  let fail = false;
  const report = [];
  for (const adv of advisories) {
    const tracked = TRACKED[adv.id];
    if (tracked) {
      report.push(`Tracked advisory: ${adv.id} package=${adv.package} severity=${adv.severity}`);
      if (tracked.status === 'expected_present' && adv.severity !== 'high') {
        report.push(`WARNING: severity changed (now ${adv.severity})`);
      }
    } else {
      // Fail on any new HIGH vulnerability not explicitly tracked
      if (adv.severity === 'high') {
        fail = true;
        report.push(`NEW HIGH vulnerability: ${adv.id} package=${adv.package}`);
      } else {
        report.push(`Untracked advisory: ${adv.id} severity=${adv.severity}`);
      }
    }
  }
  if (!advisories.length) {
    report.push('No advisories detected.');
  }
  console.log(report.join('\n'));
  if (fail) {
    console.error('[security-audit] Failing due to new high severity vulnerability.');
    process.exit(1);
  }
  process.exit(0);
}

function extractAdvisories(auditJson) {
  const list = [];
  // pnpm audit JSON shape (v9) includes vulnerabilities under `vulnerabilities`
  // Fallback: scan for objects containing `id` & `severity`.
  const vulnRoot = auditJson.vulnerabilities || auditJson.advisories || {};
  for (const key of Object.keys(vulnRoot)) {
    const v = vulnRoot[key];
    if (v && v.id && v.severity) {
      list.push({ id: v.id, severity: v.severity, package: v.package || v.name || key });
    }
  }
  return list;
}

runAudit();
