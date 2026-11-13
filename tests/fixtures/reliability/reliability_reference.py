"""Golden reference for Cronbach's alpha (Phase 4.2, spec R11).

Independent implementation (pandas + scipy) of every number the TypeScript
module `src/utils/reliability.ts` must reproduce. The values printed by this
script are pasted as constants into `src/utils/__tests__/reliability.test.ts`;
the test never sources its expectations from the code under test.

Fixture: 12 rows x 5 items, Likert 1-5.
  Q1..Q4 are positively keyed, Q3 is written reverse-keyed (so it must be
  reflected with constant 6 before it correlates positively).
  Q5 is a low item-total item (0 < CITC < .30) used to review selection changes.

Run: python tests/fixtures/reliability/reliability_reference.py
"""

import json

import numpy as np
import pandas as pd
from scipy import stats

ITEMS = ["Q1", "Q2", "Q3", "Q4", "Q5"]

# 12 x 5 — written values, Q3 still reverse-keyed.
RAW = [
    [5, 4, 2, 5, 3],
    [4, 5, 1, 4, 2],
    [5, 4, 2, 5, 5],
    [3, 3, 3, 3, 2],
    [4, 4, 2, 4, 4],
    [2, 3, 4, 3, 2],
    [5, 5, 1, 5, 3],
    [3, 2, 4, 3, 4],
    [4, 4, 2, 4, 1],
    [3, 3, 3, 3, 3],
    [5, 4, 2, 5, 5],
    [4, 5, 1, 4, 1],
]

REFLECTION = 6  # min + max of a 1-5 scale


def frame(reverse=("Q3",)):
    df = pd.DataFrame(RAW, columns=ITEMS, dtype=float)
    for name in reverse:
        df[name] = REFLECTION - df[name]
    return df


def alpha(df):
    """Cronbach alpha: sample variances (ddof = 1), as in the spec."""
    k = df.shape[1]
    item_var = df.var(ddof=1, axis=0).sum()
    total_var = df.sum(axis=1).var(ddof=1)
    return k / (k - 1) * (1 - item_var / total_var)


def item_scale_stats(df):
    """SPSS Item-Total Statistics: CITC and alpha-if-deleted per item."""
    k = df.shape[1]
    rows = []
    for name in df.columns:
        rest = df.drop(columns=[name])
        citc = df[name].corr(rest.sum(axis=1))
        a_del = alpha(rest) if k >= 3 else np.nan
        rows.append(
            {
                "item": name,
                "mean": float(df[name].mean()),
                "sd": float(df[name].std(ddof=1)),
                "citc": float(citc),
                "alphaIfDeleted": float(a_del) if k >= 3 else None,
            }
        )
    return rows


def standardized_alpha(df):
    r = df.corr()
    k = df.shape[1]
    rbar = (r.values.sum() - k) / (k * (k - 1))  # off-diagonal mean
    return k * rbar / (1 + (k - 1) * rbar), rbar


def feldt_ci(a, k, n):
    """Feldt 95% CI, clamped to [0, 1] (SPSS behaviour)."""
    lower = 1 - (1 - a) * stats.f.ppf(0.975, n - 1, (k - 1) * (n - 1))
    upper = 1 - (1 - a) * stats.f.ppf(0.025, n - 1, (k - 1) * (n - 1))
    return max(0.0, min(1.0, float(lower))), max(0.0, min(1.0, float(upper)))


def report(title, df):
    k, n = df.shape[1], df.shape[0]
    a = alpha(df)
    a_std, rbar = standardized_alpha(df)
    lo, hi = feldt_ci(a, k, n)
    print(f"\n=== {title} ===")
    print(f"n = {n}, k = {k}")
    print(f"alpha               = {a:.12f}")
    print(f"alphaStandardized   = {a_std:.12f}")
    print(f"meanInterItemR      = {rbar:.12f}")
    print(f"feldtCI             = [{lo:.12f}, {hi:.12f}]")
    for row in item_scale_stats(df):
        print(
            "item "
            + row["item"]
            + ": mean={:.12f} sd={:.12f} citc={:.12f} alphaIfDeleted={}".format(
                row["mean"],
                row["sd"],
                row["citc"],
                "None" if row["alphaIfDeleted"] is None else f"{row['alphaIfDeleted']:.12f}",
            )
        )
    print("corr matrix        = " + json.dumps(df.corr().round(12).values.tolist()))
    return {
        "n": n,
        "k": k,
        "alpha": a,
        "alphaStandardized": a_std,
        "meanInterItemR": rbar,
        "ci": [lo, hi],
        "items": item_scale_stats(df),
    }


report("Q3 reverse-coded (reflection 6) — the committed fixture", frame(("Q3",)))
report("Q3 not reversed — the 'suspect reverse item' state", frame(()))

# Edge cases used by the unit tests.
constant = frame(("Q3",)).copy()
constant["Q4"] = 4.0
print("\n=== SD = 0 (Q4 constant) ===")
print(f"alpha = {alpha(constant)} (undefined: total variance still > 0 but item SD = 0)")

two = frame(("Q3",))[["Q1", "Q2"]]
print("\n=== k = 2 ===")
r12 = two["Q1"].corr(two["Q2"])
print(f"alpha = {alpha(two):.12f} (= 2r/(1+r) with r(Q1, Q2) = {r12:.12f})")
print(f"feldtCI = {feldt_ci(alpha(two), 2, len(two))}")
