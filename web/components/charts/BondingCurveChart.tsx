"use client";

import { useEffect, useRef } from "react";

interface TradePoint {
  time: number;
  price: number;
  volume: number;
}

interface BondingCurveChartProps {
  trades: TradePoint[];
  currentPrice: number;
}

export default function BondingCurveChart({
  trades,
  currentPrice,
}: BondingCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    async function initChart() {
      const { createChart, AreaSeries, ColorType, LineStyle } = await import(
        "lightweight-charts"
      );

      if (disposed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#0F172A" },
          textColor: "#94A3B8",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: "rgba(148, 163, 184, 0.06)" },
          horzLines: { color: "rgba(148, 163, 184, 0.06)" },
        },
        crosshair: {
          vertLine: { color: "rgba(37, 99, 235, 0.4)", labelBackgroundColor: "#2563EB" },
          horzLine: { color: "rgba(37, 99, 235, 0.4)", labelBackgroundColor: "#2563EB" },
        },
        rightPriceScale: {
          borderColor: "rgba(148, 163, 184, 0.1)",
        },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.1)",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#2563EB",
        topColor: "rgba(37, 99, 235, 0.4)",
        bottomColor: "rgba(37, 99, 235, 0.0)",
        lineWidth: 2,
      });

      const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
      const data = sortedTrades.map((t) => ({
        time: t.time as import("lightweight-charts").UTCTimestamp,
        value: t.price,
      }));

      areaSeries.setData(data);

      areaSeries.createPriceLine({
        price: currentPrice,
        color: "#D97706",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Current",
      });

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current && !disposed) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      // Store cleanup in a way accessible to the outer cleanup function
      (chart as unknown as Record<string, () => void>).__resizeCleanup = () => {
        resizeObserver.disconnect();
      };
    }

    initChart();

    return () => {
      disposed = true;
      if (chartRef.current) {
        const cleanup = (chartRef.current as unknown as Record<string, () => void>).__resizeCleanup;
        if (cleanup) cleanup();
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [trades, currentPrice]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: 300 }}
    />
  );
}
