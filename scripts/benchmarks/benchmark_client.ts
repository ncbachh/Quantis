/**
 * Benchmark Script for Client-side Statistical Calculations in Quantis (Node.js V8 CLI)
 * Measures pure TypeScript compute speed on Node.js V8:
 * 1. computeProfile (1-column baseline [10k, 50k, 150k] & 10-column survey [500, 2k, 10k, 50k])
 * 2. computeReliability (Cronbach's Alpha, (k, N) grid & 9-item survey)
 * 3. computeOLS (Client TS)
 * 4. imputeHotDeck (Sync vs Worker-pipeline patch extraction overhead; real rAF UI-blocking is measured in benchmark_browser.py)
 */

import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { computeProfile, computeOLS } from "../../src/utils/stats";
import { computeReliability } from "../../src/utils/reliability";
import { imputeHotDeck } from "../../src/utils/missing-imputation";

function createRng(seed = 123456789) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSingleColDataset(n: number): string[][] {
  const rows: string[][] = new Array(n + 1);
  rows[0] = ["score"];
  for (let i = 0; i < n; i++) rows[i + 1] = [String(i)];
  return rows;
}

function generateSurveyDataset(n: number, kLikert = 9, missingRate = 0.05, seed = 42) {
  const rng = createRng(seed);
  const likertHeaders = Array.from({ length: kLikert }, (_, idx) => `X${idx + 1}`);
  const headers = [...likertHeaders, "Y"];
  const cleanRows: string[][] = [headers];
  const missingRows: string[][] = [headers];

  for (let i = 0; i < n; i++) {
    const xVals: number[] = [];
    const cleanRow: string[] = [];
    const missingRow: string[] = [];

    for (let j = 0; j < kLikert; j++) {
      const base = 1 + Math.floor(rng() * 5);
      xVals.push(base);
      cleanRow.push(String(base));
      missingRow.push(rng() < missingRate ? "" : String(base));
    }

    const yVal = +(
      1.5 +
      0.35 * (xVals[0] ?? 3) +
      0.25 * (xVals[1] ?? 3) +
      0.40 * (xVals[2] ?? 3) +
      0.15 * (xVals[3] ?? 3) +
      0.20 * (xVals[4] ?? 3) +
      (rng() - 0.5) * 1.2
    ).toFixed(2);

    cleanRow.push(String(yVal));
    missingRow.push(rng() < missingRate ? "" : String(yVal));

    cleanRows.push(cleanRow);
    missingRows.push(missingRow);
  }

  return { cleanRows, missingRows, likertHeaders };
}

function executeWorkerImputationPipeline(data: string[][], targetCols: string[]): { totalWorkerMs: number; patchCount: number } {
  const t0 = performance.now();
  const output = imputeHotDeck(data, targetCols);

  const header = data[0] || [];
  const columnPatches: Record<number, string[]> = {};
  for (const col of targetCols) {
    const ci = header.indexOf(col);
    if (ci >= 0) {
      const vals = new Array(output.length - 1);
      for (let r = 1; r < output.length; r++) vals[r - 1] = output[r][ci];
      columnPatches[ci] = vals;
    }
  }
  const t1 = performance.now();
  return { totalWorkerMs: t1 - t0, patchCount: Object.keys(columnPatches).length };
}

function calcStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const std = Math.sqrt(variance);
  return {
    median: +median.toFixed(2),
    mean: +mean.toFixed(2),
    min: +min.toFixed(2),
    max: +max.toFixed(2),
    std: +std.toFixed(2),
  };
}

function measureFn<T>(fn: () => T, warmup: number, iters: number) {
  for (let w = 0; w < warmup; w++) fn();
  const times: number[] = [];
  let lastResult!: T;
  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    lastResult = fn();
    times.push(performance.now() - t0);
  }
  return { stats: calcStats(times), lastResult };
}

