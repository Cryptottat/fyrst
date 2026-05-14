import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

let cache: { price: number; ts: number } | null = null;
const TTL_MS = 30_000;

async function fromCoinGecko(): Promise<number | null> {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { cache: "no-store" },
    );
    const j = await r.json();
    return typeof j?.solana?.usd === "number" ? j.solana.usd : null;
  } catch {
    return null;
  }
}

async function fromBinance(): Promise<number | null> {
  try {
    const r = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      { cache: "no-store" },
    );
    const j = await r.json();
    return j?.price ? parseFloat(j.price) : null;
  } catch {
    return null;
  }
}

async function fromOkx(): Promise<number | null> {
  try {
    const r = await fetch(
      "https://www.okx.com/api/v5/market/ticker?instId=SOL-USDT",
      { cache: "no-store" },
    );
    const j = await r.json();
    const p = j?.data?.[0]?.last;
    return p ? parseFloat(p) : null;
  } catch {
    return null;
  }
}

async function fromKraken(): Promise<number | null> {
  try {
    const r = await fetch(
      "https://api.kraken.com/0/public/Ticker?pair=SOLUSD",
      { cache: "no-store" },
    );
    const j = await r.json();
    const p = j?.result?.SOLUSD?.c?.[0];
    return p ? parseFloat(p) : null;
  } catch {
    return null;
  }
}

async function fromHeliusDas(): Promise<number | null> {
  const isDevnet = process.env.NEXT_PUBLIC_DEVNET !== "false";
  const url =
    process.env.HELIUS_RPC_URL ||
    (isDevnet ? process.env.HELIUS_DEVNET_URL : process.env.HELIUS_MAINNET_URL);
  if (!url) return null;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAsset",
        params: { id: "So11111111111111111111111111111111111111112" },
      }),
      cache: "no-store",
    });
    const j = await r.json();
    const p = j?.result?.token_info?.price_info?.price_per_token;
    return typeof p === "number" ? p : null;
  } catch {
    return null;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return NextResponse.json({ price: cache.price, cached: true });
  }

  const sources = [fromCoinGecko, fromBinance, fromOkx, fromKraken, fromHeliusDas];
  for (const fn of sources) {
    const p = await fn();
    if (p && p > 0) {
      cache = { price: p, ts: Date.now() };
      return NextResponse.json({ price: p, cached: false });
    }
  }

  return NextResponse.json({ price: null, error: "all sources failed" }, { status: 503 });
}
