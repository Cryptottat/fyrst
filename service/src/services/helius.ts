import { config } from "../config";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeliusTransaction {
  signature: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  slot: number;
  timestamp: number;
  description: string;
  nativeTransfers: HeliusNativeTransfer[];
  tokenTransfers: HeliusTokenTransfer[];
  events: Record<string, unknown>;
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export interface HeliusTokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  updateAuthority: string;
  creators: HeliusCreator[];
  primarySaleHappened: boolean;
  isMutable: boolean;
  tokenStandard: string;
  collection?: {
    key: string;
    verified: boolean;
  };
  content?: {
    json_uri: string;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
    links?: {
      image?: string;
      external_url?: string;
    };
  };
}

export interface HeliusCreator {
  address: string;
  share: number;
  verified: boolean;
}

export interface HeliusDASAsset {
  id: string;
  interface: string;
  content: {
    json_uri: string;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
    links?: {
      image?: string;
      external_url?: string;
    };
  };
  authorities: { address: string; scopes: string[] }[];
  creators: HeliusCreator[];
  ownership: {
    owner: string;
    frozen: boolean;
    delegated: boolean;
  };
  mutable: boolean;
  burnt: boolean;
  token_info?: {
    supply: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
      currency: string;
    };
  };
}

export interface HeliusRPCResponse<T> {
  jsonrpc: string;
  id: string;
  result: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface DeployerLaunch {
  signature: string;
  mint: string;
  timestamp: number;
  type: string;
}

export interface RugPullDetection {
  isRugPull: boolean;
  confidence: "high" | "medium" | "low" | "none";
  indicators: string[];
  liquidityRemoved: boolean;
  largeSellerDetected: boolean;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Handle rate limiting
    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }
      const retryAfter = response.headers.get("retry-after");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Helius rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }

    // Retry on server errors
    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Helius server error (${response.status}). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }

    return response;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name === "AbortError" &&
      attempt < MAX_RETRIES
    ) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Helius request timed out. Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Helius Parsed Transaction API
// ---------------------------------------------------------------------------

/**
 * Fetch parsed transaction history for a wallet address using the Helius
 * enhanced transactions API.
 *
 * @see https://docs.helius.dev/solana-apis/enhanced-transactions-api
 */