async function runBenchmark() {
  console.log("===============================================================================");
  console.log("   QUANTIS CLIENT-SIDE PERFORMANCE BENCHMARK (Node.js V8 JIT Engine)          ");
  console.log("===============================================================================\n");

  const sampleSizes = [500, 2000, 10000, 50000];
  const xPredictors = ["X1", "X2", "X3", "X4", "X5"];
  const scaleItems = ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "X8", "X9"];
  const hotDeckCols = ["X1", "X2", "X3", "X4", "X5"];

  const results: Record<string, any> = {
    metadata: {
      timestamp: new Date().toISOString(),
      environment: "Node.js V8 (compute + patch pipeline; see browser_benchmark.json for real Web Worker + rAF)",
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuModel: process.env.PROCESSOR_IDENTIFIER || "Unknown",
    },
    profile_single_col: {},
    cronbach_grid: [],
    benchmarks: {},
    ols_reference_outputs: {},
  };

  // 1. Single-column baseline computeProfile (10k, 50k, 150k)
  for (const n of [10000, 50000, 150000]) {
    const singleRows = generateSingleColDataset(n);
    const { stats } = measureFn(() => computeProfile(singleRows), 3, 9);
    results.profile_single_col[String(n)] = stats;
    console.log(`[1-col baseline] N=${n.toLocaleString()}: median=${stats.median} ms (min=${stats.min}, max=${stats.max})`);
  }

  // 2. Cronbach (k, N) grid
  const cronbachPairs: Array<[number, number]> = [
    [5, 200],
    [5, 500],
    [10, 500],
    [10, 1000],
    [10, 2000],
    [20, 2000],
    [20, 5000],
  ];
  for (const [k, n] of cronbachPairs) {
    const { cleanRows, likertHeaders } = generateSurveyDataset(n, k, 0.0, 200 + k * 10000 + n);
    const { stats } = measureFn(() => computeReliability(cleanRows, likertHeaders), 3, 20);
    results.cronbach_grid.push({ k, n, ...stats });
  }

  // 3. 10-column survey benchmarks
  for (const n of sampleSizes) {
    console.log(`\n>>> Benchmarking 10-col survey N = ${n.toLocaleString()} (missingRate = 5%)...`);
    const { cleanRows, missingRows } = generateSurveyDataset(n, 9, 0.05, 42 + n);

    const iters = n >= 50000 ? 3 : n >= 10000 ? 5 : 7;
    const warmup = 2;

    const profileStats = measureFn(() => computeProfile(cleanRows), warmup, iters).stats;
    const reliabilityStats = measureFn(() => computeReliability(cleanRows, scaleItems), warmup, iters).stats;
    const olsMeasure = measureFn(() => computeOLS(cleanRows, "Y", xPredictors), warmup, iters);
    const olsStats = olsMeasure.stats;
    if (olsMeasure.lastResult) {
      results.ols_reference_outputs[String(n)] = olsMeasure.lastResult;
    }

    const hdWarmup = n >= 50000 ? 1 : warmup;
    const hdIters = n >= 50000 ? 3 : iters;
    const hotDeckSyncStats = measureFn(() => imputeHotDeck(missingRows, hotDeckCols), hdWarmup, hdIters).stats;
    for (let w = 0; w < hdWarmup; w++) executeWorkerImputationPipeline(missingRows, hotDeckCols);
    const workerTimes: number[] = [];
    for (let i = 0; i < hdIters; i++) {
      workerTimes.push(executeWorkerImputationPipeline(missingRows, hotDeckCols).totalWorkerMs);
    }
    const workerExecStats = calcStats(workerTimes);

    results.benchmarks[String(n)] = {
      n,
      computeProfile: profileStats,
      computeReliability: reliabilityStats,
      computeOLS: olsStats,
      imputeHotDeck_Sync: hotDeckSyncStats,
      imputeHotDeck_WorkerPipeline: workerExecStats,
    };

    console.log(`  - computeProfile (10 cols): median = ${profileStats.median.toFixed(2)} ms (std = ${profileStats.std.toFixed(2)})`);
    console.log(`  - computeReliability (k=9): median = ${reliabilityStats.median.toFixed(2)} ms (std = ${reliabilityStats.std.toFixed(2)})`);
    console.log(`  - computeOLS (5 preds):     median = ${olsStats.median.toFixed(2)} ms (std = ${olsStats.std.toFixed(2)})`);
    console.log(`  - Hot-Deck Sync:            median = ${hotDeckSyncStats.median.toFixed(2)} ms (std = ${hotDeckSyncStats.std.toFixed(2)})`);
    console.log(`  - Hot-Deck Worker Pipeline: median = ${workerExecStats.median.toFixed(2)} ms (std = ${workerExecStats.std.toFixed(2)})`);
  }

  const outDir = path.resolve(process.cwd(), "scripts/benchmarks/results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "client_benchmark.json");
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nSaved JSON results to: ${jsonPath}`);

  let mdTable = "# Kết Quả Đo Hiệu Năng Phía Client (Node.js V8 JIT)\n\n";
  mdTable += "| Cỡ mẫu (N) | computeProfile 10 cột (ms) | computeReliability k=9 (ms) | computeOLS (ms) | HotDeck Sync (ms) | HotDeck + Patch Pipeline (ms) |\n";
  mdTable += "|:---:|:---:|:---:|:---:|:---:|:---:|\n";
  for (const n of sampleSizes) {
    const b = results.benchmarks[String(n)];
    mdTable += `| **N = ${n.toLocaleString()}** | ${b.computeProfile.median.toFixed(2)} ± ${b.computeProfile.std.toFixed(2)} | ${b.computeReliability.median.toFixed(2)} ± ${b.computeReliability.std.toFixed(2)} | ${b.computeOLS.median.toFixed(2)} ± ${b.computeOLS.std.toFixed(2)} | ${b.imputeHotDeck_Sync.median.toFixed(2)} ± ${b.imputeHotDeck_Sync.std.toFixed(2)} | ${b.imputeHotDeck_WorkerPipeline.median.toFixed(2)} ± ${b.imputeHotDeck_WorkerPipeline.std.toFixed(2)} |\n`;
  }

  const mdPath = path.join(outDir, "client_benchmark.md");
  fs.writeFileSync(mdPath, mdTable, "utf-8");
  console.log(`Saved Markdown table to: ${mdPath}\n`);
}

async function main() {
  if (process.argv.includes("--ols-stdin")) {
    const payload = JSON.parse(fs.readFileSync(0, "utf-8"));
    console.log(JSON.stringify(computeOLS(payload.rows, payload.yCol, payload.xCols)));
    return;
  }
  await runBenchmark();
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
