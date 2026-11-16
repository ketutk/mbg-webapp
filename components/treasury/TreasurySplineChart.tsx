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

function pointRadii(points: TreasuryChartPoint[], activeKey?: string): number[] {
  return points.map((p) => (p.key === activeKey ? 6 : 3.5));
}

function pointColors(
  points: TreasuryChartPoint[],
  activeColor: string,
  activeKey?: string,
): string[] {
  return points.map((p) => (p.key === activeKey ? activeColor : "#ffffff"));
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
      id: "treasuryCrosshair",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

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
            label: "Income",
            data: pointsRef.current.map((p) => p.income),
            borderColor: "#2f8f7b",
            backgroundColor: "#2f8f7b",
            tension: 0.38,
            cubicInterpolationMode: "monotone",
            borderWidth: 2.25,
            pointRadius: pointRadii(pointsRef.current, activeKeyRef.current),
            pointBackgroundColor: pointColors(
              pointsRef.current,
              "#2f8f7b",
              activeKeyRef.current,
            ),
            pointBorderColor: "#2f8f7b",
            pointBorderWidth: 2,
            pointHoverRadius: 6.5,
            pointHoverBackgroundColor: "#2f8f7b",
            pointHoverBorderColor: "#ffffff",
            pointHoverBorderWidth: 2.5,
          },
          {
            label: "Spent",
            data: pointsRef.current.map((p) => p.expense),
            borderColor: "#d97b78",
            backgroundColor: "#d97b78",
            tension: 0.38,
            cubicInterpolationMode: "monotone",
            borderWidth: 2.25,
            pointRadius: pointRadii(pointsRef.current, activeKeyRef.current),
            pointBackgroundColor: pointColors(
              pointsRef.current,
              "#d97b78",
              activeKeyRef.current,
            ),
            pointBorderColor: "#d97b78",
            pointBorderWidth: 2,
            pointHoverRadius: 6.5,
            pointHoverBackgroundColor: "#d97b78",
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
            bodySpacing: 6,
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
                const val = Number(ctx.parsed.y ?? 0);
                return ` ${ctx.dataset.label}: ${formatIDR(val)}`;
              },
              labelTextColor(ctx) {
                return ctx.datasetIndex === 0 ? "#6ee7b7" : "#fca5a5";
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
            beginAtZero: true,
            afterDataLimits(axis) {
              if (axis.max === 0) {
                axis.max = 100_000;
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

    const incomeDs = chart.data.datasets[0];
    const spentDs = chart.data.datasets[1];
    if (incomeDs) {
      incomeDs.data = points.map((p) => p.income);
      incomeDs.pointRadius = pointRadii(points, activeKey);
      incomeDs.pointBackgroundColor = pointColors(points, "#2f8f7b", activeKey);
    }
    if (spentDs) {
      spentDs.data = points.map((p) => p.expense);
      spentDs.pointRadius = pointRadii(points, activeKey);
      spentDs.pointBackgroundColor = pointColors(points, "#d97b78", activeKey);
    }

    chart.update();
  }, [points, activeKey]);

  return (
    <div>
      <div className="relative h-[260px] w-full max-[600px]:h-[220px]">
        <canvas
          ref={canvasRef}
          aria-label="Income and spent cashflow line chart"
          role="img"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-ok">
          <span className="relative inline-flex w-5 items-center justify-center">
            <span className="h-[2px] w-full bg-ok" />
            <span className="absolute size-2 rounded-full border-2 border-ok bg-white" />
          </span>
          Income
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#b5524f]">
          <span className="relative inline-flex w-5 items-center justify-center">
            <span className="h-[2px] w-full bg-[#d97b78]" />
            <span className="absolute size-2 rounded-full border-2 border-[#d97b78] bg-white" />
          </span>
          Spent
        </span>
      </div>
    </div>
  );
}
