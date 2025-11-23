#!/usr/bin/env node
/**
 * Casino Trust Grader (Advisory Only)
 * ----------------------------------
 * Neutral scoring harness using TiltCheck metric concepts. Accepts a JSON file
 * of observed spin / outcome events and optional configuration change markers.
 *
 * INPUT JSON SHAPE (example):
 * {
 *   "casino": "stake.us",
 *   "spins": [ { "ts": 1732060000000, "netWin": -1.0, "symbolFreq": {"A":12,"K":5}, "featureTriggered": false }, ... ],
 *   "seedRotations": [ {"ts": 1732063600000}, ... ],
 *   "bonusEvents": [ {"ts": 1732061200000, "type": "freespins"}, ... ],
 *   "paytableBaseline": { "A": 0.08, "K": 0.07 },
 *   "expectedBonusPerSpins": 120  // average spins between bonuses (heuristic)
 * }
 *
 * METRICS (0-1 scaled heuristics, higher = more anomaly):
 *  - payoutDrift: chi-square style divergence of aggregated symbol frequencies from baseline.
 *  - volatilityShift: variance regime delta before/after largest win cluster.
 *  - seedRotationCorrelation: correlation of rotation boundaries with local payout spikes/drops.
 *  - bonusLatency: ratio of observed avg spins-per-bonus vs expected.
 *
 * COMPOSITE SCORE (0-100): starts at 100, subtract weighted anomaly magnitudes; floor at 0.
 * This is NOT an accusation engine; interpretations must remain cautious.
 */

const fs = require('fs');
const path = require('path');

function load(pathArg) {
  const p = path.resolve(pathArg);
  return JSON.parse(fs.readFileSync(p,'utf-8'));
}

function safeDiv(a,b){ return b === 0 ? 0 : a/b; }

function computePayoutDrift(spins, baseline){
  const agg = {}; let totalSymbols = 0;
  for(const s of spins){
    for(const [sym,count] of Object.entries(s.symbolFreq||{})){
      agg[sym] = (agg[sym]||0)+count; totalSymbols += count;
    }
  }
  if(totalSymbols === 0) return 0;
  // chi-square like divergence normalized
  let chi = 0; let baselineSum = 0; for(const v of Object.values(baseline)) baselineSum += v;
  for(const [sym, observedCount] of Object.entries(agg)){
    const expectedP = baseline[sym] || 0; // if missing baseline treat as 0 expected
    const expectedCount = expectedP * totalSymbols;
    if(expectedCount > 0){ chi += Math.pow(observedCount - expectedCount,2)/expectedCount; }
  }
  // Normalize by degrees of freedom approximate
  const df = Math.max(Object.keys(agg).length - 1, 1);
  const normalized = chi / (df*10); // heuristic scale factor
  return Math.min(1, normalized);
}

function computeVolatilityShift(spins){
  if(spins.length < 30) return 0;
  const returns = spins.map(s=>s.netWin);
  // Identify largest positive win index cluster center
  let maxWin = -Infinity; let maxIdx = 0;
  returns.forEach((v,i)=>{ if(v>maxWin){ maxWin=v; maxIdx=i; } });
  const windowSize = Math.min(20, Math.floor(spins.length/4));
  const pre = returns.slice(Math.max(0,maxIdx - windowSize), maxIdx);
  const post = returns.slice(maxIdx+1, Math.min(spins.length, maxIdx+1+windowSize));
  function variance(arr){ if(arr.length===0) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; return arr.reduce((a,b)=>a+Math.pow(b-m,2),0)/arr.length; }
  const preVar = variance(pre); const postVar = variance(post);
  if(preVar === 0 && postVar === 0) return 0;
  const shift = Math.abs(postVar - preVar) / (Math.max(preVar, postVar) || 1);
  return Math.min(1, shift);
}

function computeSeedRotationCorrelation(spins, rotations){
  if(!rotations || rotations.length < 2 || spins.length === 0) return 0;
  // Partition spins into rotation epochs and compute mean netWin per epoch
  const epochs = [];
  const sortedRot = rotations.slice().sort((a,b)=>a.ts-b.ts);
  for(let i=0;i<sortedRot.length-1;i++){
    const start=sortedRot[i].ts; const end=sortedRot[i+1].ts;
    const epochSpins = spins.filter(s=>s.ts>=start && s.ts<end);
    if(epochSpins.length===0) continue;
    const mean = epochSpins.reduce((a,b)=>a+b.netWin,0)/epochSpins.length;
    epochs.push({start,end,mean});
  }
  if(epochs.length < 3) return 0;
  // Compute variance of successive mean differences vs overall variance to approximate correlation strength
  const means = epochs.map(e=>e.mean);
  const diffs = []; for(let i=1;i<means.length;i++) diffs.push(Math.abs(means[i]-means[i-1]));
  const avgDiff = diffs.reduce((a,b)=>a+b,0)/diffs.length;
  const overallVar = means.reduce((a,b)=>a+b,0)/means.length;
  const metric = safeDiv(avgDiff, Math.abs(overallVar)||1);
  return Math.min(1, metric/5); // heuristic dampening
}

function computeBonusLatency(spins, bonusEvents, expectedBonusPerSpins){
  if(!bonusEvents || bonusEvents.length < 2) return 0;
  const sorted = bonusEvents.slice().sort((a,b)=>a.ts-b.ts);
  const intervals = [];
  for(let i=1;i<sorted.length;i++){
    const start=sorted[i-1].ts; const end=sorted[i].ts;
    // approximate spins in interval
    const count = spins.filter(s=>s.ts>=start && s.ts<end).length;
    intervals.push(count);
  }
  if(intervals.length===0) return 0;
  const avg = intervals.reduce((a,b)=>a+b,0)/intervals.length;
  if(!expectedBonusPerSpins || expectedBonusPerSpins <=0) return 0;
  // Ratio >1 means slower than expected
  const ratio = avg / expectedBonusPerSpins;
  const anomaly = ratio > 1 ? Math.min(1, (ratio-1)/2) : 0; // only penalize latency, not faster rate
  return anomaly;
}

function compositeScore(metrics){
  // Start at 100, subtract weighted anomalies
  const weights = {
    payoutDrift: 30,
    volatilityShift: 25,
    seedRotationCorrelation: 20,
    bonusLatency: 25
  };
  let score = 100;
  for(const [k,v] of Object.entries(metrics)){
    score -= (weights[k]||0) * v;
  }
  return Math.max(0, Math.round(score));
}

function grade(data){
  const spins = data.spins||[];
  const metrics = {
    payoutDrift: computePayoutDrift(spins, data.paytableBaseline||{}),
    volatilityShift: computeVolatilityShift(spins),
    seedRotationCorrelation: computeSeedRotationCorrelation(spins, data.seedRotations||[]),
    bonusLatency: computeBonusLatency(spins, data.bonusEvents||[], data.expectedBonusPerSpins||0)
  };
  const score = compositeScore(metrics);
  return { casino: data.casino, score, metrics, disclaimer: "Advisory only. Higher metric values indicate statistical anomalies requiring cautious interpretation, not definitive misconduct." };
}

function main(){
  const file = process.argv[2];
  if(!file){
    console.error('Usage: grade-casino <data.json>');
    process.exit(1);
  }
  const data = load(file);
  const result = grade(data);
  console.log(JSON.stringify(result,null,2));
}

if(require.main === module){
  main();
}

// Example mock generation (invoke separately):
// node scripts/grade-casino.js mock-stake-us.json