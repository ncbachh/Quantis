/**
 * Chart Capabilities & Feature Flag Predicates
 *
 * Replaces the monolithic isAcademicChart boolean with granular, named predicates
 * reflecting specific chart engine capabilities.
 */

export type AcademicChartType = "bar" | "barH" | "line" | "scatter";

const ACADEMIC: readonly string[] = ["bar", "barH", "line", "scatter"];

/** Charts whose X/Y/aggregation live in `chartConfig` (vs the legacy chartXCol/chartYCol hooks). */
export const usesConfigAxes = (chartType: string): boolean => ACADEMIC.includes(chartType);

/** Charts that support a Legend grouping field. */
export const supportsLegend = (chartType: string): boolean =>
  ["bar", "barH", "line", "scatter"].includes(chartType);

/** Charts that support clustered vs stacked bar modes. */
export const supportsBarMode = (chartType: string): boolean =>
  ["bar", "barH"].includes(chartType);

/** Charts that support error bar whiskers on Mean. */
export const supportsErrorBars = (chartType: string): boolean =>
  ["bar", "barH", "line"].includes(chartType);

/** Charts that support automatic academic title generation. */
export const supportsAutoTitle = (chartType: string): boolean =>
  ACADEMIC.includes(chartType);
