import { describe, it, expect } from "vitest";
import { compileFormula, computeVariable } from "../dataPrep";

describe("Formula Engine: Statistical Functions", () => {
  const header = ["Q1", "Q2", "Q3", "Q4"];

  describe("MEDIAN function", () => {
    it("calculates median for odd number of items", () => {
      const { fn } = compileFormula("MEDIAN([Q1], [Q2], [Q3])", header);
      // Q1=10, Q2=30, Q3=20 -> sorted: 10, 20, 30 -> median = 20
      const res = fn(["10", "30", "20", ""]);
      expect(res).toBe(20);
    });

    it("calculates median for even number of items", () => {
      const { fn } = compileFormula("MEDIAN([Q1], [Q2], [Q3], [Q4])", header);
      // Q1=10, Q2=20, Q3=30, Q4=40 -> median = (20 + 30) / 2 = 25
      const res = fn(["10", "20", "30", "40"]);
      expect(res).toBe(25);
    });

    it("ignores empty cells or NaN in multi-argument median (MULTI_SKIP_NAN)", () => {
      const { fn } = compileFormula("MEDIAN([Q1], [Q2], [Q3])", header);
      // Q1=10, Q2="", Q3=30 -> valid: 10, 30 -> median = (10 + 30) / 2 = 20
      const res = fn(["10", "", "30", ""]);
      expect(res).toBe(20);
    });

    it("returns NaN if all arguments are empty or non-numeric", () => {
      const { fn } = compileFormula("MEDIAN([Q1], [Q2])", header);
      const res = fn(["", "invalid"]);
      expect(Number.isNaN(res)).toBe(true);
    });

    it("works with lowercase formula name: median([Q1], [Q2], [Q3])", () => {
      const { fn } = compileFormula("median([Q1], [Q2], [Q3])", header);
      expect(fn(["5", "1", "9", ""])).toBe(5);
    });
  });

  describe("SD and STD functions (Sample Standard Deviation, N-1)", () => {
    it("calculates sample standard deviation with N-1 denominator", () => {
      const { fn } = compileFormula("SD([Q1], [Q2])", header);
      // Q1=10, Q2=20 -> mean=15, diffs: -5, 5 -> diffs^2: 25, 25 -> sum=50 -> ss/(2-1) = 50 -> sqrt(50) ≈ 7.0710678
      const res = fn(["10", "20", "", ""]);
      expect(res).toBeCloseTo(Math.sqrt(50), 5);
    });

    it("STD is an alias for SD", () => {
      const { fn } = compileFormula("STD([Q1], [Q2], [Q3])", header);
      // Q1=2, Q2=4, Q3=6 -> mean=4, diffs^2: 4, 0, 4 -> sum=8 -> 8/(3-1)=4 -> sqrt(4)=2
      const res = fn(["2", "4", "6", ""]);
      expect(res).toBe(2);
    });

    it("ignores missing values in multi-argument list", () => {
      const { fn } = compileFormula("SD([Q1], [Q2], [Q3])", header);
      // Q1=10, Q2="", Q3=20 -> N=2 -> sqrt(50)
      const res = fn(["10", "", "20", ""]);
      expect(res).toBeCloseTo(Math.sqrt(50), 5);
    });

    it("returns NaN when valid sample size N < 2", () => {
      const { fn } = compileFormula("SD([Q1], [Q2], [Q3])", header);
      // Only Q1 is valid
      const res1 = fn(["10", "", ""]);
      expect(Number.isNaN(res1)).toBe(true);

      // All missing
      const res0 = fn(["", "", ""]);
      expect(Number.isNaN(res0)).toBe(true);
    });
  });

  describe("computeVariable integration", () => {
    it("adds a new column computed using MEDIAN and SD", () => {
      const rows = [
        ["ID", "Q1", "Q2", "Q3"],
        ["1", "10", "20", "30"],
        ["2", "5", "", "15"],
        ["3", "", "", ""],
      ];

      const resMedian = computeVariable(rows, "Q_MEDIAN", "MEDIAN([Q1], [Q2], [Q3])");
      expect(resMedian.error).toBeUndefined();
      expect(resMedian.rows[0]).toEqual(["ID", "Q1", "Q2", "Q3", "Q_MEDIAN"]);
      expect(resMedian.rows[1][4]).toBe("20");
      expect(resMedian.rows[2][4]).toBe("10"); // median of 5 and 15 is 10
      expect(resMedian.rows[3][4]).toBe(""); // missing

      const resSd = computeVariable(rows, "Q_SD", "SD([Q1], [Q2], [Q3])");
      expect(resSd.error).toBeUndefined();
      expect(resSd.rows[0]).toEqual(["ID", "Q1", "Q2", "Q3", "Q_SD"]);
      expect(Number(resSd.rows[1][4])).toBeCloseTo(10, 4); // SD(10, 20, 30): mean=20, ss=100+0+100=200, 200/2=100, sqrt(100)=10
      expect(Number(resSd.rows[2][4])).toBeCloseTo(Math.sqrt(50), 4); // SD(5, 15): mean=10, ss=25+25=50, 50/1=50, sqrt(50)
      expect(resSd.rows[3][4]).toBe("");
    });
  });
});
