import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PresentationView } from "../PresentationView";
import { setLocale, t } from "@/i18n";
import type { Dataset } from "@/types";

// Mock recharts components for renderToStaticMarkup SSR testing
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
    BarChart: ({ children, data }: any) => (
      <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
    XAxis: ({ domain, ticks, type, dataKey }: any) => (
      <div
        data-testid="x-axis"
        data-type={type}
        data-key={dataKey}
        data-domain={domain ? JSON.stringify(domain) : undefined}
        data-ticks={ticks ? JSON.stringify(ticks) : undefined}
      />
    ),
    YAxis: ({ domain, ticks, dataKey }: any) => (
      <div
        data-testid="y-axis"
        data-key={dataKey}
        data-domain={domain ? JSON.stringify(domain) : undefined}
        data-ticks={ticks ? JSON.stringify(ticks) : undefined}
      />
    ),
    CartesianGrid: () => null,
    Legend: () => null,
    Tooltip: () => <div data-testid="tooltip" />,
    Bar: ({ name, dataKey, stackId, children }: any) => (
      <div data-testid="bar-series" data-name={name} data-key={dataKey} data-stack-id={stackId}>
        {name}
        {children}
      </div>
    ),
    Line: ({ name, dataKey, children }: any) => (
      <div data-testid="line-series" data-name={name} data-key={dataKey}>
        {name}
        {children}
      </div>
    ),
    Scatter: ({ name, data }: any) => (
      <div data-testid="scatter-series" data-name={name} data-points={JSON.stringify(data)}>
        {name}
      </div>
    ),
    Pie: () => null,
    LabelList: ({ dataKey, position }: any) => (
      <div data-testid="label-list" data-key={dataKey} data-position={position} />
    ),
    ErrorBar: ({ dataKey, direction }: any) => (
      <div data-testid="error-bar" data-error-key={dataKey} data-direction={direction} />
    ),
  };
});

