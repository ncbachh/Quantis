import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartInspectorPanel } from "../ChartInspectorPanel";
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
});
