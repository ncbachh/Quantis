"""
Benchmark Script: Dual-Mode OLS Regression in Quantis
Compares on the EXACT SAME deterministic 10-variable survey datasets (N in [500, 2000, 10000, 50000]):
1. Client-side TypeScript (computeOLS): In-browser / V8 execution (lightweight, basic coefficients).
2. Backend-side Python (POST /api/quantis/analyze/ols): FastAPI/scipy/statsmodels
   delivering complete 4-group regression diagnostics (Breusch-Pagan, RESET, Cook's D, Shapiro/Jarque-Bera, HC3, VIF).
Also verifies exact numerical parity between Client TS computeOLS and Backend Python /ols.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np


def create_rng(seed: int = 123456789):
    s = seed & 0xFFFFFFFF
    if s >= 0x80000000:
        s -= 0x100000000

    def next_float() -> float:
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        if s >= 0x80000000:
            s -= 0x100000000
        s_u = s & 0xFFFFFFFF
        t = ((s_u ^ (s_u >> 15)) * (1 | s_u)) & 0xFFFFFFFF
        t2 = ((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF
        t = (t + t2) ^ t
        t &= 0xFFFFFFFF
        out = (t ^ (t >> 14)) & 0xFFFFFFFF
        return out / 4294967296.0

    return next_float


def generate_survey_dataset(n: int, seed: int = 42) -> tuple[list[str], list[list[str]]]:
    """Generates exact same 10-variable survey dataset as benchmark_client.ts / benchmark_browser.py."""
    rng = create_rng(seed)
    headers = ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "X8", "X9", "Y"]
    rows = [headers]
    for _ in range(n):
        x_vals = [1 + int(rng() * 5) for _ in range(9)]
        y_val = round(
            1.5
            + 0.35 * x_vals[0]
            + 0.25 * x_vals[1]
            + 0.40 * x_vals[2]
            + 0.15 * x_vals[3]
            + 0.20 * x_vals[4]
            + (rng() - 0.5) * 1.2,
            2,
        )
        rows.append([str(v) for v in x_vals] + [f"{y_val:.2f}".rstrip("0").rstrip(".") if y_val == int(y_val) else str(y_val)])
    return headers, rows


def calc_stats(samples: list[float]) -> dict[str, float]:
    sorted_samples = sorted(samples)
    n = len(sorted_samples)
    median = (sorted_samples[n // 2 - 1] + sorted_samples[n // 2]) / 2 if n % 2 == 0 else sorted_samples[n // 2]
    mean = float(np.mean(sorted_samples))
    std = float(np.std(sorted_samples, ddof=1)) if n > 1 else 0.0
    return {
        "median": round(median, 2),
        "mean": round(mean, 2),
        "min": round(sorted_samples[0], 2),
        "max": round(sorted_samples[-1], 2),
        "std": round(std, 2),
    }


def get_container_versions(container_name: str = "quantis-python") -> dict[str, str]:
    try:
        proc = subprocess.run(
            [
                "docker",
                "exec",
                container_name,
                "python",
                "-c",
                "import sys,json,fastapi,uvicorn,statsmodels,scipy,numpy,pandas; "
                "print(json.dumps({'python':sys.version.split()[0],'fastapi':fastapi.__version__,"
                "'uvicorn':uvicorn.__version__,'statsmodels':statsmodels.__version__,"
                "'scipy':scipy.__version__,'numpy':numpy.__version__,'pandas':pandas.__version__}))",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout.strip())
    except Exception:
        pass
    return {}


def run_client_ols_on_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Runs Quantis src/utils/stats.ts computeOLS on the exact same payload sent to Python."""
    repo_root = Path(__file__).resolve().parents[2]
    vite_node = repo_root / "node_modules" / ".bin" / ("vite-node.cmd" if os.name == "nt" else "vite-node")
    proc = subprocess.run(
        [str(vite_node), "scripts/benchmarks/benchmark_client.ts", "--ols-stdin"],
        cwd=str(repo_root),
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode == 0 and proc.stdout.strip():
        return json.loads(proc.stdout.strip().splitlines()[-1])
    return None


def compute_numerical_parity(ts_res: dict[str, Any] | None, py_res: dict[str, Any]) -> dict[str, Any] | None:
    if not ts_res or not py_res:
        return None
    beta_diffs = [abs(float(ts_res["intercept"]) - float(py_res["intercept"]))]
    se_diffs = [abs(float(ts_res["se"]["(Intercept)"]) - float(py_res["se"]["(Intercept)"]))]
    t_diffs = [abs(float(ts_res["tStat"]["(Intercept)"]) - float(py_res["tStat"]["(Intercept)"]))]
    p_diffs = [abs(float(ts_res["pValue"]["(Intercept)"]) - float(py_res["pValue"]["(Intercept)"]))]
    for x in ts_res["xNames"]:
        beta_diffs.append(abs(float(ts_res["coefficients"][x]) - float(py_res["coefficients"][x])))
        se_diffs.append(abs(float(ts_res["se"][x]) - float(py_res["se"][x])))
        t_diffs.append(abs(float(ts_res["tStat"][x]) - float(py_res["tStat"][x])))
        p_diffs.append(abs(float(ts_res["pValue"][x]) - float(py_res["pValue"][x])))
    return {
        "max_abs_diff_beta": max(beta_diffs),
        "max_abs_diff_se": max(se_diffs),
        "max_abs_diff_t": max(t_diffs),
        "max_abs_diff_p": max(p_diffs),
        "abs_diff_r2": abs(float(ts_res["r2"]) - float(py_res["r2"])),
        "abs_diff_adjR2": abs(float(ts_res["adjR2"]) - float(py_res["adjR2"])),
    }


def main():
    print("===============================================================================")
    print("        QUANTIS DUAL-MODE OLS BENCHMARK (Client TS vs Backend Python)         ")
    print("===============================================================================\n")

    backend_url = os.environ.get("BACKEND_URL", "http://localhost:4000/api/quantis/analyze/ols")
    sample_sizes = [500, 2000, 10000, 50000]
    x_cols = ["X1", "X2", "X3", "X4", "X5"]
    y_col = "Y"

    results_dir = Path(__file__).resolve().parent / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    # Load Browser & Client Node baselines (both built on exact same Mulberry32 seed = 42 + n)
    client_json_path = results_dir / "client_benchmark.json"
    client_data: dict[str, Any] = {}
    if client_json_path.exists():
        with open(client_json_path, "r", encoding="utf-8") as f:
            client_data = json.load(f)

    browser_json_path = results_dir / "browser_benchmark.json"
    browser_data: dict[str, Any] = {}
    if browser_json_path.exists():
        with open(browser_json_path, "r", encoding="utf-8") as f:
            browser_data = json.load(f)

    results: dict[str, Any] = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "backend_url": backend_url,
            "host_python_version": sys.version,
            "server_container_versions": get_container_versions("quantis-python"),
            "xCols": x_cols,
            "yCol": y_col,
        },
        "benchmarks": {},
    }

    client = httpx.Client(timeout=120.0)

    for n in sample_sizes:
        print(f"\n>>> Benchmarking Backend OLS for N = {n:,} rows...")
        _, rows = generate_survey_dataset(n, seed=42 + n)
        payload = {"rows": rows, "yCol": y_col, "xCols": x_cols}

        try:
            w_res = client.post(backend_url, json=payload)
            w_res.raise_for_status()
        except Exception as e:
            print(f"Error connecting to backend {backend_url}: {e}")
            sys.exit(1)

        iters = 3 if n >= 50000 else 5
        rtt_times: list[float] = []
        payload_size_kb = len(json.dumps(payload).encode("utf-8")) / 1024
        response_size_kb = 0.0
        diagnostics_summary: dict[str, Any] = {}
        first_resp_json: dict[str, Any] = {}

        for it in range(iters):
            t0 = time.perf_counter()
            res = client.post(backend_url, json=payload)
            t1 = time.perf_counter()
            res.raise_for_status()
            rtt_times.append((t1 - t0) * 1000.0)

            if it == 0:
                first_resp_json = res.json().get("result", {})
                response_size_kb = len(res.content) / 1024
                diag = first_resp_json.get("diagnostics", {})
                assumptions = {a["id"]: a for a in diag.get("assumptions", [])}
                diagnostics_summary = {
                    "ok": diag.get("ok", False),
                    "linearity": {
                        "bp_p": assumptions.get("linearity", {}).get("stats", {}).get("bp", {}).get("p"),
                        "reset_p": assumptions.get("linearity", {}).get("stats", {}).get("reset", {}).get("p"),
                        "verdict": assumptions.get("linearity", {}).get("verdict"),
                    },
                    "normality": {
                        "test": assumptions.get("normality", {}).get("stats", {}).get("test"),
                        "p": assumptions.get("normality", {}).get("stats", {}).get("p"),
                        "verdict": assumptions.get("normality", {}).get("verdict"),
                    },
                    "influence": {
                        "maxCookD": assumptions.get("influence", {}).get("stats", {}).get("maxCookD"),
                        "nAbove4n": assumptions.get("influence", {}).get("stats", {}).get("nAbove4n"),
                        "verdict": assumptions.get("influence", {}).get("verdict"),
                    },
                    "collinearity": {
                        "maxVif": assumptions.get("collinearity", {}).get("stats", {}).get("maxVif"),
                        "verdict": assumptions.get("collinearity", {}).get("verdict"),
                    },
                    "robustHC3_available": "robustHC3" in diag,
                }

        backend_stats = calc_stats(rtt_times)

        # Prefer browser Chromium measurement if available; also keep Node baseline
        browser_ols_timing = browser_data.get("survey_10col", {}).get(str(n), {}).get("computeOLS", {})
        node_ols_timing = client_data.get("benchmarks", {}).get(str(n), {}).get("computeOLS", {})
        client_median_ms = browser_ols_timing.get("median") or node_ols_timing.get("median")
        client_std_ms = browser_ols_timing.get("std") if browser_ols_timing else node_ols_timing.get("std")

        ts_ols_out = (
            run_client_ols_on_payload(payload)
            or browser_data.get("ols_browser_outputs", {}).get(str(n))
            or client_data.get("ols_reference_outputs", {}).get(str(n))
        )
        parity = compute_numerical_parity(ts_ols_out, first_resp_json)

        results["benchmarks"][str(n)] = {
            "n": n,
            "request_payload_kb": round(payload_size_kb, 1),
            "response_payload_kb": round(response_size_kb, 1),
            "backend_rtt_ms": backend_stats,
            "client_browser_ms": browser_ols_timing or None,
            "client_node_ms": node_ols_timing or None,
            "client_ts_ms": {"median": client_median_ms, "std": client_std_ms},
            "speedup_client_vs_backend": round(backend_stats["median"] / client_median_ms, 1) if client_median_ms else None,
            "numerical_parity": parity,
            "diagnostics_summary": diagnostics_summary,
        }

        print(f"  - Request: {payload_size_kb:.1f} KB | Response: {response_size_kb:.1f} KB")
        print(f"  - Backend RTT: median = {backend_stats['median']:.1f} ms (std = {backend_stats['std']:.1f})")
        if client_median_ms:
            print(f"  - Client TS:   median = {client_median_ms:.2f} ms | Ratio = {backend_stats['median'] / client_median_ms:.1f}x")
        if parity:
            print(
                f"  - Numerical parity: max|dBeta|={parity['max_abs_diff_beta']:.2e}, "
                f"max|dSE|={parity['max_abs_diff_se']:.2e}, max|dp|={parity['max_abs_diff_p']:.2e}"
            )

    json_path = results_dir / "dual_mode_ols_benchmark.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nSaved dual-mode OLS JSON results to: {json_path}")

    md_content = """# Báo Cáo Đo Lường và So Sánh Hồi Quy Tuyến Tính OLS: Dual-Mode Architecture

## Bảng So Sánh Hiệu Năng Theo Quy Mô Dữ Liệu

| Cỡ Mẫu ($N$) | Request / Response (KB) | Client TS OLS ($T_{client}$) | Backend Python RTT ($T_{backend}$) | Tỷ Lệ Tốc Độ | Sai lệch $\\max|\\Delta \\hat{\\beta}|$ | Sai lệch $\\max|\\Delta p|$ |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
"""
    for n in sample_sizes:
        b = results["benchmarks"][str(n)]
        c_ms = f"{b['client_ts_ms']['median']:.2f} ms" if b["client_ts_ms"]["median"] else "N/A"
        b_ms = f"{b['backend_rtt_ms']['median']:.1f} ± {b['backend_rtt_ms']['std']:.1f} ms"
        speedup = f"**{b['speedup_client_vs_backend']}x**" if b["speedup_client_vs_backend"] else "N/A"
        p_beta = f"{b['numerical_parity']['max_abs_diff_beta']:.2e}" if b["numerical_parity"] else "N/A"
        p_val = f"{b['numerical_parity']['max_abs_diff_p']:.2e}" if b["numerical_parity"] else "N/A"
        md_content += (
            f"| **N = {n:,}** | {b['request_payload_kb']} / {b['response_payload_kb']} KB | "
            f"{c_ms} | {b_ms} | {speedup} | {p_beta} | {p_val} |\n"
        )

    b500 = results["benchmarks"]["500"]
    b50k = results["benchmarks"]["50000"]
    md_content += f"""
## Kết Luận Kiến Trúc
1. **Client TypeScript (`computeOLS`)**: Đạt độ trễ **{b500['client_ts_ms']['median']:.2f} ms** ở $N = 500$ và **{b50k['client_ts_ms']['median']:.2f} ms** ở $N = 50.000$ trên trình duyệt, không cần kết nối mạng, dùng cho chế độ chỉ có trình duyệt (`!analysisBackendAvailable`).
2. **Backend Python (`/api/quantis/analyze/ols`)**: Độ trễ RTT từ **{b500['backend_rtt_ms']['median']:.1f} ms** ($N = 500$) đến **{b50k['backend_rtt_ms']['median']:.1f} ms** ($N = 50.000$) do chi phí tuần tự hóa JSON và tính đầy đủ 4 nhóm chẩn đoán kinh tế lượng (Breusch-Pagan, Ramsey RESET, Shapiro-Wilk/Jarque-Bera, Cook's D/DFFITS/Leverage, HC3, VIF).
"""

    md_path = results_dir / "dual_mode_ols_benchmark.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved Markdown report to: {md_path}\n")


if __name__ == "__main__":
    main()