describe("PresentationView Component — Aggregation Integration", () => {
  const sampleDataset: Dataset = {
    id: "ds_pres_test",
    name: "Survey Scores",
    rows: 4,
    columns: 2,
    columnNames: ["Department", "Score"],
    preview: [
      ["Department", "Score"],
      ["Sales", "10"],
      ["Sales", "20"],
      ["Marketing", "30"],
      ["Marketing", "40"],
    ],
    data: [
      ["Department", "Score"],
      ["Sales", "10"],
      ["Sales", "20"],
      ["Marketing", "30"],
      ["Marketing", "40"],
    ],
    variables: {
      Department: {
        name: "Department",
        label: "Department",
        type: "string",
        measure: "nominal",
        decimals: 0,
        align: "left",
      },
      Score: {
        name: "Score",
        label: "Score",
        type: "numeric",
        measure: "scale",
        decimals: 2,
        align: "right",
      },
    },
    sourceFormat: "csv",
    createdAt: "2026-10-21T00:00:00Z",
    updatedAt: "2026-10-21T00:00:00Z",
  };

  const groupedDataset: Dataset = {
    id: "ds_pres_grouped",
    name: "Survey Scores by Gender",
    rows: 4,
    columns: 4,
    columnNames: ["Department", "Score", "Age", "Gender"],
    preview: [
      ["Department", "Score", "Age", "Gender"],
      ["Sales", "10", "25", "F"],
      ["Sales", "20", "30", "M"],
      ["Marketing", "30", "35", "F"],
      ["Marketing", "40", "40", "M"],
    ],
    data: [
      ["Department", "Score", "Age", "Gender"],
      ["Sales", "10", "25", "F"],
      ["Sales", "20", "30", "M"],
      ["Marketing", "30", "35", "F"],
      ["Marketing", "40", "40", "M"],
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
      Score: {
        name: "Score",
        label: "Điểm số",
        type: "numeric",
        measure: "scale",
        decimals: 2,
        align: "right",
      },
      Age: {
        name: "Age",
        label: "Độ tuổi",
        type: "numeric",
        measure: "scale",
        decimals: 0,
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
    createdAt: "2026-10-21T00:00:00Z",
    updatedAt: "2026-10-21T00:00:00Z",
  };

  const defaultProps = {
    tab: "visualization" as const,
    selectedDataset: sampleDataset,
    chartType: "bar" as const,
    setChartType: () => {},
  };

  beforeEach(() => {
    setLocale("en");
  });

  it("does not render aggregation dropdown when Y axis is not selected (frequency count path)", () => {
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol=""
      />
    );

    // Label for aggregation should not be present
    expect(html).not.toContain(t("presentationView.aggregationLabel"));
    expect(html).not.toContain('value="median"');
    // Bar series name should be the default Count label
    expect(html).toContain(t("presentationView.barCountLabel"));

    // Frequency count data: Marketing = 2, Sales = 2
    expect(html).toContain('&quot;name&quot;:&quot;Sales&quot;,&quot;count&quot;:2');
    expect(html).toContain('&quot;name&quot;:&quot;Marketing&quot;,&quot;count&quot;:2');
  });

  it("renders aggregation dropdown with all 7 options when numeric Y is selected on Bar chart", () => {
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="mean"
      />
    );

    expect(html).toContain(t("presentationView.aggregationLabel"));
    expect(html).toContain('value="mean"');
    expect(html).toContain('value="sum"');
    expect(html).toContain('value="count"');
    expect(html).toContain('value="median"');
    expect(html).toContain('value="std"');
    expect(html).toContain('value="min"');
    expect(html).toContain('value="max"');

    // Dynamic legend label with default Mean
    expect(html).toContain("Mean of Score");

    // Aggregated data: Marketing mean = 35, Sales mean = 15
    expect(html).toContain('&quot;name&quot;:&quot;Sales&quot;,&quot;count&quot;:15');
    expect(html).toContain('&quot;name&quot;:&quot;Marketing&quot;,&quot;count&quot;:35');
    // Check that metrics are attached to each datum
    expect(html).toContain('&quot;metrics&quot;:{');
  });

  it("updates legend label and aggregated values when a different aggregation function is selected", () => {
    const htmlSum = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="sum"
      />
    );
    expect(htmlSum).toContain("Sum of Score");
    // Marketing sum: 30 + 40 = 70; Sales sum: 10 + 20 = 30
    expect(htmlSum).toContain('&quot;name&quot;:&quot;Marketing&quot;,&quot;count&quot;:70');
    expect(htmlSum).toContain('&quot;name&quot;:&quot;Sales&quot;,&quot;count&quot;:30');

    const htmlStd = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="std"
      />
    );
    expect(htmlStd).toContain("Std Dev of Score");
  });

  it("supports Y selector and aggregation dropdown on Horizontal Bar (barH) chart", () => {
    // When no Y selected on barH, aggregation select should be absent, but Y axis select is present
    const htmlNoY = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="barH"
        initialXCol="Department"
        initialYCol=""
      />
    );
    expect(htmlNoY).toContain(t("presentationView.axisYNumericLabel"));
    expect(htmlNoY).not.toContain(t("presentationView.aggregationLabel"));

    // When Y is selected on barH, aggregation select is rendered
    const htmlWithY = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="barH"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="median"
      />
    );
    expect(htmlWithY).toContain(t("presentationView.aggregationLabel"));
    expect(htmlWithY).toContain("Median of Score");
    expect(htmlWithY).toContain('&quot;name&quot;:&quot;Marketing&quot;,&quot;count&quot;:35');
  });

  it("supports aggregation on Line chart when Y is selected", () => {
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="line"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="mean"
      />
    );

    expect(html).toContain(t("presentationView.aggregationLabel"));
    expect(html).toContain("Mean of Score");
    expect(html).toContain('&quot;x&quot;:&quot;Marketing&quot;,&quot;y&quot;:35');
    expect(html).toContain('&quot;x&quot;:&quot;Sales&quot;,&quot;y&quot;:15');
  });

  it("does not render aggregation dropdown on other chart types like scatter", () => {
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="scatter"
        initialXCol="Score"
        initialYCol="Score"
      />
    );

    expect(html).not.toContain(t("presentationView.aggregationLabel"));
  });

  it("renders correctly in Vietnamese locale", () => {
    setLocale("vi");
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="mean"
      />
    );

    expect(html).toContain("Phép gộp");
    expect(html).toContain("Trung bình của Score");
  });

  it("carries full metrics in data objects for enhanced tooltip rendering", () => {
    const html = renderToStaticMarkup(
      <PresentationView
        {...defaultProps}
        chartType="bar"
        initialXCol="Department"
        initialYCol="Score"
        initialYAggregation="mean"
      />
    );

    expect(html).toContain('&quot;count&quot;:2');
    expect(html).toContain('&quot;ci95Lower&quot;:');
    expect(html).toContain('&quot;ci95Upper&quot;:');
  });

  describe("Legend and Multi-series Integration", () => {
    it("renders N series on Bar chart when legendCol is configured (clustered default)", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
            barMode: "clustered",
          }}
        />
      );

      // Should render a Bar element for each distinct gender value: F and M
      expect(html).toContain('data-key="F"');
      expect(html).toContain('data-key="M"');
      // In clustered mode, stackId is not set
      expect(html).not.toContain('data-stack-id="stack"');
    });

    it("applies stackId on Bar chart when barMode is stacked", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
            barMode: "stacked",
          }}
        />
      );

      expect(html).toContain('data-key="F"');
      expect(html).toContain('data-key="M"');
      expect(html).toContain('data-stack-id="stack"');
    });

    it("renders N lines on Line chart when legendCol is configured", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="line"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
          }}
        />
      );

      expect(html).toContain('data-testid="line-series" data-name="F"');
      expect(html).toContain('data-testid="line-series" data-name="M"');
    });

    it("renders N scatters on Scatter chart when legendCol is configured", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="scatter"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Score",
            yCol: "Age",
            legendCol: "Gender",
          }}
        />
      );

      expect(html).toContain('data-testid="scatter-series" data-name="F"');
      expect(html).toContain('data-testid="scatter-series" data-name="M"');
    });

    it("renders clustered Bar chart for categorical frequency count when legendCol is configured without yCol", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "",
            legendCol: "Gender",
            barMode: "clustered",
          }}
        />
      );

      expect(html).toContain('data-key="F"');
      expect(html).toContain('data-key="M"');
      expect(html).toContain('data-testid="bar-chart"');
    });
  });

  describe("Error Bars on Academic Charts", () => {
    it("renders ErrorBar inside Bar when aggregation is mean and errorBar is ci95 (single series)", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      expect(html).toContain('data-testid="error-bar"');
      expect(html).toContain('data-error-key="error"');
      expect(html).toContain('data-direction="y"');
    });

    it("does not render ErrorBar when aggregation is not mean (e.g. sum)", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "sum",
            errorBar: "ci95",
          }}
        />
      );

      expect(html).not.toContain('data-testid="error-bar"');
    });

    it("does not render ErrorBar when errorBar is none", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "none",
          }}
        />
      );

      expect(html).not.toContain('data-testid="error-bar"');
    });

    it("renders per-series ErrorBar for grouped Bar chart when legendCol is configured", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
            aggregation: "mean",
            errorBar: "se",
          }}
        />
      );

      expect(html).toContain('data-error-key="_err_F"');
      expect(html).toContain('data-error-key="_err_M"');
      expect(html).toContain('data-direction="y"');
    });

    it("renders ErrorBar with direction x on horizontal bar (barH)", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="barH"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "sd",
          }}
        />
      );

      expect(html).toContain('data-testid="error-bar"');
      expect(html).toContain('data-error-key="error"');
      expect(html).toContain('data-direction="x"');
    });

    it("renders ErrorBar inside Line series when aggregation is mean", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="line"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      expect(html).toContain('data-testid="error-bar"');
      expect(html).toContain('data-error-key="_err_F"');
      expect(html).toContain('data-error-key="_err_M"');
      expect(html).toContain('data-direction="y"');
    });
  });

  describe("Smart Typography and Data Labels", () => {
    it("generates auto title inheriting Variable Label for aggregated chart", () => {
      const datasetWithLabels: Dataset = {
        ...sampleDataset,
        variables: {
          ...sampleDataset.variables,
          Score: {
            ...sampleDataset.variables!.Score,
            label: "Customer Satisfaction",
          },
        },
      };

      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={datasetWithLabels}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
          }}
        />
      );

      expect(html).toContain('data-testid="chart-title"');
      expect(html).toContain("Mean of Customer Satisfaction by Department");
    });

    it("includes Legend variable label in auto title when grouped", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={groupedDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            legendCol: "Gender",
            aggregation: "mean",
          }}
        />
      );

      expect(html).toContain('data-testid="chart-title"');
      expect(html).toContain("Mean of Điểm số by Phòng ban and Giới tính");
    });

    it("respects titleOverride and renders subtitle", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            titleOverride: "Custom Publication Title",
            subtitle: "Note: Error bars represent 95% CI (n = 350)",
          }}
        />
      );

      expect(html).toContain('data-testid="chart-title"');
      expect(html).toContain("Custom Publication Title");
      expect(html).not.toContain("Mean of Score by Department");
      expect(html).toContain('data-testid="chart-subtitle"');
      expect(html).toContain("Note: Error bars represent 95% CI (n = 350)");
    });

    it("renders LabelList when showDataLabels is true", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            showDataLabels: true,
          }}
        />
      );

      expect(html).toContain('data-testid="label-list"');
      expect(html).toContain('data-key="count"');
      expect(html).toContain('data-position="top"');
    });

    it("does not render LabelList when showDataLabels is false", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            showDataLabels: false,
          }}
        />
      );

      expect(html).not.toContain('data-testid="label-list"');
    });
  });

  describe("Error Bar & Academic Axis Scaling", () => {
    it("expands YAxis domain ceiling with headroom on vertical Bar chart with error bars", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      // In sampleDataset: Sales mean = 15, Marketing mean = 35.
      // With CI95 error bars, domain ceiling must be strictly greater than max bar value (35).
      expect(html).toContain('data-testid="y-axis"');
      const domainMatch = html.match(/data-testid="y-axis"[^>]*data-domain="([^"]+)"/);
      expect(domainMatch).not.toBeNull();
      const domain = JSON.parse(domainMatch![1].replace(/&quot;/g, '"'));
      expect(domain[0]).toBe(0);
      expect(domain[1]).toBeGreaterThan(35);
    });

    it("attaches error property to single-series barChartData and renders ErrorBar", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      // Check bar chart data has error property
      const chartDataMatch = html.match(/data-testid="bar-chart"[^>]*data-chart-data="([^"]+)"/);
      expect(chartDataMatch).not.toBeNull();
      const chartData = JSON.parse(chartDataMatch![1].replace(/&quot;/g, '"'));
      expect(chartData.length).toBe(2);
      expect(chartData[0].error).toBeDefined();
      expect(Array.isArray(chartData[0].error)).toBe(true);

      // ErrorBar rendered
      expect(html).toContain('data-testid="error-bar"');
      expect(html).toContain('data-error-key="error"');
      expect(html).toContain('data-direction="y"');
    });

    it("expands XAxis domain ceiling with headroom on Horizontal Bar (barH) chart", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="barH"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Department",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      expect(html).toContain('data-testid="x-axis"');
      const domainMatch = html.match(/data-testid="x-axis"[^>]*data-domain="([^"]+)"/);
      expect(domainMatch).not.toBeNull();
      const domain = JSON.parse(domainMatch![1].replace(/&quot;/g, '"'));
      expect(domain[0]).toBe(0);
      expect(domain[1]).toBeGreaterThan(35);
    });

    it("expands YAxis domain ceiling on multi-series clustered Bar chart (user reported bug reproduction)", () => {
      const multiDataset: Dataset = {
        id: "ds_multi_error_test",
        name: "Survey",
        rows: 4,
        columns: 3,
        columnNames: ["Name", "Group", "Score"],
        preview: [
          ["Name", "Group", "Score"],
          ["A", "G1", "1.5"],
          ["A", "G1", "1.5"],
          ["A", "G2", "2.0"],
          ["A", "G2", "2.0"],
        ],
        data: [
          ["Name", "Group", "Score"],
          ["A", "G1", "1.5"],
          ["A", "G1", "1.5"],
          ["A", "G2", "2.0"],
          ["A", "G2", "2.0"],
        ],
        variables: {
          Name: { name: "Name", label: "Name", type: "string", measure: "nominal", decimals: 0, align: "left" },
          Group: { name: "Group", label: "Group", type: "string", measure: "nominal", decimals: 0, align: "left" },
          Score: { name: "Score", label: "Score", type: "numeric", measure: "scale", decimals: 2, align: "right" },
        },
        sourceFormat: "csv",
        createdAt: "2026-10-22",
        updatedAt: "2026-10-22",
      };

      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={multiDataset}
          chartType="bar"
          setChartType={() => {}}
          initialConfig={{
            xCol: "Name",
            legendCol: "Group",
            yCol: "Score",
            aggregation: "mean",
            errorBar: "ci95",
          }}
        />
      );

      const domainMatch = html.match(/data-testid="y-axis"[^>]*data-domain="([^"]+)"/);
      expect(domainMatch).not.toBeNull();
      const domain = JSON.parse(domainMatch![1].replace(/&quot;/g, '"'));
      expect(domain[0]).toBe(0);
      // Even though highest bar is 2.0, ceiling must expand (e.g. 2.5) to provide breathing room
      expect(domain[1]).toBeGreaterThan(2.0);
    });
  });

  describe("Chart Inspector Panel Mounting", () => {
    it("renders the inspector toggle button and panel for non-academic chart types", () => {
      const nonAcademicCharts = ["pie", "donut", "histogram", "box", "heatmap", "area", "density", "radar"];

      for (const chartType of nonAcademicCharts) {
        const html = renderToStaticMarkup(
          <PresentationView
            tab="visualization"
            selectedDataset={sampleDataset}
            chartType={chartType}
            setChartType={() => {}}
          />
        );

        expect(html, `chartType ${chartType} should have inspector toggle button`).toContain('data-testid="inspector-toggle-btn"');
        expect(html, `chartType ${chartType} should render chart inspector panel`).toContain('data-testid="chart-inspector-panel"');
      }
    });

    it("does not render inline toolbar blocks for pie and donut", () => {
      for (const chartType of ["pie", "donut"]) {
        const html = renderToStaticMarkup(
          <PresentationView
            tab="visualization"
            selectedDataset={sampleDataset}
            chartType={chartType}
            setChartType={() => {}}
          />
        );
        const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
        expect(toolbarPart).not.toContain(t("presentationView.pieHint"));
        expect(toolbarPart).not.toContain(t("presentationView.binNumericLabel"));
        expect(toolbarPart).not.toContain(t("presentationView.categoricalColumnLabel"));
      }
    });

    it("does not render inline toolbar blocks for area", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="area"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.axisYNumericLabel"));
    });

    it("does not render inline toolbar blocks for histogram", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="histogram"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.distributionColumnLabel"));
      expect(toolbarPart).not.toContain(t("presentationView.showKdeLabel"));
    });

    it("does not render inline toolbar blocks for box", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="box"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.groupVarXLabel"));
      expect(toolbarPart).not.toContain(t("presentationView.numericVarYLabel"));
    });

    it("does not render inline toolbar blocks for heatmap", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="heatmap"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.coefficientLabel"));
      expect(toolbarPart).not.toContain(t("presentationView.exportCsvButton"));
    });

    it("does not render inline toolbar blocks for density", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="density"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.densityGroupLabel"));
      expect(toolbarPart).not.toContain(t("presentationView.densityValueLabel"));
    });

    it("does not render inline toolbar blocks for radar", () => {
      const html = renderToStaticMarkup(
        <PresentationView
          tab="visualization"
          selectedDataset={sampleDataset}
          chartType="radar"
          setChartType={() => {}}
        />
      );
      const [toolbarPart] = html.split('data-testid="chart-inspector-panel"');
      expect(toolbarPart).not.toContain(t("presentationView.groupColumnOptionalLabel"));
      expect(toolbarPart).not.toContain(t("presentationView.numericAxesLabel"));
    });
  });
});
