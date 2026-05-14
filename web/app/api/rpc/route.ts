import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUpstream(): string {
  const fromEnv = process.env.HELIUS_RPC_URL;
  if (fromEnv) return fromEnv;
  const isDevnet = process.env.NEXT_PUBLIC_DEVNET !== "false";
  return isDevnet
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getBalance",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTokenSupply",
  "getSignaturesForAddress",
  "getTransaction",
  "getSignatureStatuses",
  "getRecentPrioritizationFees",
  "getLatestBlockhash",
  "getBlockHeight",
  "getSlot",
  "getEpochInfo",
  "getMinimumBalanceForRentExemption",
  "getVersion",
  "getHealth",
  "getGenesisHash",
  "getFeeForMessage",
  "simulateTransaction",
  "sendTransaction",
  "getAsset",
  "getAssetsByOwner",
  "searchAssets",
]);

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  params?: unknown;
}

async function proxy(body: unknown): Promise<Response> {
  const upstream = getUpstream();
  const res = await fetch(upstream, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

function isAllowed(req: JsonRpcRequest): boolean {
  if (!req || typeof req.method !== "string") return false;
  return ALLOWED_METHODS.has(req.method);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  if (Array.isArray(body)) {
    const reqs = body as JsonRpcRequest[];
    if (!reqs.every(isAllowed)) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32601, message: "Method not allowed" } },
        { status: 403 },
      );
    }
    return proxy(reqs);
  }

  const r = body as JsonRpcRequest;
  if (!isAllowed(r)) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: r?.id ?? null, error: { code: -32601, message: "Method not allowed" } },
      { status: 403 },
    );
  }
  return proxy(r);
}

export async function GET() {
  return NextResponse.json({ ok: true, upstream: "configured" });
}
