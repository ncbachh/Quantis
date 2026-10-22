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
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Legend: () => null,
    Tooltip: () => <div data-testid="tooltip" />,
    Bar: ({ name, dataKey, stackId }: any) => (
      <div data-testid="bar-series" data-name={name} data-key={dataKey} data-stack-id={stackId}>
        {name}
      </div>
    ),
    Line: ({ name, dataKey }: any) => (
      <div data-testid="line-series" data-name={name} data-key={dataKey}>
        {name}
      </div>
    ),
    Scatter: ({ name, data }: any) => (
      <div data-testid="scatter-series" data-name={name} data-points={JSON.stringify(data)}>
        {name}
      </div>
    ),
    Pie: () => null,
    ErrorBar: () => null,
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
  });
});
