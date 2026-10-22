import React from "react";
import { t } from "@/i18n";
import type { Dataset, ChartConfig, ChartControls, BarMode, ErrorBarType, ColorPaletteName } from "@/types";
import { DEFAULT_CHART_CONTROLS } from "@/types";
import type { AggregateFunction } from "@/utils/aggregation";
import { PALETTES } from "./colorPalettes";
import {
  usesConfigAxes,
  supportsLegend,
  supportsBarMode,
  supportsErrorBars,
} from "./chartCapabilities";
import { ChevronDown, SlidersHorizontal, BarChart3, ShieldAlert, Type } from "lucide-react";

export interface ChartInspectorPanelProps {
  chartType: string;
  dataset: Dataset | null;
  config: ChartConfig;
  onChange: (patch: Partial<ChartConfig>) => void;
  controls?: ChartControls;
  onControlsChange?: (patch: Partial<ChartControls>) => void;
  onExportCsv?: () => void;
  onExportPng?: () => void;
  onCopy?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ChartInspectorPanel({
  chartType,
  dataset,
  config,
  onChange,
  controls = DEFAULT_CHART_CONTROLS,
  onControlsChange = () => {},
  onExportCsv,
  disabled = false,
  className = "",
}: ChartInspectorPanelProps) {
  const columnNames = dataset?.columnNames || [];

  const getColDisplayName = (col: string): string => {
    const varMeta = dataset?.variables?.[col];
    if (varMeta?.label && varMeta.label.trim() !== "" && varMeta.label !== col) {
      return `${varMeta.label} (${col})`;
    }
    return col;
  };

  // Determine numeric columns
  const numericColumns = columnNames.filter((col) => {
    const meta = dataset?.variables?.[col];
    if (meta) {
      return meta.type === "numeric" || meta.measure === "scale";
    }
    // Fallback inspect rows
    const rows = dataset?.data || dataset?.preview || [];
    const header = rows[0];
    if (!header) return true;
    const idx = header.indexOf(col);
    if (idx === -1) return true;
    for (let r = 1; r < Math.min(rows.length, 10); r++) {
      const val = rows[r]?.[idx];
      if (val !== undefined && val !== "" && !Number.isNaN(Number(val))) {
        return true;
      }
    }
    return true;
  });

  // Determine categorical columns
  const categoricalColumns = columnNames.filter((col) => {
    const meta = dataset?.variables?.[col];
    if (meta) {
      return meta.type === "string" || meta.measure === "nominal" || meta.measure === "ordinal";
    }
    return true;
  });

  const hasLegend = supportsLegend(chartType);
  const hasBarMode = supportsBarMode(chartType);
  const hasErrorBars = supportsErrorBars(chartType);
  const isMeanAggregation = config.aggregation === "mean";
  const isAcademic = usesConfigAxes(chartType);

  const aggregationOptions: { value: AggregateFunction; labelKey: string }[] = [
    { value: "mean", labelKey: "presentationView.aggLabel.mean" },
    { value: "sum", labelKey: "presentationView.aggLabel.sum" },
    { value: "count", labelKey: "presentationView.aggLabel.count" },
    { value: "median", labelKey: "presentationView.aggLabel.median" },
    { value: "std", labelKey: "presentationView.aggLabel.std" },
    { value: "min", labelKey: "presentationView.aggLabel.min" },
    { value: "max", labelKey: "presentationView.aggLabel.max" },
  ];

  return (
    <aside
      className={`w-72 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col h-full text-xs overflow-y-auto ${className}`}
      data-testid="chart-inspector-panel"
    >
      {/* Header */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
        <SlidersHorizontal className="w-4 h-4 text-primary-600" />
        <span>{t("presentationView.inspectorTitle")}</span>
      </div>

      <div className="p-3 space-y-3">
        {isAcademic ? (
          <>
            {/* Accordion 1: Data & Axes */}
        <details
          open
          className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
        >
          <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
              {t("presentationView.accordionData")}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-900">
            {/* X Axis */}
            <div>
              <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                {t("presentationView.axisXLabel")}
              </label>
              <select
                data-testid="x-col-select"
                disabled={disabled || columnNames.length === 0}
                value={config.xCol}
                onChange={(e) => onChange({ xCol: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{t("presentationView.noneOption")}</option>
                {columnNames.map((col) => (
                  <option key={col} value={col}>
                    {getColDisplayName(col)}
                  </option>
                ))}
              </select>
            </div>

            {/* Y Axis */}
            <div>
              <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                {t("presentationView.axisYNumericLabel")}
              </label>
              <select
                data-testid="y-col-select"
                disabled={disabled || numericColumns.length === 0}
                value={config.yCol}
                onChange={(e) => onChange({ yCol: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{t("presentationView.noneOption")}</option>
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {getColDisplayName(col)}
                  </option>
                ))}
              </select>
            </div>

            {/* Aggregation - only for bar, barH, line when Y is selected */}
            {["bar", "barH", "line"].includes(chartType) && config.yCol && (
              <div>
                <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                  {t("presentationView.aggregationLabel")}
                </label>
                <select
                  data-testid="aggregation-select"
                  disabled={disabled}
                  value={config.aggregation}
                  onChange={(e) =>
                    onChange({ aggregation: e.target.value as AggregateFunction })
                  }
                  className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {aggregationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Legend (Grouping Field) - only for bar, line, scatter */}
            {hasLegend && (
              <div>
                <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                  {t("presentationView.legendLabel")}
                </label>
                <select
                  data-testid="legend-col-select"
                  disabled={disabled || categoricalColumns.length === 0}
                  value={config.legendCol}
                  onChange={(e) => onChange({ legendCol: e.target.value })}
                  className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">{t("presentationView.noneOption")}</option>
                  {categoricalColumns.map((col) => (
                    <option key={col} value={col}>
                      {getColDisplayName(col)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </details>

        {/* Accordion 2: Style & Palette */}
        <details
          open
          className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
        >
          <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
              {t("presentationView.accordionStyle")}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-900">
            {/* Bar Mode (clustered vs stacked) */}
            {hasBarMode && (
              <div>
                <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                  {t("presentationView.barModeLabel")}
                </label>
                <select
                  data-testid="bar-mode-select"
                  disabled={disabled}
                  value={config.barMode}
                  onChange={(e) => onChange({ barMode: e.target.value as BarMode })}
                  className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="clustered">
                    {t("presentationView.barModeClustered")}
                  </option>
                  <option value="stacked">
                    {t("presentationView.barModeStacked")}
                  </option>
                </select>
              </div>
            )}

            {/* Color Palette */}
            <div>
              <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                {t("presentationView.paletteLabel")}
              </label>
              <select
                data-testid="palette-select"
                disabled={disabled}
                value={config.palette}
                onChange={(e) =>
                  onChange({ palette: e.target.value as ColorPaletteName })
                }
                className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="academic">
                  {t("presentationView.paletteAcademic")}
                </option>
                <option value="colorblind">
                  {t("presentationView.paletteColorblind")}
                </option>
                <option value="grayscale">
                  {t("presentationView.paletteGrayscale")}
                </option>
              </select>

              {/* Swatch Preview */}
              <div className="flex items-center gap-1 mt-1.5 px-1">
                {PALETTES[config.palette]?.slice(0, 6).map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 inline-block"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Accordion 3: Error Bars - only for bar, barH, line */}
        {hasErrorBars && (
          <details
            open
            className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
          >
            <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-neutral-500" />
                {t("presentationView.accordionErrorBars")}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-3 space-y-2 bg-white dark:bg-neutral-900">
              <div>
                <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                  {t("presentationView.errorBarLabel")}
                </label>
                <select
                  data-testid="error-bar-select"
                  disabled={disabled || !isMeanAggregation}
                  value={config.errorBar}
                  onChange={(e) =>
                    onChange({ errorBar: e.target.value as ErrorBarType })
                  }
                  className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="none">{t("presentationView.errorBarNone")}</option>
                  <option value="ci95">{t("presentationView.errorBarCi95")}</option>
                  <option value="se">{t("presentationView.errorBarSe")}</option>
                  <option value="sd">{t("presentationView.errorBarSd")}</option>
                </select>
              </div>

              {!isMeanAggregation && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800/60 leading-tight">
                  {t("presentationView.errorBarMeanOnlyNotice")}
                </p>
              )}
            </div>
          </details>
        )}

        {/* Accordion 4: Labels & Typography */}
        <details
          open
          className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
        >
          <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
            <span className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-neutral-500" />
              {t("presentationView.accordionLabels")}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-900">
            {/* Custom Title Override */}
            <div>
              <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                {t("presentationView.titleOverrideLabel")}
              </label>
              <input
                type="text"
                data-testid="title-override-input"
                disabled={disabled}
                value={config.titleOverride}
                placeholder={t("presentationView.titleOverridePlaceholder")}
                onChange={(e) => onChange({ titleOverride: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Subtitle / Note */}
            <div>
              <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                {t("presentationView.subtitleLabel")}
              </label>
              <input
                type="text"
                data-testid="subtitle-input"
                disabled={disabled}
                value={config.subtitle}
                placeholder={t("presentationView.subtitlePlaceholder")}
                onChange={(e) => onChange({ subtitle: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Data Labels + Decimals */}
            <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  data-testid="show-data-labels-checkbox"
                  disabled={disabled}
                  checked={config.showDataLabels}
                  onChange={(e) => onChange({ showDataLabels: e.target.checked })}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {t("presentationView.showDataLabelsLabel")}
                </span>
              </label>

              {config.showDataLabels && (
                <div>
                  <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                    {t("presentationView.decimalsLabel")}
                  </label>
                  <select
                    data-testid="decimals-select"
                    disabled={disabled}
                    value={config.decimals}
                    onChange={(e) =>
                      onChange({ decimals: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </details>
          </>
        ) : (
          <>
            {/* Accordion 1: Data & Axes */}
            <details
              open
              className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
            >
              <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
                  {t("presentationView.accordionData")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-900">
                {/* Non-academic Data & Axes controls populated in Tasks 4-10 */}
                {chartType === "pie" && (
                  <>
                    <div>
                      <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                        {t("presentationView.axisXLabel")}
                      </label>
                      <select
                        data-testid="pie-x-col-select"
                        disabled={disabled || columnNames.length === 0}
                        value={controls.xCol}
                        onChange={(e) => onControlsChange({ xCol: e.target.value })}
                        className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">{t("presentationView.noneOption")}</option>
                        {columnNames.map((col) => (
                          <option key={col} value={col}>
                            {getColDisplayName(col)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                        {t("presentationView.axisYNumericLabel")}
                      </label>
                      <select
                        data-testid="pie-y-col-select"
                        disabled={disabled || numericColumns.length === 0}
                        value={controls.yCol}
                        onChange={(e) => onControlsChange({ yCol: e.target.value })}
                        className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">{t("presentationView.noneOption")}</option>
                        {numericColumns.map((col) => (
                          <option key={col} value={col}>
                            {getColDisplayName(col)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {chartType === "donut" && (
                  <div>
                    <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                      {t("presentationView.categoricalColumnLabel")}
                    </label>
                    <select
                      data-testid="donut-cat-col-select"
                      disabled={disabled || columnNames.length === 0}
                      value={controls.xCol}
                      onChange={(e) =>
                        onControlsChange({ xCol: e.target.value, pieBinNumeric: false })
                      }
                      className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">{t("presentationView.noneOption")}</option>
                      {columnNames.map((col) => (
                        <option key={col} value={col}>
                          {getColDisplayName(col)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </details>

            {/* Accordion 2: Options */}
            <details
              open
              className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
            >
              <summary className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                  {t("presentationView.accordionOptions")}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-3 space-y-2.5 bg-white dark:bg-neutral-900">
                {/* Non-academic Options controls populated in Tasks 4-10 */}
                {(chartType === "pie" || chartType === "donut") && (
                  <div className="space-y-2.5">
                    {chartType === "pie" && (
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs">
                        {t("presentationView.pieHint")}
                      </p>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        data-testid="pie-bin-numeric-checkbox"
                        disabled={disabled}
                        checked={controls.pieBinNumeric}
                        onChange={(e) =>
                          onControlsChange({ pieBinNumeric: e.target.checked })
                        }
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {t("presentationView.binNumericLabel")}
                      </span>
                    </label>

                    {controls.pieBinNumeric && (
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                            {t("presentationView.numericColumnLabel")}
                          </label>
                          <select
                            data-testid="pie-numeric-col-select"
                            disabled={disabled || numericColumns.length === 0}
                            value={controls.pieNumericCol}
                            onChange={(e) =>
                              onControlsChange({ pieNumericCol: e.target.value })
                            }
                            className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">{t("presentationView.noneOption")}</option>
                            {numericColumns.map((col) => (
                              <option key={col} value={col}>
                                {getColDisplayName(col)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                            {t("presentationView.binCountLabel")}
                          </label>
                          <select
                            data-testid="pie-bin-count-select"
                            disabled={disabled}
                            value={controls.pieBinCount}
                            onChange={(e) =>
                              onControlsChange({ pieBinCount: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            {[2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n} {t("presentationView.binCountUnit")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </aside>
  );
}
