"""
Real Browser Benchmark Script (Chromium via Playwright + Vite Dev Server)
Measures inside real Headless Chromium connected to Quantis (http://localhost:3000):
1. computeProfile: 1-column baseline [10000, 50000, 150000] & 10-column survey [500, 2000, 10000, 50000]
2. imputeHotDeck: Main UI Thread vs REAL Web Worker (src/workers/imputation.worker.ts)
   - Monitors a live requestAnimationFrame loop to measure REAL UI blocking (maxFrameGapMs, longFramesOver50ms)
   - Verifies real AbortController cancellation mid-flight on N = 50000
3. computeReliability (New Client TS in Browser) vs Legacy Python Endpoint (POST http://localhost:4100/api/quantis/analyze/cronbach)
   - Grid of (k, N) with k in [5, 10, 20], N in [200, 500, 1000, 2000, 5000]
   - Verifies numerical parity |alpha_ts - alpha_py_old|
4. computeOLS in Browser Chromium V8 for [500, 2000, 10000, 50000]
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np
from playwright.sync_api import sync_playwright


def create_rng(seed: int = 123456789):
    s = seed & 0xFFFFFFFF
    if s >= 0x80000000:
        s -= 0x100000000

    def next_float() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        if s >= 0x80000000:
            s -= 0x100000000
        # Emulate JS Math.imul and >>>
        s_u = s & 0xFFFFFFFF
        t = ((s_u ^ (s_u >> 15)) * (1 | s_u)) & 0xFFFFFFFF
        t2 = ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF
        t = (t + t2) ^ t
        t &= 0xFFFFFFFF
        out = (t ^ (t >> 14)) & 0xFFFFFFFF
        return out / 4294967296.0

    return next_float


def generate_likert_dataset(n: int, k_likert: int, seed: int) -> tuple[list[str], list[list[str]]]:
    rng = create_rng(seed)
    headers = [f"X{j + 1}" for j in range(k_likert)]
    rows = [headers]
    for _ in range(n):
        row = []
        for _ in range(k_likert):
            row.append(str(1 + int(rng() * 5)))
        rows.append(row)
    return headers, rows


def calc_stats(samples: list[float]) -> dict[str, float]:
    sorted_s = sorted(samples)
    n = len(sorted_s)
    median = (sorted_s[n // 2 - 1] + sorted_s[n // 2]) / 2.0 if n % 2 == 0 else sorted_s[n // 2]
    mean = float(np.mean(sorted_s))
    std = float(np.std(sorted_s, ddof=1)) if n > 1 else 0.0
    return {
        "median": round(float(median), 2),
        "mean": round(mean, 2),
        "min": round(float(sorted_s[0]), 2),
        "max": round(float(sorted_s[-1]), 2),
        "std": round(std, 2),
    }


def main():
    print("===============================================================================")
    print("   QUANTIS REAL BROWSER BENCHMARK (Chromium + Web Worker + Legacy Cronbach)    ")
    print("===============================================================================\n")

    frontend_url = os.environ.get("QUANTIS_FRONTEND_URL", "http://localhost:3000")
    old_cronbach_url = os.environ.get("OLD_CRONBACH_URL", "http://localhost:4100/api/quantis/analyze/cronbach")
    results_dir = Path(__file__).resolve().parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    # Verify legacy cronbach endpoint first
    http_client = httpx.Client(timeout=60.0)
    try:
        probe = http_client.post(
            old_cronbach_url,
            json={"rows": [["X1", "X2"], ["1", "2"], ["2", "3"], ["4", "5"]], "columnNames": ["X1", "X2"]},
        )
        probe.raise_for_status()
    except Exception as exc:
        print(f"ERROR: Legacy Cronbach endpoint unreachable at {old_cronbach_url}: {exc}")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(frontend_url, wait_until="domcontentloaded")
        user_agent = page.evaluate("navigator.userAgent")
        print(f"Connected to {frontend_url} | Browser: {user_agent}\n")

        # Install deterministic generator, rAF monitor, and module imports inside page context
        page.evaluate("""async () => {
            const statsMod = await import('/src/utils/stats.ts');
            const relMod = await import('/src/utils/reliability.ts');
            const impMod = await import('/src/utils/missing-imputation.ts');
            const workerMod = await import('/src/utils/imputation-worker-client.ts');

            function createRng(seed = 123456789) {
              let s = seed | 0;
              return () => {
                s = (s + 0x6d2b79f5) | 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
              };
            }

            function generateSingleColDataset(n) {
              const rows = new Array(n + 1);
              rows[0] = ['score'];
              for (let i = 0; i < n; i++) rows[i + 1] = [String(i)];
              return rows;
            }

            function generateSurveyDataset(n, kLikert = 9, missingRate = 0.05, seed = 42) {
              const rng = createRng(seed);
              const likertHeaders = Array.from({ length: kLikert }, (_, idx) => 'X' + (idx + 1));
              const headers = [...likertHeaders, 'Y'];
              const cleanRows = [headers];
              const missingRows = [headers];
              for (let i = 0; i < n; i++) {
                const xVals = [];
                const cleanRow = [];
                const missingRow = [];
                for (let j = 0; j < kLikert; j++) {
                  const base = 1 + Math.floor(rng() * 5);
                  xVals.push(base);
                  cleanRow.push(String(base));
                  missingRow.push(rng() < missingRate ? '' : String(base));
                }
                const yVal = +(1.5 + 0.35*(xVals[0]??3) + 0.25*(xVals[1]??3) + 0.40*(xVals[2]??3) + 0.15*(xVals[3]??3) + 0.20*(xVals[4]??3) + (rng()-0.5)*1.2).toFixed(2);
                cleanRow.push(String(yVal));
                missingRow.push(rng() < missingRate ? '' : String(yVal));
                cleanRows.push(cleanRow);
                missingRows.push(missingRow);
              }
              return { cleanRows, missingRows, likertHeaders };
            }

            function generateLikertOnly(n, kLikert, seed) {
              const rng = createRng(seed);
              const headers = Array.from({ length: kLikert }, (_, idx) => 'X' + (idx + 1));
              const rows = [headers];
              for (let i = 0; i < n; i++) {
                const row = [];
                for (let j = 0; j < kLikert; j++) {
                  row.push(String(1 + Math.floor(rng() * 5)));
                }
                rows.push(row);
              }
              return { headers, rows };
            }

            async function measureWithRaf(fn) {
              let running = true;
              let last = performance.now();
              let maxGap = 0;
              let longFrames = 0;
              const gaps = [];
              const loop = (now) => {
                const gap = now - last;
                last = now;
                gaps.push(gap);
                if (gap > maxGap) maxGap = gap;
                if (gap > 50) longFrames++;
                if (running) requestAnimationFrame(loop);
              };
              await new Promise((r) => requestAnimationFrame((now) => { last = now; requestAnimationFrame(loop); r(); }));
              const t0 = performance.now();
              const value = await fn();
              const execMs = performance.now() - t0;
              await new Promise((r) => requestAnimationFrame(r));
              running = false;
              const gapAfter = performance.now() - last;
              if (gapAfter > maxGap) maxGap = gapAfter;
              return { execMs, maxFrameGapMs: maxGap, longFramesOver50ms: longFrames, value };
            }

            window.__quantisBench = {
              statsMod, relMod, impMod, workerMod,
              generateSingleColDataset, generateSurveyDataset, generateLikertOnly, measureWithRaf
            };
        }""")

        # 1. Profile 1-column baseline
        print(">>> [1/4] Benchmarking computeProfile (1-column baseline & 10-column survey) in Chromium...")
        profile_1col = page.evaluate("""() => {
            const { statsMod, generateSingleColDataset } = window.__quantisBench;
            const calc = (arr) => {
              const s = [...arr].sort((a,b)=>a-b), n = s.length;
              const med = n%2===0 ? (s[n/2-1]+s[n/2])/2 : s[Math.floor(n/2)];
              const mean = s.reduce((a,b)=>a+b,0)/n;
              const std = Math.sqrt(s.reduce((a,v)=>a+(v-mean)**2,0)/(n>1?n-1:1));
              return { median:+med.toFixed(2), mean:+mean.toFixed(2), min:+s[0].toFixed(2), max:+s[n-1].toFixed(2), std:+std.toFixed(2) };
            };
            const out = {};
            for (const n of [10000, 50000, 150000]) {
              const rows = generateSingleColDataset(n);
              for (let w=0; w<3; w++) statsMod.computeProfile(rows);
              const t = [];
              for (let i=0; i<9; i++) {
                const t0 = performance.now();
                statsMod.computeProfile(rows);
                t.push(performance.now() - t0);
              }
              out[String(n)] = calc(t);
            }
            return out;
        }""")
        print("  1-col baseline:", profile_1col)

        # 2. Hot-deck Main Thread vs Real Web Worker + computeProfile(10-col) + computeOLS in Chromium
        print("\n>>> [2/4] Benchmarking 10-column survey + Real Web Worker + requestAnimationFrame...")
        survey_bench = page.evaluate("""async () => {
            const { statsMod, impMod, workerMod, generateSurveyDataset, measureWithRaf } = window.__quantisBench;
            const calc = (arr) => {
              const s = [...arr].sort((a,b)=>a-b), n = s.length;
              const med = n%2===0 ? (s[n/2-1]+s[n/2])/2 : s[Math.floor(n/2)];
              const mean = s.reduce((a,b)=>a+b,0)/n;
              const std = Math.sqrt(s.reduce((a,v)=>a+(v-mean)**2,0)/(n>1?n-1:1));
              return { median:+med.toFixed(2), mean:+mean.toFixed(2), min:+s[0].toFixed(2), max:+s[n-1].toFixed(2), std:+std.toFixed(2) };
            };

            const xCols = ['X1','X2','X3','X4','X5'];
            const out = {};
            const olsOutputs = {};

            for (const n of [500, 2000, 10000, 50000]) {
              const { cleanRows, missingRows } = generateSurveyDataset(n, 9, 0.05, 42 + n);
              const iters = n >= 50000 ? 3 : n >= 10000 ? 5 : 7;
              const warmup = 2;

              // Profile 10-col
              for (let w=0; w<warmup; w++) statsMod.computeProfile(cleanRows);
              const profT = [];
              for (let i=0; i<iters; i++) {
                const t0 = performance.now(); statsMod.computeProfile(cleanRows); profT.push(performance.now()-t0);
              }

              // OLS
              for (let w=0; w<warmup; w++) statsMod.computeOLS(cleanRows, 'Y', xCols);
              const olsT = [];
              let olsRes = null;
              for (let i=0; i<iters; i++) {
                const t0 = performance.now(); olsRes = statsMod.computeOLS(cleanRows, 'Y', xCols); olsT.push(performance.now()-t0);
              }
              olsOutputs[String(n)] = olsRes;

              // Hot-deck Sync on Main Thread with rAF monitor
              const hdIters = n >= 50000 ? 3 : 5;
              const hdWarmup = 1;
              for (let w=0; w<hdWarmup; w++) impMod.imputeHotDeck(missingRows, xCols);
              const syncExec = [], syncRafMax = [], syncLong = [];
              for (let i=0; i<hdIters; i++) {
                const m = await measureWithRaf(() => impMod.imputeHotDeck(missingRows, xCols));
                syncExec.push(m.execMs);
                syncRafMax.push(m.maxFrameGapMs);
                syncLong.push(m.longFramesOver50ms);
              }

              // Hot-deck Real Web Worker with rAF monitor
              for (let w=0; w<hdWarmup; w++) await workerMod.runHotDeckImputation(missingRows, xCols);
              const wExec = [], wRafMax = [], wLong = [];
              for (let i=0; i<hdIters; i++) {
                const m = await measureWithRaf(() => workerMod.runHotDeckImputation(missingRows, xCols));
                wExec.push(m.execMs);
                wRafMax.push(m.maxFrameGapMs);
                wLong.push(m.longFramesOver50ms);
              }

              out[String(n)] = {
                n,
                computeProfile_10col: calc(profT),
                computeOLS: calc(olsT),
                hotDeck_mainThread: {
                  executionMs: calc(syncExec),
                  maxFrameGapMs: calc(syncRafMax),
                  maxLongFrames: Math.max(...syncLong),
                },
                hotDeck_webWorker: {
                  executionMs: calc(wExec),
                  maxFrameGapMs: calc(wRafMax),
                  maxLongFrames: Math.max(...wLong),
                },
              };
            }

            // Real AbortController cancellation test at N=50000
            const { missingRows: rows50k } = generateSurveyDataset(50000, 9, 0.05, 42 + 50000);
            const ctrl = new AbortController();
            const tAbortStart = performance.now();
            setTimeout(() => ctrl.abort(), 150);
            let abortedProperly = false;
            let abortElapsedMs = 0;
            try {
              await workerMod.runHotDeckImputation(rows50k, xCols, undefined, { signal: ctrl.signal });
            } catch (err) {
              abortedProperly = err && err.name === 'AbortError';
              abortElapsedMs = +(performance.now() - tAbortStart).toFixed(2);
            }

            return {
              benchmarks: out,
              olsOutputs,
              abortTest: { n: 50000, triggerAtMs: 150, abortedProperly, abortElapsedMs },
            };
        }""")

        for n_str, b in survey_bench["benchmarks"].items():
            print(
                f"  N={int(n_str):,}: Profile10={b['computeProfile_10col']['median']}ms | "
                f"OLS={b['computeOLS']['median']}ms | "
                f"HD-Sync={b['hotDeck_mainThread']['executionMs']['median']}ms (rAF maxGap={b['hotDeck_mainThread']['maxFrameGapMs']['median']}ms) | "
                f"HD-Worker={b['hotDeck_webWorker']['executionMs']['median']}ms (rAF maxGap={b['hotDeck_webWorker']['maxFrameGapMs']['median']}ms)"
            )
        print("  Abort test:", survey_bench["abortTest"])

        # 3. Cronbach's Alpha: Browser Client TS vs Legacy Python (/api/quantis/analyze/cronbach)
        print("\n>>> [3/4] Benchmarking Cronbach's Alpha: Browser TS vs Legacy Python (port 4100)...")
        cronbach_pairs = [
            (5, 200),
            (5, 500),
            (10, 500),
            (10, 1000),
            (10, 2000),
            (20, 2000),
            (20, 5000),
        ]

        cronbach_results = []
        for k, n in cronbach_pairs:
            seed = 200 + k * 10000 + n
            headers, rows = generate_likert_dataset(n, k, seed)

            # Client TS in Chromium (20 runs after 3 warmup)
            ts_res = page.evaluate("""({ k, n, seed }) => {
                const { relMod, generateLikertOnly } = window.__quantisBench;
                const { headers, rows } = generateLikertOnly(n, k, seed);
                for (let w=0; w<3; w++) relMod.computeReliability(rows, headers);
                const t = [];
                let alpha = null;
                for (let i=0; i<20; i++) {
                  const t0 = performance.now();
                  const r = relMod.computeReliability(rows, headers);
                  t.push(performance.now() - t0);
                  alpha = r.statistics.alpha;
                }
                const s = [...t].sort((a,b)=>a-b);
                const med = (s[9]+s[10])/2;
                const mean = s.reduce((a,b)=>a+b,0)/s.length;
                const std = Math.sqrt(s.reduce((a,v)=>a+(v-mean)**2,0)/(s.length-1));
                return { median:+med.toFixed(2), mean:+mean.toFixed(2), std:+std.toFixed(2), min:+s[0].toFixed(2), max:+s[19].toFixed(2), alpha };
            }""", {"k": k, "n": n, "seed": seed})

            # Legacy Python /cronbach on port 4100 (20 runs after 2 warmup)
            payload = {"rows": rows, "columnNames": headers}
            payload_kb = len(json.dumps(payload).encode("utf-8")) / 1024.0
            for _ in range(2):
                r = http_client.post(old_cronbach_url, json=payload)
                r.raise_for_status()
            py_times = []
            py_alpha = None
            for _ in range(20):
                t0 = time.perf_counter()
                r = http_client.post(old_cronbach_url, json=payload)
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                r.raise_for_status()
                py_times.append(elapsed_ms)
                py_alpha = r.json()["result"]

            py_stats = calc_stats(py_times)
            diff_alpha = abs(float(ts_res["alpha"]) - float(py_alpha))
            speedup = round(py_stats["median"] / ts_res["median"], 1) if ts_res["median"] > 0 else None

            cronbach_results.append({
                "k": k,
                "n": n,
                "payload_kb": round(payload_kb, 1),
                "client_ts_ms": ts_res,
                "legacy_python_rtt_ms": py_stats,
                "speedup_ratio": speedup,
                "alpha_ts": round(float(ts_res["alpha"]), 6),
                "alpha_py_legacy": round(float(py_alpha), 6),
                "abs_diff_alpha": diff_alpha,
            })
            print(
                f"  (k={k:2d}, N={n:4d}): Client TS={ts_res['median']:.2f}ms | "
                f"Legacy Python={py_stats['median']:.2f}ms | "
                f"Speedup={speedup}x | |diff|={diff_alpha:.2e}"
            )

        browser.close()

    out = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "frontend_url": frontend_url,
            "legacy_cronbach_url": old_cronbach_url,
            "browser": user_agent,
            "python_version": sys.version,
        },
        "profile_single_col": profile_1col,
        "survey_10col": survey_bench["benchmarks"],
        "hotdeck_abort_test": survey_bench["abortTest"],
        "ols_browser_outputs": survey_bench["olsOutputs"],
        "cronbach_comparison": cronbach_results,
    }

    json_path = results_dir / "browser_benchmark.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved browser JSON results to: {json_path}")

    # Build Markdown summary
    md = "# Báo Cáo Đo Hiệu Năng Thực Tế Trên Trình Duyệt (Chromium + Web Worker + Legacy Cronbach)\n\n"
    md += f"- Trình duyệt: `{user_agent}`\n"
    md += f"- Frontend Vite: `{frontend_url}`\n"
    md += f"- Legacy Python Cronbach API: `{old_cronbach_url}`\n\n"

    md += "## 1. Baseline `computeProfile` (1 cột số)\n\n"
    md += "| Cỡ mẫu ($N$) | Trung vị (ms) | Nhỏ nhất (ms) | Lớn nhất (ms) | Độ lệch chuẩn (ms) |\n|:---:|:---:|:---:|:---:|:---:|\n"
    for n in [10000, 50000, 150000]:
        s = profile_1col[str(n)]
        md += f"| {n:,} | {s['median']:.2f} | {s['min']:.2f} | {s['max']:.2f} | {s['std']:.2f} |\n"

    md += "\n## 2. Hot-deck Imputation: Main Thread vs Web Worker (đo `requestAnimationFrame` thực tế)\n\n"
    md += "| Cỡ mẫu ($N$) | Main Thread CPU (ms) | Main Thread rAF Max Gap (ms) | Web Worker End-to-End (ms) | Web Worker rAF Max Gap (ms) | Long Frames (>50ms) Worker |\n"
    md += "|:---:|:---:|:---:|:---:|:---:|:---:|\n"
    for n in [500, 2000, 10000, 50000]:
        b = survey_bench["benchmarks"][str(n)]
        mt = b["hotDeck_mainThread"]
        ww = b["hotDeck_webWorker"]
        md += (
            f"| {n:,} | {mt['executionMs']['median']:.2f} | {mt['maxFrameGapMs']['median']:.2f} | "
            f"{ww['executionMs']['median']:.2f} | {ww['maxFrameGapMs']['median']:.2f} | {ww['maxLongFrames']} |\n"
        )
    ab = survey_bench["abortTest"]
    md += f"\n> Thử nghiệm hủy tác vụ (`AbortController`) trên $N = {ab['n']:,}$: kích hoạt hủy tại {ab['triggerAtMs']} ms, Worker dừng sau **{ab['abortElapsedMs']} ms** (`abortedProperly={ab['abortedProperly']}`).\n"

    md += "\n## 3. Cronbach's Alpha: Browser TypeScript vs API Python Cũ (`/api/quantis/analyze/cronbach`)\n\n"
    md += "| Số mục ($k$) | Cỡ mẫu ($N$) | Payload (KB) | Client TS (ms) | API Python cũ RTT (ms) | Tỷ lệ nhanh hơn | Sai khác $|\\Delta \\alpha|$ |\n"
    md += "|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n"
    for c in cronbach_results:
        md += (
            f"| {c['k']} | {c['n']:,} | {c['payload_kb']} | {c['client_ts_ms']['median']:.2f} | "
            f"{c['legacy_python_rtt_ms']['median']:.2f} | {c['speedup_ratio']}x | {c['abs_diff_alpha']:.2e} |\n"
        )

    md_path = results_dir / "browser_benchmark.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"Saved Markdown summary to: {md_path}\n")


if __name__ == "__main__":
    main()
