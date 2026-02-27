"use client";

import { useEffect, useRef, useCallback } from "react";
import type { ApiTrade } from "@/lib/api";

interface BondingCurveChartProps {
  trades: ApiTrade[];
  currentPrice: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Aggregate trades into 5-minute OHLCV candles */
function aggregateCandles(trades: ApiTrade[], intervalMs = 5 * 60 * 1000): Candle[] {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const candles: Candle[] = [];
  let bucketStart = Math.floor(new Date(sorted[0].createdAt).getTime() / intervalMs) * intervalMs;
  let open = sorted[0].price;
  let high = sorted[0].price;
  let low = sorted[0].price;
  let close = sorted[0].price;

  for (const t of sorted) {
    const ts = new Date(t.createdAt).getTime();
    const bucket = Math.floor(ts / intervalMs) * intervalMs;

    if (bucket !== bucketStart) {
      candles.push({
        time: Math.floor(bucketStart / 1000),
        open,
        high,
        low,
        close,
      });
      bucketStart = bucket;
      open = t.price;
      high = t.price;
      low = t.price;
      close = t.price;
    } else {
      high = Math.max(high, t.price);
      low = Math.min(low, t.price);
      close = t.price;
    }
  }

  // Push last candle
  candles.push({
    time: Math.floor(bucketStart / 1000),
    open,
    high,
    low,
    close,
  });

  return candles;
}

export default function BondingCurveChart({
  trades,
  currentPrice,
}: BondingCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const seriesRef = useRef<unknown>(null);
  const priceLineRef = useRef<unknown>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // One-time chart creation
  const initChart = useCallback(async () => {
    if (!containerRef.current || chartRef.current) return;

    const { createChart, CandlestickSeries, ColorType } = await import(
      "lightweight-charts"
    );

    if (!containerRef.current) return;

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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#34D399",
      downColor: "#F87171",
      borderUpColor: "#34D399",
      borderDownColor: "#F87171",
      wickUpColor: "#34D399",
      wickDownColor: "#F87171",
    });

    seriesRef.current = candleSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);
    resizeObserverRef.current = ro;
  }, []);

  // Init chart once
  useEffect(() => {
    initChart();

    return () => {
      resizeObserverRef.current?.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      priceLineRef.current = null;
    };
  }, [initChart]);

  // Update candle data when trades change
  useEffect(() => {
    if (!seriesRef.current || trades.length === 0) return;

    const series = seriesRef.current as import("lightweight-charts").ISeriesApi<"Candlestick">;
    const candles = aggregateCandles(trades);

    series.setData(
      candles.map((c) => ({
        time: c.time as import("lightweight-charts").UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    chartRef.current?.timeScale().fitContent();
  }, [trades]);

  // Update price line when currentPrice changes
  useEffect(() => {
    if (!seriesRef.current) return;

    const series = seriesRef.current as import("lightweight-charts").ISeriesApi<"Candlestick">;

    // Remove old price line
    if (priceLineRef.current) {
      try {
        series.removePriceLine(
          priceLineRef.current as import("lightweight-charts").IPriceLine,
        );
      } catch {
        // line already removed
      }
    }

    import("lightweight-charts").then(({ LineStyle }) => {
      const line = series.createPriceLine({
        price: currentPrice,
        color: "#FB923C",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "NOW",
      });
      priceLineRef.current = line;
    });
  }, [currentPrice]);

  if (trades.length === 0) {
    return (
      <div
        className="w-full arcade-border flex items-center justify-center"
        style={{ height: 280 }}
      >
        <p className="text-[10px] font-display text-text-muted tracking-wider">
          NO TRADES YET
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full arcade-border"
      style={{ height: 280 }}
    />
  );
}
