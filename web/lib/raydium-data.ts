// ---------------------------------------------------------------------------
// Raydium DEX data sources (GeckoTerminal + Jupiter)
// ---------------------------------------------------------------------------

const IS_DEVNET = process.env.NEXT_PUBLIC_DEVNET !== "false";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DexCandle {
  time: number;  // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DexTrade {
  id: string;
  txSignature: string;
  side: "buy" | "sell";
  price: number;
  amount: number;
  totalSol: number;
  traderAddress: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// GeckoTerminal OHLCV (mainnet only)
// ---------------------------------------------------------------------------

export async function fetchGeckoOHLCV(
  poolAddress: string,
  interval: "1m" | "5m" | "15m" | "1h" = "1m",
  limit = 100,
): Promise<DexCandle[]> {
  if (IS_DEVNET) return [];

  try {
    const timeframe = interval === "1m" ? "minute" : interval === "5m" ? "minute" : interval === "15m" ? "minute" : "hour";
    const aggregate = interval === "1m" ? 1 : interval === "5m" ? 5 : interval === "15m" ? 15 : 1;

    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];

    const json = await res.json();
    const list = json?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) return [];

    return list.map((item: number[]) => ({
      time: Math.floor(item[0] / 1000),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
    })).reverse(); // GeckoTerminal returns newest first
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// GeckoTerminal Trades (mainnet only)
// ---------------------------------------------------------------------------

export async function fetchGeckoTrades(
  poolAddress: string,
): Promise<DexTrade[]> {
  if (IS_DEVNET) return [];

  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/trades`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];

    const json = await res.json();
    const trades = json?.data;
    if (!Array.isArray(trades)) return [];

    return trades.map((t: { id: string; attributes: Record<string, unknown> }) => {
      const a = t.attributes;
      return {
        id: t.id,
        txSignature: (a.tx_hash as string) || "",
        side: (a.kind as string) === "buy" ? "buy" as const : "sell" as const,
        price: Number(a.price_from_in_usd || 0),
        amount: Number(a.from_token_amount || 0),
        totalSol: Number(a.to_token_amount || 0),
        traderAddress: (a.tx_from_address as string) || "",
        createdAt: (a.block_timestamp as string) || new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Jupiter Price API (mainnet fallback)
// ---------------------------------------------------------------------------

export async function fetchJupiterPrice(
  tokenMint: string,
): Promise<number | null> {
  if (IS_DEVNET) return null;

  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${tokenMint}`);
    if (!res.ok) return null;

    const json = await res.json();
    const price = json?.data?.[tokenMint]?.price;
    return price ? Number(price) : null;
  } catch {
    return null;
  }
}
