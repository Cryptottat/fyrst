import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  AccountInfo,
  RpcResponseAndContext,
  TokenAmount,
} from "@solana/web3.js";
import { config } from "../config";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenAccountInfo {
  mint: string;
  owner: string;
  tokenAccount: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}

export interface WalletBalance {
  address: string;
  lamports: number;
  sol: number;
}

// ---------------------------------------------------------------------------
// Singleton Connection
// ---------------------------------------------------------------------------

let connectionInstance: Connection | null = null;

/**
 * Get (or create) a singleton Solana RPC connection using the QuickNode endpoint.
 *
 * The connection is lazily initialized on first use and reused for all
 * subsequent calls.
 */
export function getConnection(): Connection {
  if (!connectionInstance) {
    const rpcUrl = config.quicknodeRpcUrl;
    logger.info(`Solana RPC: initializing connection to ${rpcUrl.split("?")[0]}...`);
    connectionInstance = new Connection(rpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
    logger.info("Solana RPC: connection initialized");
  }
  return connectionInstance;
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (err: unknown) {
      lastError = err;

      // Check for rate-limit or transient errors
      const isRetryable =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("Too Many Requests") ||
          err.message.includes("timeout") ||
          err.message.includes("ECONNRESET") ||
          err.message.includes("socket hang up") ||
          err.message.includes("503"));

      if (isRetryable && attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(
          `Solana RPC ${label}: retrying in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`
        );
        await sleep(delayMs);
      } else if (attempt >= MAX_RETRIES) {
        break;
      } else {
        // Non-retryable error -- throw immediately
        throw err;
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/**
 * Get the SOL balance for a wallet address.
 */
export async function getBalance(address: string): Promise<WalletBalance> {
  logger.info(`Solana RPC: fetching balance for ${address}`);

  const connection = getConnection();

  const lamports = await withRetry(
    () => connection.getBalance(new PublicKey(address)),
    "getBalance"
  );

  const sol = lamports / LAMPORTS_PER_SOL;
  logger.info(`Solana RPC: ${address} balance = ${sol} SOL`);

  return {
    address,
    lamports,
    sol,
  };
}

// ---------------------------------------------------------------------------
// Token accounts
// ---------------------------------------------------------------------------

/**
 * Fetch all SPL token accounts for a wallet address.
 *
 * Returns parsed token account info including mint, balance, and decimals.
 */
export async function getTokenAccounts(
  walletAddress: string
): Promise<TokenAccountInfo[]> {
  logger.info(`Solana RPC: fetching token accounts for ${walletAddress}`);

  const connection = getConnection();
  const owner = new PublicKey(walletAddress);

  const response = await withRetry(
    () =>
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      }),
    "getTokenAccounts"
  );

  const accounts: TokenAccountInfo[] = response.value.map((item) => {
    const parsed = item.account.data.parsed as {
      info: {
        mint: string;
        owner: string;
        tokenAmount: TokenAmount;
      };
    };
    const info = parsed.info;

    return {
      mint: info.mint,
      owner: info.owner,
      tokenAccount: item.pubkey.toBase58(),
      amount: info.tokenAmount.amount,
      decimals: info.tokenAmount.decimals,
      uiAmount: info.tokenAmount.uiAmount ?? 0,
    };
  });

  // Filter out zero-balance accounts
  const nonZero = accounts.filter((a) => a.uiAmount > 0);

  logger.info(
    `Solana RPC: found ${nonZero.length} token accounts (${accounts.length} total) for ${walletAddress}`
  );
  return nonZero;
}

// ---------------------------------------------------------------------------
// Transaction details
// ---------------------------------------------------------------------------

/**
 * Fetch detailed parsed transaction data for a given signature.
 */
export async function getTransaction(
  signature: string
): Promise<ParsedTransactionWithMeta | null> {
  logger.info(`Solana RPC: fetching transaction ${signature}`);

  const connection = getConnection();

  const tx = await withRetry(
    () =>
      connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      }),
    "getTransaction"
  );

  if (!tx) {
    logger.warn(`Solana RPC: transaction ${signature} not found`);
    return null;
  }

  logger.info(`Solana RPC: fetched transaction ${signature} (slot ${tx.slot})`);
  return tx;
}

// ---------------------------------------------------------------------------
// WebSocket subscription
// ---------------------------------------------------------------------------

/**
 * Subscribe to account changes via WebSocket.
 *
 * Returns a subscription ID that can be used to unsubscribe later.
 *
 * @param address - The Solana account public key to watch
 * @param callback - Called with updated AccountInfo on each change
 * @returns Subscription ID (number)
 */
export function subscribeToAccount(
  address: string,
  callback: (
    accountInfo: AccountInfo<Buffer>,
    context: { slot: number }
  ) => void
): number {
  logger.info(`Solana RPC: subscribing to account changes for ${address}`);

  const connection = getConnection();
  const publicKey = new PublicKey(address);

  const subscriptionId = connection.onAccountChange(
    publicKey,
    (accountInfo: AccountInfo<Buffer>, context: { slot: number }) => {
      logger.debug(
        `Solana RPC: account change detected for ${address} at slot ${context.slot}`
      );
      callback(accountInfo, context);
    },
    "confirmed"
  );

  logger.info(
    `Solana RPC: subscribed to ${address} (subscriptionId=${subscriptionId})`
  );
  return subscriptionId;
}

/**
 * Unsubscribe from account changes.
 */
export async function unsubscribeFromAccount(
  subscriptionId: number
): Promise<void> {
  logger.info(`Solana RPC: unsubscribing (subscriptionId=${subscriptionId})`);

  const connection = getConnection();
  await connection.removeAccountChangeListener(subscriptionId);

  logger.info(`Solana RPC: unsubscribed (subscriptionId=${subscriptionId})`);
}