export async function getWalletHistory(
  address: string
): Promise<HeliusTransaction[]> {
  const apiKey = config.heliusApiKey;
  if (!apiKey) {
    logger.warn("Helius API key not configured -- cannot fetch wallet history");
    return [];
  }

  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}`;
  logger.info(`Helius: fetching wallet history for ${address}`);

  try {
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Helius getWalletHistory failed: ${response.status}`, {
        body,
      });
      throw new Error(
        `Helius API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as HeliusTransaction[];
    logger.info(
      `Helius: fetched ${data.length} transactions for ${address}`
    );
    return data;
  } catch (err) {
    logger.error("Helius getWalletHistory error", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helius DAS (Digital Asset Standard) API
// ---------------------------------------------------------------------------

/**
 * Fetch token metadata via the Helius DAS (Digital Asset Standard) RPC API.
 *
 * Uses the `getAsset` DAS method on the Helius RPC endpoint.
 *
 * @see https://docs.helius.dev/solana-apis/digital-asset-standard-das-api
 */
export async function getTokenMetadata(
  mintAddress: string
): Promise<HeliusDASAsset | null> {
  const rpcUrl = config.heliusRpcUrl;
  if (!rpcUrl) {
    logger.warn(
      "Helius RPC URL not configured -- cannot fetch token metadata"
    );
    return null;
  }

  logger.info(`Helius DAS: fetching metadata for mint ${mintAddress}`);

  try {
    const response = await fetchWithRetry(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `getAsset-${mintAddress}`,
        method: "getAsset",
        params: { id: mintAddress },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Helius DAS getAsset failed: ${response.status}`, { body });
      throw new Error(
        `Helius DAS API error: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as HeliusRPCResponse<HeliusDASAsset>;

    if (json.error) {
      logger.error("Helius DAS RPC error", json.error);
      throw new Error(`Helius DAS RPC error: ${json.error.message}`);
    }

    logger.info(
      `Helius DAS: fetched metadata for ${mintAddress} -- ${json.result?.content?.metadata?.name ?? "unknown"}`
    );
    return json.result;
  } catch (err) {
    logger.error("Helius getTokenMetadata error", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Deployer launch history
// ---------------------------------------------------------------------------

/**
 * Find all token launches (token creation / mint events) by a deployer address.
 *
 * Scans the deployer's transaction history for token creation events
 * (CREATE, CREATE_MERKLE_TREE, TOKEN_MINT, etc.).
 */
export async function getDeployerLaunches(
  address: string
): Promise<DeployerLaunch[]> {
  logger.info(`Helius: fetching deployer launches for ${address}`);

  try {
    const transactions = await getWalletHistory(address);

    // Filter for token creation / launch related transactions
    const launchTypes = new Set([
      "CREATE",
      "TOKEN_MINT",
      "INIT_MINT",
      "CREATE_MERKLE_TREE",
      "COMPRESSED_NFT_MINT",
    ]);

    const launches: DeployerLaunch[] = [];

    for (const tx of transactions) {
      if (launchTypes.has(tx.type)) {
        // Extract mint address from token transfers if available
        const mint =
          tx.tokenTransfers.length > 0 ? tx.tokenTransfers[0].mint : "";

        launches.push({
          signature: tx.signature,
          mint,
          timestamp: tx.timestamp,
          type: tx.type,
        });
      }
    }

    logger.info(
      `Helius: found ${launches.length} launches for deployer ${address}`
    );
    return launches;
  } catch (err) {
    logger.error("Helius getDeployerLaunches error", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Rug pull detection
// ---------------------------------------------------------------------------

/**
 * Check if a token shows signs of a rug pull by analyzing its transaction
 * history for liquidity removal patterns.
 *
 * Detection heuristics:
 *  1. Large SOL transfers out from token accounts (liquidity removal)
 *  2. Deployer/authority selling large portions of supply
 *  3. Burn authority used after initial distribution
 */
export async function detectRugPull(
  mintAddress: string
): Promise<RugPullDetection> {
  const apiKey = config.heliusApiKey;
  if (!apiKey) {
    logger.warn("Helius API key not configured -- cannot detect rug pull");
    return {
      isRugPull: false,
      confidence: "none",
      indicators: ["API key not configured -- analysis unavailable"],
      liquidityRemoved: false,
      largeSellerDetected: false,
    };
  }

  logger.info(`Helius: detecting rug pull for mint ${mintAddress}`);

  try {
    // Fetch token metadata to get authority/creator info
    const metadata = await getTokenMetadata(mintAddress);
    if (!metadata) {
      return {
        isRugPull: false,
        confidence: "none",
        indicators: ["Token metadata not found"],
        liquidityRemoved: false,
        largeSellerDetected: false,
      };
    }

    // Get the update authority / creator address
    const authority =
      metadata.authorities.length > 0
        ? metadata.authorities[0].address
        : null;

    if (!authority) {
      return {
        isRugPull: false,
        confidence: "low",
        indicators: ["No authority found on token"],
        liquidityRemoved: false,
        largeSellerDetected: false,
      };
    }

    // Fetch authority's recent transaction history
    const transactions = await getWalletHistory(authority);

    const indicators: string[] = [];
    let liquidityRemoved = false;
    let largeSellerDetected = false;

    // Heuristic 1: Check for large native SOL transfers out (potential liquidity drain)
    const largeSolTransfers = transactions.filter((tx) => {
      return tx.nativeTransfers.some(
        (nt) =>
          nt.fromUserAccount === authority &&
          nt.amount > 10 * 1e9 // > 10 SOL in lamports
      );
    });

    if (largeSolTransfers.length > 0) {
      liquidityRemoved = true;
      indicators.push(
        `Authority made ${largeSolTransfers.length} large SOL transfer(s) out`
      );
    }

    // Heuristic 2: Check for large token sells by the authority
    const largeSells = transactions.filter((tx) => {
      return tx.tokenTransfers.some(
        (tt) =>
          tt.fromUserAccount === authority &&
          tt.mint === mintAddress &&
          tt.tokenAmount > 0
      );
    });

    if (largeSells.length > 3) {
      largeSellerDetected = true;
      indicators.push(
        `Authority executed ${largeSells.length} sell transactions for this token`
      );
    }

    // Heuristic 3: Check if token is now immutable or burnt
    if (metadata.burnt) {
      indicators.push("Token has been burnt");
    }

    // Determine confidence
    let confidence: RugPullDetection["confidence"] = "none";
    if (liquidityRemoved && largeSellerDetected) {
      confidence = "high";
    } else if (liquidityRemoved || largeSellerDetected) {
      confidence = "medium";
    } else if (indicators.length > 0) {
      confidence = "low";
    }

    const isRugPull = confidence === "high" || confidence === "medium";

    logger.info(
      `Helius: rug pull detection for ${mintAddress} -- isRugPull=${isRugPull} confidence=${confidence}`
    );

    return {
      isRugPull,
      confidence,
      indicators,
      liquidityRemoved,
      largeSellerDetected,
    };
  } catch (err) {
    logger.error("Helius detectRugPull error", err);
    return {
      isRugPull: false,
      confidence: "none",
      indicators: [`Analysis failed: ${err instanceof Error ? err.message : "unknown error"}`],
      liquidityRemoved: false,
      largeSellerDetected: false,
    };
  }
}
