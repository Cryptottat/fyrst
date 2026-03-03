"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiTrade } from "@/lib/api";

interface BondingCurveChartProps {
  trades: ApiTrade[];
  currentPrice: number;
  totalSupply?: number;
  solPrice?: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const INTERVALS = [
  { label: "1s", ms: 1_000 },
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 5 * 60_000 },
  { label: "15m", ms: 15 * 60_000 },
  { label: "1h", ms: 60 * 60_000 },
];

/** Aggregate trades into OHLCV candles at the given interval */
function aggregateCandles(trades: ApiTrade[], intervalMs: number): Candle[] {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const candles: Candle[] = [];
  let bucketStart =
    Math.floor(new Date(sorted[0].createdAt).getTime() / intervalMs) * intervalMs;
  let open = sorted[0].price;
  let high = sorted[0].price;
  let low = sorted[0].price;
  let close = sorted[0].price;

  for (const t of sorted) {
    const ts = new Date(t.createdAt).getTime();
    const bucket = Math.floor(ts / intervalMs) * intervalMs;

    if (bucket !== bucketStart) {
      candles.push({ time: Math.floor(bucketStart / 1000), open, high, low, close });
      bucketStart = bucket;
      // New candle open = previous candle close
      open = close;
      high = Math.max(open, t.price);
      low = Math.min(open, t.price);
      close = t.price;
    } else {
      high = Math.max(high, t.price);
      low = Math.min(low, t.price);
      close = t.price;
    }
  }

  candles.push({ time: Math.floor(bucketStart / 1000), open, high, low, close });
  return candles;
}

export default function BondingCurveChart({
  trades,
  currentPrice,
  totalSupply,
  solPrice = 0,
}: BondingCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);
  const seriesRef = useRef<unknown>(null);
  const priceLineRef = useRef<unknown>(null);

  const [chartReady, setChartReady] = useState(false);
  const [intervalIdx, setIntervalIdx] = useState(0); // default 1s
  const [viewMode, setViewMode] = useState<"price" | "mcap">("price");

  // -----------------------------------------------------------------------
  // Chart lifecycle — cancelled flag prevents double-creation in strict mode
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let localChart: typeof chartRef.current = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      if (!containerRef.current) return;

      const { createChart, CandlestickSeries, ColorType } = await import(
        "lightweight-charts"
      );
      if (cancelled || !containerRef.current) return;

      localChart = createChart(containerRef.current, {
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
          vertLine: {
            color: "rgba(167, 139, 250, 0.4)",
            labelBackgroundColor: "#A78BFA",
          },
          horzLine: {
            color: "rgba(167, 139, 250, 0.4)",
            labelBackgroundColor: "#A78BFA",
          },
        },
        rightPriceScale: { borderColor: "#2A2A30" },
        timeScale: {
          borderColor: "#2A2A30",
          timeVisible: true,
          secondsVisible: true,
        },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = localChart;

      const series = localChart.addSeries(CandlestickSeries, {
        upColor: "#34D399",
        downColor: "#F87171",
        borderUpColor: "#34D399",
        borderDownColor: "#F87171",
        wickUpColor: "#34D399",
        wickDownColor: "#F87171",
        priceFormat: {
          type: "price",
          precision: 8,
          minMove: 0.00000001,
        },
      });

      seriesRef.current = series;

      ro = new ResizeObserver(() => {
        if (containerRef.current && localChart) {
          localChart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      ro.observe(containerRef.current);

      setChartReady(true);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      if (localChart) localChart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
      setChartReady(false);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Update candle data
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartReady || !seriesRef.current) return;

    const series =
      seriesRef.current as import("lightweight-charts").ISeriesApi<"Candlestick">;
    const interval = INTERVALS[intervalIdx].ms;
    // PRICE mode: raw SOL price
    // MCAP mode: price × supply × solPrice (USD market cap)
    const usdMul = viewMode === "mcap" && solPrice > 0 ? solPrice : 1;
    const supplyMul = viewMode === "mcap" && totalSupply ? totalSupply / 1e6 : 1;
    const multiplier = supplyMul * usdMul;

    if (trades.length === 0) {
      // No trades yet — show single candle at current base price
      if (currentPrice > 0) {
        const val = currentPrice * multiplier;
        const now = Math.floor(
          Date.now() / 1000,
        ) as import("lightweight-charts").UTCTimestamp;
        series.setData([
          { time: now, open: val, high: val, low: val, close: val },
        ]);
      }
    } else {
      const candles = aggregateCandles(trades, interval);
      series.setData(
        candles.map((c) => ({
          time: c.time as import("lightweight-charts").UTCTimestamp,
          open: c.open * multiplier,
          high: c.high * multiplier,
          low: c.low * multiplier,
          close: c.close * multiplier,
        })),
      );
    }

    chartRef.current?.timeScale().fitContent();
  }, [trades, currentPrice, intervalIdx, viewMode, totalSupply, solPrice, chartReady]);

  // -----------------------------------------------------------------------
  // Price line
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartReady || !seriesRef.current) return;

    const series =
      seriesRef.current as import("lightweight-charts").ISeriesApi<"Candlestick">;

    if (priceLineRef.current) {
      try {
        series.removePriceLine(
          priceLineRef.current as import("lightweight-charts").IPriceLine,
        );
      } catch {
        /* already removed */
      }
    }

    const usdMul = viewMode === "mcap" && solPrice > 0 ? solPrice : 1;
    const supplyMul = viewMode === "mcap" && totalSupply ? totalSupply / 1e6 : 1;
    const multiplier = supplyMul * usdMul;

    import("lightweight-charts").then(({ LineStyle }) => {
      const line = series.createPriceLine({
        price: currentPrice * multiplier,
        color: "#FB923C",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "NOW",
      });
      priceLineRef.current = line;
    });
  }, [currentPrice, viewMode, totalSupply, solPrice, chartReady]);

  // -----------------------------------------------------------------------
  // UI
  // -----------------------------------------------------------------------
  const btnClass = (active: boolean) =>
    `text-[8px] px-2 py-1 font-display border transition-colors cursor-pointer ${
      active
        ? "text-primary border-primary bg-primary/10"
        : "text-text-muted border-border hover:border-border-hover"
    }`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <div className="flex gap-1">
          {INTERVALS.map((iv, i) => (
            <button
              key={iv.label}
              onClick={() => setIntervalIdx(i)}
              className={btnClass(i === intervalIdx)}
            >
              {iv.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setViewMode("price")}
            className={btnClass(viewMode === "price")}
          >
            PRICE
          </button>
          <button
            onClick={() => setViewMode("mcap")}
            className={btnClass(viewMode === "mcap")}
          >
            MCAP $
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full arcade-border"
        style={{ height: 340 }}
      />
    </div>
  );
}
