import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartInspectorPanel, usesConfigAxes, supportsAutoTitle } from "../ChartInspectorPanel";
import { setLocale, t } from "@/i18n";
import { DEFAULT_CHART_CONFIG, DEFAULT_CHART_CONTROLS, type Dataset, type ChartConfig } from "@/types";

describe("ChartInspectorPanel Component", () => {
  beforeEach(() => {
    setLocale("en");
  });

  const mockDataset: Dataset = {
    id: "ds_panel_test",
    name: "Survey Dataset",
    rows: 4,
    columns: 3,
    columnNames: ["Department", "Satisfaction", "Gender"],
    preview: [
      ["Department", "Satisfaction", "Gender"],
      ["HR", "4.2", "F"],
      ["Sales", "3.8", "M"],
    ],
    data: [
      ["Department", "Satisfaction", "Gender"],
      ["HR", "4.2", "F"],
      ["Sales", "3.8", "M"],
    ],
    variables: {
      Department: {
        name: "Department",
        label: "Phòng ban",
        type: "string",
        measure: "nominal",
        decimals: 0,
        align: "left",
      },
      Satisfaction: {
        name: "Satisfaction",
        label: "Mức độ hài lòng",
        type: "numeric",
        measure: "scale",
        decimals: 2,
        align: "right",
      },
      Gender: {
        name: "Gender",
        label: "Giới tính",
        type: "string",
        measure: "nominal",
        decimals: 0,
        align: "left",
      },
    },
    sourceFormat: "csv",
    createdAt: "2026-10-22",
    updatedAt: "2026-10-22",
  };

  const toHtmlEntities = (str: string) => str.replace(/&/g, "&amp;");

  it("renders all 4 accordion headers with i18n labels in English and Vietnamese", () => {
    setLocale("en");
    const htmlEn = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );

    expect(htmlEn).toContain(toHtmlEntities(t("presentationView.inspectorTitle")));
    expect(htmlEn).toContain(toHtmlEntities(t("presentationView.accordionData")));
    expect(htmlEn).toContain(toHtmlEntities(t("presentationView.accordionStyle")));
    expect(htmlEn).toContain(toHtmlEntities(t("presentationView.accordionErrorBars")));
    expect(htmlEn).toContain(toHtmlEntities(t("presentationView.accordionLabels")));

    setLocale("vi");
    const htmlVi = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );

    expect(htmlVi).toContain(toHtmlEntities(t("presentationView.inspectorTitle")));
    expect(htmlVi).toContain(toHtmlEntities(t("presentationView.accordionData")));
    expect(htmlVi).toContain(toHtmlEntities(t("presentationView.accordionStyle")));
    expect(htmlVi).toContain(toHtmlEntities(t("presentationView.accordionErrorBars")));
    expect(htmlVi).toContain(toHtmlEntities(t("presentationView.accordionLabels")));
  });

  it("shows Legend selector for bar, line, and scatter, but hides it for pie and heatmap", () => {
    // Bar chart: should have legend selector
    const htmlBar = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(htmlBar).toContain('data-testid="legend-col-select"');

    // Line chart: should have legend selector
    const htmlLine = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="line"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(htmlLine).toContain('data-testid="legend-col-select"');

    // Scatter chart: should have legend selector
    const htmlScatter = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="scatter"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(htmlScatter).toContain('data-testid="legend-col-select"');

    // Pie chart: should NOT have legend selector
    const htmlPie = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="pie"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(htmlPie).not.toContain('data-testid="legend-col-select"');

    // Heatmap chart: should NOT have legend selector
    const htmlHeatmap = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="heatmap"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(htmlHeatmap).not.toContain('data-testid="legend-col-select"');
  });

  it("disables error-bar type selector and shows notice when aggregation is not mean", () => {
    const configSum: ChartConfig = {
      ...DEFAULT_CHART_CONFIG,
      aggregation: "sum",
    };

    const html = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={configSum}
        onChange={() => {}}
      />
    );

    expect(html).toContain('data-testid="error-bar-select"');
    expect(html).toContain("disabled");
    expect(html).toContain(toHtmlEntities(t("presentationView.errorBarMeanOnlyNotice")));
  });

  it("enables error-bar type selector when aggregation is mean", () => {
    const configMean: ChartConfig = {
      ...DEFAULT_CHART_CONFIG,
      aggregation: "mean",
    };

    const html = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={configMean}
        onChange={() => {}}
      />
    );

    expect(html).toContain('data-testid="error-bar-select"');
    // Notice is not shown when mean
    expect(html).not.toContain(toHtmlEntities(t("presentationView.errorBarMeanOnlyNotice")));
  });

  it("defaults error-bar to 'none' (Off) in DEFAULT_CHART_CONFIG", () => {
    expect(DEFAULT_CHART_CONFIG.errorBar).toBe("none");
    const html = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );
    expect(html).toContain('data-testid="error-bar-select"');
    expect(html).toContain('<option value="none" selected=""');
  });

  it("renders variable labels in option elements alongside raw names", () => {
    const html = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="bar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        onChange={() => {}}
      />
    );

    expect(html).toContain("Mức độ hài lòng (Satisfaction)");
    expect(html).toContain("Phòng ban (Department)");
  });

  it("renders Data & Axes and Options accordions for non-academic charts, excluding academic accordions", () => {
    const nonAcademicCharts = ["pie", "donut", "histogram", "box", "heatmap", "area", "density", "radar"];

    for (const chartType of nonAcademicCharts) {
      const html = renderToStaticMarkup(
        <ChartInspectorPanel
          chartType={chartType}
          dataset={mockDataset}
          config={DEFAULT_CHART_CONFIG}
          onChange={() => {}}
        />
      );

      expect(html, `chartType ${chartType} should have accordionData`).toContain(
        toHtmlEntities(t("presentationView.accordionData"))
      );
      expect(html, `chartType ${chartType} should have accordionOptions`).toContain(
        toHtmlEntities(t("presentationView.accordionOptions"))
      );
      expect(html, `chartType ${chartType} should not have accordionStyle`).not.toContain(
        toHtmlEntities(t("presentationView.accordionStyle"))
      );
      expect(html, `chartType ${chartType} should not have accordionErrorBars`).not.toContain(
        toHtmlEntities(t("presentationView.accordionErrorBars"))
      );
      expect(html, `chartType ${chartType} should not have accordionLabels`).not.toContain(
        toHtmlEntities(t("presentationView.accordionLabels"))
      );
    }
  });

  it("renders pie and donut controls in panel", () => {
    // Pie: X + Y selectors in Data & Axes, bin numeric toggle in Options
    const htmlPie = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="pie"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={{ ...DEFAULT_CHART_CONTROLS, pieBinNumeric: true }}
        onChange={() => {}}
      />
    );
    expect(htmlPie).toContain('data-testid="pie-x-col-select"');
    expect(htmlPie).toContain('data-testid="pie-y-col-select"');
    expect(htmlPie).toContain('data-testid="pie-bin-numeric-checkbox"');
    expect(htmlPie).toContain('data-testid="pie-numeric-col-select"');
    expect(htmlPie).toContain('data-testid="pie-bin-count-select"');

    // Donut: categorical selector in Data & Axes, bin numeric in Options
    const htmlDonut = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="donut"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={{ ...DEFAULT_CHART_CONTROLS, pieBinNumeric: false }}
        onChange={() => {}}
      />
    );
    expect(htmlDonut).toContain('data-testid="donut-cat-col-select"');
    expect(htmlDonut).not.toContain('data-testid="pie-y-col-select"');
    expect(htmlDonut).toContain('data-testid="pie-bin-numeric-checkbox"');
    expect(htmlDonut).not.toContain('data-testid="pie-numeric-col-select"');
  });

  it("renders area chart X and Y selectors in panel", () => {
    const htmlArea = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="area"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={DEFAULT_CHART_CONTROLS}
        onChange={() => {}}
      />
    );
    expect(htmlArea).toContain('data-testid="area-x-col-select"');
    expect(htmlArea).toContain('data-testid="area-y-col-select"');
  });

  it("renders histogram distribution column and KDE overlay toggle in panel", () => {
    const htmlHist = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="histogram"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={{ ...DEFAULT_CHART_CONTROLS, showHistogramDensity: true }}
        onChange={() => {}}
      />
    );
    expect(htmlHist).toContain('data-testid="histogram-col-select"');
    expect(htmlHist).toContain('data-testid="histogram-kde-checkbox"');
  });

  it("renders box chart group and value variable selectors in panel", () => {
    const htmlBox = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="box"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={DEFAULT_CHART_CONTROLS}
        onChange={() => {}}
      />
    );
    expect(htmlBox).toContain('data-testid="box-group-col-select"');
    expect(htmlBox).toContain('data-testid="box-value-col-select"');
  });

  it("renders heatmap method buttons and CSV export in panel", () => {
    const htmlHeatmap = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="heatmap"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={{ ...DEFAULT_CHART_CONTROLS, heatmapCorrMethod: "pearson" }}
        onExportCsv={() => {}}
        onChange={() => {}}
      />
    );
    expect(htmlHeatmap).toContain('data-testid="heatmap-method-pearson"');
    expect(htmlHeatmap).toContain('data-testid="heatmap-method-spearman"');
    expect(htmlHeatmap).toContain('data-testid="heatmap-method-kendall"');
    expect(htmlHeatmap).toContain('data-testid="heatmap-export-csv-btn"');
  });

  it("renders density group and value selectors in panel", () => {
    const htmlDensity = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="density"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={DEFAULT_CHART_CONTROLS}
        onChange={() => {}}
      />
    );
    expect(htmlDensity).toContain('data-testid="density-group-col-select"');
    expect(htmlDensity).toContain('data-testid="density-value-col-select"');
  });

  it("renders radar group selector and numeric axes multi-select in panel", () => {
    const htmlRadar = renderToStaticMarkup(
      <ChartInspectorPanel
        chartType="radar"
        dataset={mockDataset}
        config={DEFAULT_CHART_CONFIG}
        controls={{ ...DEFAULT_CHART_CONTROLS, radarNumericCols: ["Satisfaction"] }}
        onChange={() => {}}
      />
    );
    expect(htmlRadar).toContain('data-testid="radar-group-col-select"');
    expect(htmlRadar).toContain('data-testid="radar-axis-checkbox-Satisfaction"');
    expect(htmlRadar).toContain(t("presentationView.numericAxesLabel"));
  });

  describe("Task 1: Axis Unification in Inspector", () => {
    it("restricts usesConfigAxes strictly to academic charts", () => {
      expect(usesConfigAxes("bar")).toBe(true);
      expect(usesConfigAxes("barH")).toBe(true);
      expect(usesConfigAxes("line")).toBe(true);
      expect(usesConfigAxes("scatter")).toBe(true);
      expect(usesConfigAxes("pie")).toBe(false);
      expect(usesConfigAxes("donut")).toBe(false);
      expect(usesConfigAxes("area")).toBe(false);
      expect(usesConfigAxes("box")).toBe(false);
      expect(usesConfigAxes("histogram")).toBe(false);
      expect(usesConfigAxes("heatmap")).toBe(false);
      expect(usesConfigAxes("density")).toBe(false);
      expect(usesConfigAxes("radar")).toBe(false);
    });

    it("binds pie, donut, area, and box X/Y selectors to chartConfig xCol and yCol", () => {
      const configWithAxes: ChartConfig = {
        ...DEFAULT_CHART_CONFIG,
        xCol: "Department",
        yCol: "Satisfaction",
      };

      // Pie chart
      const htmlPie = renderToStaticMarkup(
        <ChartInspectorPanel
          chartType="pie"
          dataset={mockDataset}
          config={configWithAxes}
          controls={DEFAULT_CHART_CONTROLS}
          onChange={() => {}}
        />
      );
      expect(htmlPie).toContain('data-testid="pie-x-col-select"');
      expect(htmlPie).toContain('data-testid="pie-y-col-select"');
      expect(htmlPie).toMatch(/<select[^>]*data-testid="pie-x-col-select"[^>]*>[\s\S]*?<option[^>]*value="Department"[^>]*selected=""/);
      expect(htmlPie).toMatch(/<select[^>]*data-testid="pie-y-col-select"[^>]*>[\s\S]*?<option[^>]*value="Satisfaction"[^>]*selected=""/);

      // Donut chart
      const htmlDonut = renderToStaticMarkup(
        <ChartInspectorPanel
          chartType="donut"
          dataset={mockDataset}
          config={configWithAxes}
          controls={DEFAULT_CHART_CONTROLS}
          onChange={() => {}}
        />
      );
      expect(htmlDonut).toContain('data-testid="donut-cat-col-select"');
      expect(htmlDonut).toMatch(/<select[^>]*data-testid="donut-cat-col-select"[^>]*>[\s\S]*?<option[^>]*value="Department"[^>]*selected=""/);

      // Area chart
      const htmlArea = renderToStaticMarkup(
        <ChartInspectorPanel
          chartType="area"
          dataset={mockDataset}
          config={configWithAxes}
          controls={DEFAULT_CHART_CONTROLS}
          onChange={() => {}}
        />
      );
      expect(htmlArea).toContain('data-testid="area-x-col-select"');
      expect(htmlArea).toContain('data-testid="area-y-col-select"');
      expect(htmlArea).toMatch(/<select[^>]*data-testid="area-x-col-select"[^>]*>[\s\S]*?<option[^>]*value="Department"[^>]*selected=""/);
      expect(htmlArea).toMatch(/<select[^>]*data-testid="area-y-col-select"[^>]*>[\s\S]*?<option[^>]*value="Satisfaction"[^>]*selected=""/);

      // Box plot
      const htmlBox = renderToStaticMarkup(
        <ChartInspectorPanel
          chartType="box"
          dataset={mockDataset}
          config={configWithAxes}
          controls={DEFAULT_CHART_CONTROLS}
          onChange={() => {}}
        />
      );
      expect(htmlBox).toContain('data-testid="box-group-col-select"');
      expect(htmlBox).toContain('data-testid="box-value-col-select"');
      expect(htmlBox).toMatch(/<select[^>]*data-testid="box-group-col-select"[^>]*>[\s\S]*?<option[^>]*value="Department"[^>]*selected=""/);
      expect(htmlBox).toMatch(/<select[^>]*data-testid="box-value-col-select"[^>]*>[\s\S]*?<option[^>]*value="Satisfaction"[^>]*selected=""/);
    });

    it("verifies supportsAutoTitle returns true for all 12 reachable charts", () => {
      const all12Charts = [
        "bar", "barH", "line", "scatter",
        "pie", "donut", "histogram", "box",
        "heatmap", "area", "density", "radar"
      ];
      for (const ct of all12Charts) {
        expect(supportsAutoTitle(ct), `${ct} should support auto title`).toBe(true);
      }
      expect(supportsAutoTitle("unsupported_chart")).toBe(false);
    });
  });
});
