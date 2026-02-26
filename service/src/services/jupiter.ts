import { config } from "../config";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JupiterPriceData {
  id: string;
  type: string;
  price: string;
  extraInfo?: {
    lastSwappedPrice?: {
      lastJupiterSellAt: number;
      lastJupiterSellPrice: string;
      lastJupiterBuyAt: number;
      lastJupiterBuyPrice: string;
    };
    quotedPrice?: {
      buyPrice: string;
      buyAt: number;
      sellPrice: string;
      sellAt: number;
    };
    confidenceLevel: string;
    depth?: {
      buyPriceImpactRatio: Record<string, number>;
      sellPriceImpactRatio: Record<string, number>;
    };
  };
}

export interface JupiterPriceResponse {
  data: Record<string, JupiterPriceData>;
  timeTaken: number;
}

export interface TokenPrice {
  mintAddress: string;
  priceUsd: number;
  priceSol: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SOL mint address (native SOL wrapped) */
const SOL_MINT = "So11111111111111111111111111111111111111112";

/** USDC mint address on Solana */
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithRetry(
  url: string,
  attempt = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    // Handle rate limiting
    if (response.status === 429) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Jupiter rate limited after ${MAX_RETRIES} retries`);
      }
      const retryAfter = response.headers.get("retry-after");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Jupiter rate limited (429). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, attempt + 1);
    }

    // Retry on server errors
    if (response.status >= 500 && attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(
        `Jupiter server error (${response.status}). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, attempt + 1);
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
        `Jupiter request timed out. Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(delayMs);
      return fetchWithRetry(url, attempt + 1);
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
// Price API
// ---------------------------------------------------------------------------

/**
 * Fetch the price of a single token using the Jupiter Price API v2.
 *
 * Returns the price in both USD and SOL.
 *
 * @see https://station.jup.ag/docs/apis/price-api-v2
 */
export async function getTokenPrice(
  mintAddress: string
): Promise<TokenPrice | null> {
  const baseUrl = config.jupiterApiUrl;
  // Request price with SOL as the vsToken for SOL-denominated price,
  // and also request in USDC for USD price
  const url = `${baseUrl}/price/v2?ids=${mintAddress}&vsToken=${USDC_MINT}`;

  logger.info(`Jupiter: fetching price for ${mintAddress}`);

  try {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Jupiter getTokenPrice failed: ${response.status}`, {
        body,
      });
      throw new Error(
        `Jupiter API error: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as JupiterPriceResponse;
    const priceData = json.data[mintAddress];

    if (!priceData) {
      logger.warn(`Jupiter: no price data found for ${mintAddress}`);
      return null;
    }

    const priceUsd = parseFloat(priceData.price);

    // Now get the SOL price to compute SOL-denominated value
    const solPrice = await getSolPrice();
    const priceSol = solPrice > 0 ? priceUsd / solPrice : 0;

    logger.info(
      `Jupiter: ${mintAddress} price = $${priceUsd.toFixed(6)} (${priceSol.toFixed(8)} SOL)`
    );

    return {
      mintAddress,
      priceUsd,
      priceSol,
    };
  } catch (err) {
    logger.error("Jupiter getTokenPrice error", err);
    throw err;
  }
}

/**
 * Fetch prices for multiple tokens in a single batch request.
 *
 * The Jupiter Price API v2 supports comma-separated mint addresses.
 */
export async function getTokenPrices(
  mintAddresses: string[]
): Promise<Map<string, TokenPrice>> {
  if (mintAddresses.length === 0) {
    return new Map();
  }

  const baseUrl = config.jupiterApiUrl;
  const ids = mintAddresses.join(",");
  const url = `${baseUrl}/price/v2?ids=${ids}&vsToken=${USDC_MINT}`;

  logger.info(
    `Jupiter: fetching batch prices for ${mintAddresses.length} tokens`
  );

  try {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Jupiter getTokenPrices failed: ${response.status}`, {
        body,
      });
      throw new Error(
        `Jupiter API error: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as JupiterPriceResponse;

    // Get SOL price for conversion
    const solPriceUsd = await getSolPrice();

    const results = new Map<string, TokenPrice>();

    for (const mint of mintAddresses) {
      const priceData = json.data[mint];
      if (priceData) {
        const priceUsd = parseFloat(priceData.price);
        const priceSol = solPriceUsd > 0 ? priceUsd / solPriceUsd : 0;

        results.set(mint, {
          mintAddress: mint,
          priceUsd,
          priceSol,
        });
      }
    }

    logger.info(
      `Jupiter: fetched prices for ${results.size}/${mintAddresses.length} tokens`
    );
    return results;
  } catch (err) {
    logger.error("Jupiter getTokenPrices error", err);
    throw err;
  }
}

/**
 * Get the current SOL/USD price.
 *
 * Uses the Jupiter Price API v2 with SOL's wrapped mint address.
 */
let cachedSolPrice: { price: number; fetchedAt: number } | null = null;
const SOL_PRICE_CACHE_TTL_MS = 30_000; // Cache SOL price for 30 seconds

export async function getSolPrice(): Promise<number> {
  // Return cached price if still fresh
  if (
    cachedSolPrice &&
    Date.now() - cachedSolPrice.fetchedAt < SOL_PRICE_CACHE_TTL_MS
  ) {
    return cachedSolPrice.price;
  }

  const baseUrl = config.jupiterApiUrl;
  const url = `${baseUrl}/price/v2?ids=${SOL_MINT}&vsToken=${USDC_MINT}`;

  logger.info("Jupiter: fetching SOL/USD price");

  try {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      const body = await response.text();
      logger.error(`Jupiter getSolPrice failed: ${response.status}`, { body });
      throw new Error(
        `Jupiter API error: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as JupiterPriceResponse;
    const priceData = json.data[SOL_MINT];

    if (!priceData) {
      logger.warn("Jupiter: no SOL price data returned");
      return cachedSolPrice?.price ?? 0;
    }

    const price = parseFloat(priceData.price);
    cachedSolPrice = { price, fetchedAt: Date.now() };

    logger.info(`Jupiter: SOL/USD = $${price.toFixed(2)}`);
    return price;
  } catch (err) {
    logger.error("Jupiter getSolPrice error", err);
    // Return stale cache if available, otherwise 0
    return cachedSolPrice?.price ?? 0;
  }
}
