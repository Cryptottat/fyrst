import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { config } from "../config";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";
import idl from "../idl/fyrst.json";

// ---------------------------------------------------------------------------
// Constants — devnet / mainnet switch
// ---------------------------------------------------------------------------

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const PROGRAM_ID = new PublicKey(config.programId);

const RAYDIUM_CPMM = config.isDevnet
  ? new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb")
  : new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C");

const CREATE_POOL_FEE = config.isDevnet
  ? new PublicKey("3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy")
  : new PublicKey("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let crankerKeypair: Keypair | null = null;
let connection: Connection | null = null;
let program: Program | null = null;

/** Tracks mints currently being graduated to prevent concurrent execution */
const inProgress = new Set<string>();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initCranker(): boolean {
  const keyJson = config.crankerPrivateKey;
  if (!keyJson) {
    logger.warn("CRANKER_PRIVATE_KEY not set — graduation cranker disabled");
    return false;
  }

  try {
    const secret = JSON.parse(keyJson) as number[];
    crankerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch (err) {
    logger.error("Failed to parse CRANKER_PRIVATE_KEY", err);
    return false;
  }

  const wsUrl = config.solanaRpc
    .replace("https://", "wss://")
    .replace("http://", "ws://");
  connection = new Connection(config.solanaRpc, {
    wsEndpoint: wsUrl,
    commitment: "confirmed",
  });

  const wallet = new Wallet(crankerKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  program = new Program(idl as any, provider);

  logger.info(
    `Graduation cranker initialized — payer=${crankerKeypair.publicKey.toBase58()}`,
  );
  return true;
}

// ---------------------------------------------------------------------------
// Core graduation execution
// ---------------------------------------------------------------------------

export async function executeGraduation(tokenMint: string): Promise<void> {
  if (!crankerKeypair || !connection || !program) {
    logger.warn("Cranker not initialized — skipping graduation");
    return;
  }

  const mintPk = new PublicKey(tokenMint);
  const payer = crankerKeypair;

  // 1. Derive bonding curve PDA
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("curve"), mintPk.toBuffer()],
    PROGRAM_ID,
  );

  // 2. Fetch on-chain bonding curve account
  let curveData: any;
  try {
    curveData = await (program.account as any).bondingCurve.fetch(bondingCurve);
  } catch (err) {
    logger.error(`Failed to fetch bonding curve for ${tokenMint}`, err);
    return;
  }

  if (!curveData.graduated) {
    logger.info(`Token ${tokenMint} not graduated on-chain — skipping`);
    return;
  }
  if (curveData.dexMigrated) {
    logger.info(`Token ${tokenMint} already DEX-migrated — skipping`);
    return;
  }

  const reserveSol = Number(curveData.reserveBalance);
  if (reserveSol === 0) {
    logger.warn(`Token ${tokenMint} has zero reserve — skipping`);
    return;
  }

  // 3. Derive ammConfig and read pool creation fee from it
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)],
    RAYDIUM_CPMM,
  );

  const ammConfigInfo = await connection.getAccountInfo(ammConfig);
  if (!ammConfigInfo) {
    logger.error(`Failed to fetch Raydium AmmConfig for ${tokenMint}`);
    return;
  }
  // AmmConfig layout: discriminator(8) + bump(1) + disable(1) + index(2)
  //   + trade_fee(8) + protocol_fee(8) + fund_fee(8) + create_pool_fee(8)
  const poolCreationFee = Number(
    ammConfigInfo.data.readBigUInt64LE(36),
  );
  const liquiditySol = reserveSol - poolCreationFee;
  if (liquiditySol <= 0) {
    logger.error(
      `Reserve ${reserveSol / 1e9} SOL <= pool creation fee ${poolCreationFee / 1e9} SOL for ${tokenMint}`,
    );
    return;
  }

  logger.info(
    `Graduation: reserve=${reserveSol / 1e9} SOL, poolFee=${poolCreationFee / 1e9} SOL, liquidity=${liquiditySol / 1e9} SOL`,
  );

  // 4. Check payer balance (need reserve + ~0.05 SOL for TX fees/rent)
  const payerBalance = await connection.getBalance(payer.publicKey);
  const requiredBalance = reserveSol + 50_000_000;
  if (payerBalance < requiredBalance) {
    logger.error(
      `Cranker wallet insufficient balance: has ${payerBalance / 1e9} SOL, needs ${requiredBalance / 1e9} SOL for ${tokenMint}`,
    );
    return;
  }

  // 6. Derive Raydium CPMM PDAs
  const payerTokenAccount = getAssociatedTokenAddressSync(mintPk, payer.publicKey);
  const payerWsolAccount = getAssociatedTokenAddressSync(WSOL_MINT, payer.publicKey);
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")],
    RAYDIUM_CPMM,
  );

  const wsolIsToken0 =
    Buffer.compare(WSOL_MINT.toBuffer(), mintPk.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : mintPk;
  const token1Mint = wsolIsToken0 ? mintPk : WSOL_MINT;

  const [poolState] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      ammConfig.toBuffer(),
      token0Mint.toBuffer(),
      token1Mint.toBuffer(),
    ],
    RAYDIUM_CPMM,
  );
  const [lpMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), poolState.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()],
    RAYDIUM_CPMM,
  );
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()],
    RAYDIUM_CPMM,
  );
  const creatorLpToken = getAssociatedTokenAddressSync(lpMint, payer.publicKey);

  // 7. Build multi-IX transaction
  const tx = new Transaction();

  // IX 0: Compute budget
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  // IX 1: Create payer's WSOL ATA if needed
  const wsolAtaInfo = await connection.getAccountInfo(payerWsolAccount);
  if (!wsolAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        payerWsolAccount,
        payer.publicKey,
        WSOL_MINT,
      ),
    );
  }

  // IX 2: Create payer's token ATA if needed
  const tokenAtaInfo = await connection.getAccountInfo(payerTokenAccount);
  if (!tokenAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        payerTokenAccount,
        payer.publicKey,
        mintPk,
      ),
    );
  }

  // IX 3: Transfer liquidity SOL to payer's WSOL ATA (reserve minus pool fee)
  //        Bonding curve reimburses full reserve; extra covers Raydium's pool creation fee
  tx.add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: payerWsolAccount,
      lamports: liquiditySol,
    }),
  );

  // IX 4: Sync native to update WSOL balance
  tx.add(createSyncNativeInstruction(payerWsolAccount));

  // IX 5: graduate_to_dex
  const methods = program.methods as any;
  const graduateIx = await methods
    .graduateToDex()
    .accounts({
      payer: payer.publicKey,
      bondingCurve,
      tokenMint: mintPk,
      wsolMint: WSOL_MINT,
      payerTokenAccount,
      payerWsolAccount,
      cpSwapProgram: RAYDIUM_CPMM,
      ammConfig,
      raydiumAuthority,
      poolState,
      token0Vault,
      token1Vault,
      createPoolFee: CREATE_POOL_FEE,
      lpMint,
      creatorLpToken,
      observationState,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();
  tx.add(graduateIx);

  // 8. Simulate first
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    logger.error(
      `Graduation simulation failed for ${tokenMint}: ${JSON.stringify(sim.value.err)}`,
    );
    sim.value.logs?.forEach((l) => logger.debug(`  sim log: ${l}`));
    throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}`);
  }

  logger.info(
    `Graduation simulation OK for ${tokenMint} — CU=${sim.value.unitsConsumed}, sending TX...`,
  );

  // 9. Send and confirm
  const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });

  logger.info(`Graduation TX confirmed for ${tokenMint}: ${sig}`);
  // DB update is handled by onchainListener's handleDexMigration() when it detects the log
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

export async function executeWithRetry(
  tokenMint: string,
  maxRetries = 3,
): Promise<void> {
  // Prevent concurrent execution for the same mint
  if (inProgress.has(tokenMint)) {
    logger.info(`Graduation already in progress for ${tokenMint} — skipping`);
    return;
  }

  inProgress.add(tokenMint);
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await executeGraduation(tokenMint);
        return; // Success
      } catch (err) {
        logger.error(
          `Graduation attempt ${attempt}/${maxRetries} failed for ${tokenMint}`,
          err,
        );
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
    logger.error(
      `All ${maxRetries} graduation attempts failed for ${tokenMint}`,
    );
  } finally {
    inProgress.delete(tokenMint);
  }
}

// ---------------------------------------------------------------------------
// Scan for missed graduations (run at server startup)
// ---------------------------------------------------------------------------

export async function scanMissedGraduations(): Promise<void> {
  if (!crankerKeypair) {
    return;
  }

  if (!dbConnected()) {
    logger.warn("DB not connected — skipping missed graduation scan");
    return;
  }

  try {
    const missedTokens = await prisma.token.findMany({
      where: { graduated: true, dexMigrated: false },
      select: { mint: true, name: true },
    });

    if (missedTokens.length === 0) {
      logger.info("No missed graduations found");
      return;
    }

    logger.info(`Found ${missedTokens.length} missed graduation(s) — processing...`);

    for (const token of missedTokens) {
      logger.info(`Processing missed graduation: ${token.name} (${token.mint})`);
      await executeWithRetry(token.mint);
    }

    logger.info("Missed graduation scan complete");
  } catch (err) {
    logger.error("Failed to scan missed graduations", err);
  }
}
