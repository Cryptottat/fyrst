const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export { API_BASE_URL };

// ---------------------------------------------------------------------------
// Types (matching backend API responses)
// ---------------------------------------------------------------------------

export interface ApiToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  deployerAddress: string;
  marketCap: number;
  currentPrice: number;
  totalSupply: number;
  collateralTier: string;
  graduated: boolean;
  bondingCurveProgress: number;
  createdAt: string;
  deployer?: ApiDeployer;
  tradeCount?: number;
}

export interface ApiDeployer {
  address: string;
  reputationScore: number;
  reputationRank: string;
  totalLaunches: number;
  successfulLaunches: number;
  rugPulls: number;
  collateralLocked: number;
  collateralTier: string;
  createdAt: string;
  launchHistory?: ApiTokenSummary[];
}

export interface ApiTokenSummary {
  mint: string;
  name: string;
  symbol: string;
  marketCap: number;
  currentPrice: number;
  graduated: boolean;
  bondingCurveProgress: number;
  createdAt: string;
}

export interface ApiPortfolio {
  ownerAddress: string;
  holdings: ApiPortfolioHolding[];
  totalValueSol: number;
}

export interface ApiPortfolioHolding {
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  balance: number;
  valueSol: number;
  avgBuyPrice: number;
  pnlPercent: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const json: ApiResponse<T> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "API error");
  }
  return json.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "API error");
  }
  return json.data;
}

// ---------------------------------------------------------------------------
// Launches
// ---------------------------------------------------------------------------

export interface FetchLaunchesResult {
  tokens: ApiToken[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchLaunches(
  sort: string = "newest",
  limit: number = 20,
  offset: number = 0,
): Promise<FetchLaunchesResult> {
  return apiFetch<FetchLaunchesResult>(
    `/api/launches?sort=${sort}&limit=${limit}&offset=${offset}`,
  );
}

export async function fetchToken(mint: string): Promise<ApiToken> {
  return apiFetch<ApiToken>(`/api/launches/${mint}`);
}

export async function createLaunch(data: {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  deployerAddress: string;
  collateralAmount: number;
  escrowTxSignature?: string;
  curveTxSignature?: string;
}): Promise<ApiToken> {
  return apiPost<ApiToken>("/api/launches", data);
}

// ---------------------------------------------------------------------------
// Deployer
// ---------------------------------------------------------------------------

export async function fetchDeployer(address: string): Promise<ApiDeployer> {
  return apiFetch<ApiDeployer>(`/api/deployer/${address}`);
}

// ---------------------------------------------------------------------------
// Trade
// ---------------------------------------------------------------------------

export interface ApiTrade {
  id: string;
  tokenMint: string;
  traderAddress: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  totalSol: number;
  txSignature: string;
  createdAt: string;
}

export async function fetchTrades(mint: string): Promise<ApiTrade[]> {
  try {
    return await apiFetch<ApiTrade[]>(`/api/trade/${mint}`);
  } catch {
    return [];
  }
}

export interface TradeResult {
  id: string;
  tokenMint: string;
  traderAddress: string;
  side: string;
  amount: number;
  price: number;
  totalSol: number;
  txSignature: string;
  createdAt: string;
  slippage?: number;
  newPrice?: number;
  newSupply?: number;
  bondingCurveProgress?: number;
  graduated?: boolean;
}

export async function recordTrade(data: {
  tokenMint: string;
  traderAddress: string;
  side: "buy" | "sell";
  amount: number;
  txSignature?: string;
  solAmount?: number;
  price?: number;
}): Promise<TradeResult> {
  return apiPost<TradeResult>("/api/trade", data);
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export async function fetchPortfolio(wallet: string): Promise<ApiPortfolio> {
  try {
    return await apiFetch<ApiPortfolio>(`/api/portfolio/${wallet}`);
  } catch {
    return { ownerAddress: wallet, holdings: [], totalValueSol: 0 };
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function fetchStats(): Promise<{
  totalLaunches: number;
  totalTrades: number;
  graduatedCount: number;
  totalVolumeSol: number;
  refundsSaved: number;
}> {
  const res = await fetch(`${API_BASE_URL}/api/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}
