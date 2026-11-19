"use client";

import { useEffect, useRef } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type Plugin,
} from "chart.js";
import { formatCompactIDR, formatIDR } from "@/lib/format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
);

export interface TreasuryChartPoint {
  key: string;
  axisLabel: string;
  tooltipTitle: string;
  income: number;
  expense: number;
}

function netValues(points: TreasuryChartPoint[]): number[] {
  return points.map((p) => p.income - p.expense);
}

function pointRadii(points: TreasuryChartPoint[], activeKey?: string): number[] {
  return points.map((p) => (p.key === activeKey ? 6 : 3.5));
}

function pointFillColors(
  points: TreasuryChartPoint[],
  activeKey?: string,
): string[] {
  return points.map((p) => {
    if (p.key !== activeKey) return "#ffffff";
    return p.income - p.expense >= 0 ? "#2f8f7b" : "#d97b78";
  });
}

function pointStrokeColors(points: TreasuryChartPoint[]): string[] {
  return points.map((p) => (p.income - p.expense >= 0 ? "#2f8f7b" : "#d97b78"));
}

export function TreasurySplineChart({
  points,
  activeKey,
  onSelectPoint,
}: {
  points: TreasuryChartPoint[];
  activeKey?: string;
  onSelectPoint: (key: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const pointsRef = useRef<TreasuryChartPoint[]>(points);
  const activeKeyRef = useRef<string | undefined>(activeKey);
  const onSelectPointRef = useRef(onSelectPoint);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  useEffect(() => {
    onSelectPointRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const crosshairPlugin: Plugin<"line"> = {
      id: "treasuryNetCrosshair",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;

        // Draw dashed zero baseline when 0 falls inside the plot area
        const yScale = scales.y;
        if (yScale) {
          const zeroY = yScale.getPixelForValue(0);
          if (zeroY >= chartArea.top && zeroY <= chartArea.bottom) {
            ctx.save();
            ctx.strokeStyle = "#9db9d4";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(chartArea.left, zeroY);
            ctx.lineTo(chartArea.right, zeroY);
            ctx.stroke();
            ctx.restore();
          }
        }

        const hovered = chart.getActiveElements()[0]?.element;
        if (hovered) {
          ctx.save();
          ctx.strokeStyle = "#589edb";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(hovered.x, chartArea.top);
          ctx.lineTo(hovered.x, chartArea.bottom);
          ctx.stroke();
          ctx.restore();
        }

        const selectedKey = activeKeyRef.current;
        if (!selectedKey) return;
        const selectedIdx = pointsRef.current.findIndex(
          (point) => point.key === selectedKey,
        );
        if (selectedIdx < 0) return;

        const selectedPoint = chart.getDatasetMeta(0).data[selectedIdx];
        if (!selectedPoint) return;

        ctx.save();
        ctx.strokeStyle = "#204a74";
        ctx.lineWidth = 1.25;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(selectedPoint.x, chartArea.top);
        ctx.lineTo(selectedPoint.x, chartArea.bottom);
        ctx.stroke();
        ctx.restore();
      },
    };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: pointsRef.current.map((p) => p.axisLabel),
        datasets: [
          {
            label: "Net cashflow",
            data: netValues(pointsRef.current),
            borderColor: "#337fc4",
            backgroundColor: "#337fc4",
            fill: {
              target: "origin",
              above: "rgba(47, 143, 123, 0.10)",
              below: "rgba(217, 123, 120, 0.10)",
            },
            tension: 0.38,
            cubicInterpolationMode: "monotone",
            borderWidth: 2.5,
            pointRadius: pointRadii(pointsRef.current, activeKeyRef.current),
            pointBackgroundColor: pointFillColors(
              pointsRef.current,
              activeKeyRef.current,
            ),
            pointBorderColor: pointStrokeColors(pointsRef.current),
            pointBorderWidth: 2,
            pointHoverRadius: 6.5,
            pointHoverBackgroundColor: pointStrokeColors(pointsRef.current),
            pointHoverBorderColor: "#ffffff",
            pointHoverBorderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 250 },
        interaction: {
          mode: "index",
          intersect: false,
        },
        layout: {
          padding: { top: 8, right: 10, left: 2, bottom: 2 },
        },
        onClick(event, elements, chart) {
          const hit =
            elements[0] ??
            (event.native
              ? chart.getElementsAtEventForMode(
                  event.native,
                  "index",
                  { intersect: false },
                  false,
                )[0]
              : undefined);
          if (!hit) return;
          const point = pointsRef.current[hit.index];
          if (point) onSelectPointRef.current(point.key);
        },
        onHover(event, elements) {
          const target = event.native?.target;
          if (target instanceof HTMLCanvasElement) {
            target.style.cursor = elements.length > 0 ? "pointer" : "default";
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#173b66f2",
            borderColor: "#356699",
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleColor: "#ffffff",
            titleFont: { size: 13, weight: "bold" },
            titleMarginBottom: 8,
            bodySpacing: 5,
            bodyFont: { size: 11, weight: "bold" },
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            callbacks: {
              title(items) {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return "";
                return pointsRef.current[idx]?.tooltipTitle ?? "";
              },
              label(ctx) {
                const net = Number(ctx.parsed.y ?? 0);
                const sign = net > 0 ? "+" : net < 0 ? "−" : "";
                return ` Net Flow: ${sign}${formatIDR(Math.abs(net))}`;
              },
              labelTextColor(ctx) {
                const net = Number(ctx.parsed.y ?? 0);
                return net >= 0 ? "#6ee7b7" : "#fca5a5";
              },
              afterLabel(ctx) {
                const pt = pointsRef.current[ctx.dataIndex];
                if (!pt) return [];
                return [
                  `   Income: +${formatIDR(pt.income)}`,
                  `   Spent: −${formatIDR(pt.expense)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            border: {
              display: true,
              dash: [4, 4],
              color: "#cfe2f3",
            },
            grid: {
              color: "#e3eef9",
              tickColor: "#cfe2f3",
              tickLength: 5,
            },
            ticks: {
              color: "#5d7f9d",
              font: { size: 11, weight: 700 },
              padding: 4,
            },
          },
          y: {
            afterDataLimits(axis) {
              if (axis.min === 0 && axis.max === 0) {
                axis.min = -50_000;
                axis.max = 50_000;
              }
            },
            border: {
              display: true,
              dash: [4, 4],
              color: "#cfe2f3",
            },
            grid: {
              color: "#e3eef9",
              tickColor: "#cfe2f3",
              tickLength: 5,
            },
            ticks: {
              maxTicksLimit: 5,
              color: "#5d7f9d",
              font: { size: 10, weight: 700 },
              padding: 6,
              callback(value) {
                return formatCompactIDR(Number(value));
              },
            },
          },
        },
      },
      plugins: [crosshairPlugin],
    };

    const chart = new ChartJS(canvas, config);
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.data.labels = points.map((p) => p.axisLabel);

    const netDs = chart.data.datasets[0];
    if (netDs) {
      const strokeColors = pointStrokeColors(points);
      netDs.data = netValues(points);
      netDs.pointRadius = pointRadii(points, activeKey);
      netDs.pointBackgroundColor = pointFillColors(points, activeKey);
      netDs.pointBorderColor = strokeColors;
      netDs.pointHoverBackgroundColor = strokeColors;
    }

    chart.update();
  }, [points, activeKey]);

  return (
    <div>
      <div className="relative h-[260px] w-full max-[600px]:h-[220px]">
        <canvas
          ref={canvasRef}
          aria-label="Net cashflow line chart (income minus spent)"
          role="img"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-[#337fc4]">
          <span className="relative inline-flex w-5 items-center justify-center">
            <span className="h-[2px] w-full bg-[#337fc4]" />
            <span className="absolute size-2 rounded-full border-2 border-[#337fc4] bg-white" />
          </span>
          Net cashflow (Income − Spent)
        </span>
      </div>
    </div>
  );
}
