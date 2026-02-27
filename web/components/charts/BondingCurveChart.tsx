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
          background: { type: ColorType.Solid, color: "#0A0A0C" },
          textColor: "#55555F",
          fontFamily: "'VT323', 'JetBrains Mono', monospace",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(42, 42, 48, 0.5)" },
          horzLines: { color: "rgba(42, 42, 48, 0.5)" },
        },
        crosshair: {
          vertLine: { color: "rgba(167, 139, 250, 0.4)", labelBackgroundColor: "#A78BFA" },
          horzLine: { color: "rgba(167, 139, 250, 0.4)", labelBackgroundColor: "#A78BFA" },
        },
        rightPriceScale: {
          borderColor: "#2A2A30",
        },
        timeScale: {
          borderColor: "#2A2A30",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#A78BFA",
        topColor: "rgba(167, 139, 250, 0.2)",
        bottomColor: "rgba(167, 139, 250, 0.0)",
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
        color: "#FB923C",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "NOW",
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
      className="w-full arcade-border"
      style={{ height: 280 }}
    />
  );
}
