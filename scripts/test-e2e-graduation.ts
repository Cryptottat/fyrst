/**
 * FYRST E2E Graduation Test
 *
 * 1) Launch token (escrow + bonding curve)
 * 2) Pre-graduation buy (0.1 SOL)
 * 3) Pre-graduation sell (half)
 * 4) Buy to graduation (5 SOL threshold)
 * 5) Wait for auto-graduation cranker to create Raydium pool
 * 6) Raydium buy (0.01 SOL → token)
 * 7) Raydium sell (tokens → SOL)
 *
 * Usage: npx ts-node --skip-project scripts/test-e2e-graduation.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ─── Config ──────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const RAYDIUM_CPMM = new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const RPC_URL = process.env.HELIUS_RPC_URL;
if (!RPC_URL) throw new Error("HELIUS_RPC_URL env var is required");

const ESCROW_SEED = Buffer.from("escrow");
const CURVE_SEED = Buffer.from("curve");
const PROTOCOL_SEED = Buffer.from("protocol");

// ─── Helpers ─────────────────────────────────────────────────────
function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

function log(step: string, msg: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  [${step}] ${msg}`);
  console.log("═".repeat(60));
}

function logTx(label: string, sig: string) {
  console.log(`  TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

function pass(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  ❌ ${msg}`); }

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  const walletPath = path.resolve(process.env.HOME || "~", ".config/solana/id.json");
  const rawKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(rawKey));

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(deployer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../target/idl/fyrst.json"), "utf-8"));
  const program = new anchor.Program(idl, provider);

  const balance = await connection.getBalance(deployer.publicKey);
  console.log("\n" + "═".repeat(60));
  console.log("  FYRST E2E Graduation Test");
  console.log("═".repeat(60));
  console.log(`  Deployer:  ${deployer.publicKey.toBase58()}`);
  console.log(`  Balance:   ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`  Program:   ${PROGRAM_ID.toBase58()}`);

  let passed = 0;
  let failed = 0;

  // ─── 1. Protocol Config ──────────────────────────────────────
  log("1/7", "Checking protocol config...");
  const [protocolConfigPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
  const protocolConfig = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  const treasury = protocolConfig.treasury as PublicKey;
  const gradThreshold = protocolConfig.graduationThreshold.toNumber();
  console.log(`  Treasury:   ${treasury.toBase58()}`);
  console.log(`  Threshold:  ${gradThreshold / LAMPORTS_PER_SOL} SOL`);
  pass("Protocol config loaded");
  passed++;

  // ─── 2. Create Escrow + Bonding Curve ─────────────────────────
  log("2/7", "Creating escrow + bonding curve...");
  const tokenMint = Keypair.generate();
  const collateral = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const duration = new anchor.BN(3600);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED, deployer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  const [curvePda] = PublicKey.findProgramAddressSync(
    [CURVE_SEED, tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  const metadataPda = getMetadataPDA(tokenMint.publicKey);

  // Escrow
  const escrowTx = await (program.methods as any)
    .createEscrow(collateral, duration)
    .accounts({
      deployer: deployer.publicKey,
      tokenMint: tokenMint.publicKey,
      escrowVault: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  logTx("Escrow", escrowTx);

  // Bonding Curve
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  const curveTx = await (program.methods as any)
    .initBondingCurve(
      new anchor.BN(100_000), // basePrice
      new anchor.BN(10),      // slope
      `E2E Grad ${ts}`,
      `EG${ts}`,
      "https://fyrst.fun/meta.json",
    )
    .accounts({
      deployer: deployer.publicKey,
      tokenMint: tokenMint.publicKey,
      bondingCurve: curvePda,
      metadataAccount: metadataPda,
      metadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([tokenMint])
    .rpc();
  logTx("Curve", curveTx);
  console.log(`  Mint: ${tokenMint.publicKey.toBase58()}`);
  pass("Escrow + bonding curve created");
  passed++;

  // ─── 3. Pre-graduation BUY (0.1 SOL) ──────────────────────────
  log("3/7", "Pre-graduation BUY (0.1 SOL)...");
  const buyerAta = getAssociatedTokenAddressSync(tokenMint.publicKey, deployer.publicKey);

  const buyIx = await (program.methods as any)
    .buyTokens(new anchor.BN(0.1 * LAMPORTS_PER_SOL), new anchor.BN(1))
    .accounts({
      buyer: deployer.publicKey,
      bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey,
      buyerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const buyTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(buyIx);
  const buySig = await provider.sendAndConfirm(buyTx, []);
  logTx("Buy", buySig);

  const curveAfterBuy = await (program.account as any).bondingCurve.fetch(curvePda);
  const ataInfo = await getAccount(connection, buyerAta);
  console.log(`  Tokens:  ${ataInfo.amount.toString()} (atomic)`);
  console.log(`  Reserve: ${curveAfterBuy.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  pass("Pre-graduation buy OK");
  passed++;

  // ─── 4. Pre-graduation SELL (half) ─────────────────────────────
  log("4/7", "Pre-graduation SELL (half tokens)...");
  const sellAmount = new anchor.BN(Math.floor(curveAfterBuy.currentSupply.toNumber() / 2));

  const sellIx = await (program.methods as any)
    .sellTokens(sellAmount, new anchor.BN(1))
    .accounts({
      seller: deployer.publicKey,
      bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey,
      sellerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const sellTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }))
    .add(sellIx);
  const sellSig = await provider.sendAndConfirm(sellTx, []);
  logTx("Sell", sellSig);

  const curveAfterSell = await (program.account as any).bondingCurve.fetch(curvePda);
  console.log(`  Supply now: ${curveAfterSell.currentSupply.toNumber()}`);
  console.log(`  Reserve:    ${curveAfterSell.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Graduated:  ${curveAfterSell.graduated}`);
  pass("Pre-graduation sell OK");
  passed++;

  // ─── 5. BUY to graduation ──────────────────────────────────────
  log("5/7", `Buying enough to graduate (need ${gradThreshold / LAMPORTS_PER_SOL} SOL reserve)...`);
  const currentReserve = curveAfterSell.reserveBalance.toNumber();
  const needed = gradThreshold - currentReserve;
  // Add 2% buffer for fees (1% fee means we need ~1.01x)
  const buyForGrad = Math.ceil(needed * 1.02);
  console.log(`  Current reserve: ${currentReserve / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Need:            ${needed / LAMPORTS_PER_SOL} SOL more`);
  console.log(`  Buying:          ${buyForGrad / LAMPORTS_PER_SOL} SOL (with fee buffer)`);

  const gradBuyIx = await (program.methods as any)
    .buyTokens(new anchor.BN(buyForGrad), new anchor.BN(1))
    .accounts({
      buyer: deployer.publicKey,
      bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey,
      buyerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const gradBuyTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(gradBuyIx);
  const gradBuySig = await provider.sendAndConfirm(gradBuyTx, []);
  logTx("Graduation Buy", gradBuySig);

  const curveAfterGrad = await (program.account as any).bondingCurve.fetch(curvePda);
  console.log(`  Reserve:     ${curveAfterGrad.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Graduated:   ${curveAfterGrad.graduated}`);
  console.log(`  DexMigrated: ${curveAfterGrad.dexMigrated}`);

  if (curveAfterGrad.graduated) {
    pass("Token graduated!");
    passed++;
  } else {
    fail(`Not graduated yet! Reserve: ${curveAfterGrad.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL < ${gradThreshold / LAMPORTS_PER_SOL} SOL`);
    failed++;
    console.log("\nAborting — graduation not reached.");
    process.exit(1);
  }

  // ─── 6. Wait for cranker to create Raydium pool ────────────────
  log("6/7", "Waiting for auto-graduation cranker...");
  console.log("  The cranker on Railway should detect the graduation log and auto-migrate.");
  console.log("  Polling on-chain for dexMigrated=true...");

  let dexMigrated = false;
  const maxWaitMs = 120_000; // 2 minutes
  const pollInterval = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const curve = await (program.account as any).bondingCurve.fetch(curvePda);
    if (curve.dexMigrated) {
      dexMigrated = true;
      console.log(`  Raydium pool: ${curve.raydiumPool.toBase58()}`);
      console.log(`  Waited: ${((Date.now() - startTime) / 1000).toFixed(0)}s`);
      break;
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    process.stdout.write(`\r  Waiting... ${elapsed}s / ${maxWaitMs / 1000}s`);
    await sleep(pollInterval);
  }
  console.log(); // newline

  if (dexMigrated) {
    pass("Auto-graduation cranker migrated to Raydium!");
    passed++;
  } else {
    fail("Cranker did not migrate within 2 minutes. Check Railway logs.");
    failed++;

    // Try manual graduation as fallback
    console.log("\n  Attempting manual graduation as fallback...");
    try {
      // Run test-graduation.ts logic inline
      console.log("  (skipping manual — check cranker logs on Railway)");
    } catch {}

    console.log("\n  Skipping Raydium trading tests.");
    printSummary(passed, failed, tokenMint.publicKey);
    process.exit(1);
  }

  // ─── 7. Raydium BUY + SELL ─────────────────────────────────────
  log("7/7", "Testing Raydium trading (buy + sell)...");

  const curveForPool = await (program.account as any).bondingCurve.fetch(curvePda);
  const poolState = curveForPool.raydiumPool as PublicKey;

  // Derive Raydium accounts
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)], RAYDIUM_CPMM);
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")], RAYDIUM_CPMM);

  const wsolIsToken0 = Buffer.compare(WSOL_MINT.toBuffer(), tokenMint.publicKey.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : tokenMint.publicKey;
  const token1Mint = wsolIsToken0 ? tokenMint.publicKey : WSOL_MINT;

  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()], RAYDIUM_CPMM);
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()], RAYDIUM_CPMM);
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()], RAYDIUM_CPMM);

  const payerTokenAta = getAssociatedTokenAddressSync(tokenMint.publicKey, deployer.publicKey);
  const payerWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, deployer.publicKey);

  // --- Raydium BUY: SOL → Token ---
  console.log("\n  --- Raydium BUY (0.01 SOL → Token) ---");
  const swapBuyAmount = 10_000_000; // 0.01 SOL

  // swap_base_input discriminator
  const swapDiscriminator = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222]);
  const swapBuyData = Buffer.alloc(24);
  swapDiscriminator.copy(swapBuyData, 0);
  swapBuyData.writeBigUInt64LE(BigInt(swapBuyAmount), 8);
  swapBuyData.writeBigUInt64LE(BigInt(0), 16); // minOut=0 for test

  const raydiumBuyTx = new Transaction();
  raydiumBuyTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

  // Ensure WSOL ATA
  const wsolAtaInfo = await connection.getAccountInfo(payerWsolAta);
  if (!wsolAtaInfo) {
    raydiumBuyTx.add(createAssociatedTokenAccountInstruction(deployer.publicKey, payerWsolAta, deployer.publicKey, WSOL_MINT));
  }
  // Wrap SOL
  raydiumBuyTx.add(SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: payerWsolAta, lamports: swapBuyAmount }));
  raydiumBuyTx.add(createSyncNativeInstruction(payerWsolAta));

  // Input = WSOL, Output = Token
  const inputVaultBuy = wsolIsToken0 ? token0Vault : token1Vault;
  const outputVaultBuy = wsolIsToken0 ? token1Vault : token0Vault;

  raydiumBuyTx.add({
    programId: RAYDIUM_CPMM,
    keys: [
      { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
      { pubkey: raydiumAuthority, isSigner: false, isWritable: false },
      { pubkey: ammConfig, isSigner: false, isWritable: false },
      { pubkey: poolState, isSigner: false, isWritable: true },
      { pubkey: payerWsolAta, isSigner: false, isWritable: true },     // input
      { pubkey: payerTokenAta, isSigner: false, isWritable: true },    // output
      { pubkey: inputVaultBuy, isSigner: false, isWritable: true },
      { pubkey: outputVaultBuy, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: WSOL_MINT, isSigner: false, isWritable: false },       // input mint
      { pubkey: tokenMint.publicKey, isSigner: false, isWritable: false }, // output mint
      { pubkey: observationState, isSigner: false, isWritable: true },
    ],
    data: swapBuyData,
  });

  try {
    const tokenBalBefore = await getAccount(connection, payerTokenAta).then(a => Number(a.amount)).catch(() => 0);
    const raydiumBuySig = await provider.sendAndConfirm(raydiumBuyTx, []);
    logTx("Raydium Buy", raydiumBuySig);
    const tokenBalAfter = await getAccount(connection, payerTokenAta).then(a => Number(a.amount));
    const tokensReceived = tokenBalAfter - tokenBalBefore;
    console.log(`  Tokens received: ${tokensReceived} (atomic, ${(tokensReceived / 1e6).toFixed(2)} whole)`);
    pass("Raydium BUY OK!");
    passed++;
  } catch (err: any) {
    fail(`Raydium BUY failed: ${err.message}`);
    if (err.logs) err.logs.forEach((l: string) => console.log(`    ${l}`));
    failed++;
  }

  // --- Raydium SELL: Token → SOL ---
  console.log("\n  --- Raydium SELL (half tokens → SOL) ---");
  const tokenBalForSell = await getAccount(connection, payerTokenAta).then(a => Number(a.amount)).catch(() => 0);
  const sellTokenAmount = Math.floor(tokenBalForSell / 2);

  if (sellTokenAmount <= 0) {
    fail("No tokens to sell on Raydium");
    failed++;
  } else {
    console.log(`  Selling: ${sellTokenAmount} atomic (${(sellTokenAmount / 1e6).toFixed(2)} whole)`);

    const swapSellData = Buffer.alloc(24);
    swapDiscriminator.copy(swapSellData, 0);
    swapSellData.writeBigUInt64LE(BigInt(sellTokenAmount), 8);
    swapSellData.writeBigUInt64LE(BigInt(0), 16);

    // Input = Token, Output = WSOL
    const inputVaultSell = wsolIsToken0 ? token1Vault : token0Vault;
    const outputVaultSell = wsolIsToken0 ? token0Vault : token1Vault;

    const raydiumSellTx = new Transaction();
    raydiumSellTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

    // Ensure WSOL ATA exists for receiving
    const wsolAtaInfo2 = await connection.getAccountInfo(payerWsolAta);
    if (!wsolAtaInfo2) {
      raydiumSellTx.add(createAssociatedTokenAccountInstruction(deployer.publicKey, payerWsolAta, deployer.publicKey, WSOL_MINT));
    }

    raydiumSellTx.add({
      programId: RAYDIUM_CPMM,
      keys: [
        { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
        { pubkey: raydiumAuthority, isSigner: false, isWritable: false },
        { pubkey: ammConfig, isSigner: false, isWritable: false },
        { pubkey: poolState, isSigner: false, isWritable: true },
        { pubkey: payerTokenAta, isSigner: false, isWritable: true },    // input
        { pubkey: payerWsolAta, isSigner: false, isWritable: true },     // output
        { pubkey: inputVaultSell, isSigner: false, isWritable: true },
        { pubkey: outputVaultSell, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: tokenMint.publicKey, isSigner: false, isWritable: false }, // input mint
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },           // output mint
        { pubkey: observationState, isSigner: false, isWritable: true },
      ],
      data: swapSellData,
    });

    // Close WSOL ATA after to unwrap
    raydiumSellTx.add(createCloseAccountInstruction(payerWsolAta, deployer.publicKey, deployer.publicKey));

    try {
      const solBefore = await connection.getBalance(deployer.publicKey);
      const raydiumSellSig = await provider.sendAndConfirm(raydiumSellTx, []);
      logTx("Raydium Sell", raydiumSellSig);
      const solAfter = await connection.getBalance(deployer.publicKey);
      const solGained = (solAfter - solBefore) / LAMPORTS_PER_SOL;
      console.log(`  SOL received: ${solGained.toFixed(6)} SOL (minus tx fee)`);
      pass("Raydium SELL OK!");
      passed++;
    } catch (err: any) {
      fail(`Raydium SELL failed: ${err.message}`);
      if (err.logs) err.logs.forEach((l: string) => console.log(`    ${l}`));
      failed++;
    }
  }

  // ─── Summary ───────────────────────────────────────────────────
  printSummary(passed, failed, tokenMint.publicKey);
}

function printSummary(passed: number, failed: number, mint: PublicKey) {
  console.log("\n" + "═".repeat(60));
  console.log("  TEST SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Token Mint: ${mint.toBase58()}`);
  console.log(`  Results:    ${passed} passed, ${failed} failed`);
  console.log("═".repeat(60));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message || err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
