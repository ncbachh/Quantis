import { describe, it, expect } from "vitest";
import {
  usesConfigAxes,
  supportsLegend,
  supportsBarMode,
  supportsErrorBars,
  supportsAutoTitle,
} from "../chartCapabilities";

describe("chartCapabilities", () => {
  const nonAcademicTypes = [
    "pie",
    "donut",
    "histogram",
    "box",
    "heatmap",
    "area",
    "density",
    "radar",
    "stackedBar",
    "multiLine",
    "crosstab",
    "summary",
    "dashboard",
    "unknown",
  ];

  describe("usesConfigAxes", () => {
    it("returns true for academic chart types (bar, barH, line, scatter)", () => {
      expect(usesConfigAxes("bar")).toBe(true);
      expect(usesConfigAxes("barH")).toBe(true);
      expect(usesConfigAxes("line")).toBe(true);
      expect(usesConfigAxes("scatter")).toBe(true);
    });

    it("returns false for non-academic chart types", () => {
      for (const t of nonAcademicTypes) {
        expect(usesConfigAxes(t)).toBe(false);
      }
    });
  });

  describe("supportsLegend", () => {
    it("returns true for bar, barH, line, scatter", () => {
      expect(supportsLegend("bar")).toBe(true);
      expect(supportsLegend("barH")).toBe(true);
      expect(supportsLegend("line")).toBe(true);
      expect(supportsLegend("scatter")).toBe(true);
    });

    it("returns false for non-academic chart types", () => {
      for (const t of nonAcademicTypes) {
        expect(supportsLegend(t)).toBe(false);
      }
    });
  });

  describe("supportsBarMode", () => {
    it("returns true only for bar and barH", () => {
      expect(supportsBarMode("bar")).toBe(true);
      expect(supportsBarMode("barH")).toBe(true);
    });

    it("returns false for line, scatter, and non-academic chart types", () => {
      expect(supportsBarMode("line")).toBe(false);
      expect(supportsBarMode("scatter")).toBe(false);
      for (const t of nonAcademicTypes) {
        expect(supportsBarMode(t)).toBe(false);
      }
    });
  });

  describe("supportsErrorBars", () => {
    it("returns true for bar, barH, line", () => {
      expect(supportsErrorBars("bar")).toBe(true);
      expect(supportsErrorBars("barH")).toBe(true);
      expect(supportsErrorBars("line")).toBe(true);
    });

    it("returns false for scatter and non-academic chart types", () => {
      expect(supportsErrorBars("scatter")).toBe(false);
      for (const t of nonAcademicTypes) {
        expect(supportsErrorBars(t)).toBe(false);
      }
    });
  });

  describe("supportsAutoTitle", () => {
    it("returns true for academic chart types (bar, barH, line, scatter)", () => {
      expect(supportsAutoTitle("bar")).toBe(true);
      expect(supportsAutoTitle("barH")).toBe(true);
      expect(supportsAutoTitle("line")).toBe(true);
      expect(supportsAutoTitle("scatter")).toBe(true);
    });

    it("returns false for non-academic chart types", () => {
      for (const t of nonAcademicTypes) {
        expect(supportsAutoTitle(t)).toBe(false);
      }
    });
  });
});
