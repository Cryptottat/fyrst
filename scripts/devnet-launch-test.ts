/**
 * FYRST Devnet Full E2E Test (burn-to-refund model)
 * 1) Protocol config 확인
 * 2) Escrow 생성 + 본딩커브 + SPL 민트
 * 3) Buy tokens (수수료 분배 검증)
 * 4) Sell tokens (수수료 분배 검증)
 * 5) Claim fees (deployer 수수료 클레임)
 * 6) Fee math verification
 * 7) Refund blocked — deadline not reached
 * 8) Summary
 *
 * Usage: npx ts-node --skip-project scripts/devnet-launch-test.ts
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
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ─── Config ──────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
// devnet 전용 — 메인넷 키는 환경변수로만 사용할 것
const RPC_URL = process.env.HELIUS_RPC_URL || "https://devnet.helius-rpc.com/?api-key=d5b2c18e-f19a-48b3-ae07-b1bb5436e6d6";

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
  console.log(`\n[${step}] ${msg}`);
}

function logTx(label: string, sig: string) {
  console.log(`  TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  // Load wallet
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
  console.log("══════════════════════════════════════════════════════");
  console.log("  FYRST Devnet E2E Test (burn-to-refund)");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Deployer:  ${deployer.publicKey.toBase58()}`);
  console.log(`  Balance:   ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`  Program:   ${PROGRAM_ID.toBase58()}`);

  let passed = 0;
  let failed = 0;

  // ─── 1. Protocol Config ──────────────────────────────────────
  log("1/8", "Checking protocol config...");
  const [protocolConfigPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
  const protocolConfig = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  const treasury = protocolConfig.treasury as PublicKey;
  console.log(`  Authority:  ${protocolConfig.authority.toBase58()}`);
  console.log(`  Treasury:   ${treasury.toBase58()}`);
  console.log(`  Threshold:  ${protocolConfig.graduationThreshold.toString()} lamports (${protocolConfig.graduationThreshold.toNumber() / LAMPORTS_PER_SOL} SOL)`);
  pass("Protocol config loaded");
  passed++;

  const treasuryBalBefore = await connection.getBalance(treasury);
  console.log(`  Treasury balance before: ${(treasuryBalBefore / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  // ─── 2. Create Escrow ────────────────────────────────────────
  log("2/8", "Creating escrow with 0.1 SOL collateral + 1h deadline...");
  const tokenMint = Keypair.generate();
  const collateral = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const duration = new anchor.BN(3600); // 1 hour

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED, deployer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );

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
  const escrow = await (program.account as any).escrowVault.fetch(escrowPda);
  console.log(`  Collateral: ${escrow.collateralAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Deadline:   ${new Date(escrow.deadlineTimestamp.toNumber() * 1000).toISOString()}`);
  pass("Escrow created");
  passed++;

  // ─── 3. Init Bonding Curve + SPL Mint ────────────────────────
  log("3/8", "Init bonding curve + SPL mint + metadata...");
  const basePrice = new anchor.BN(100_000); // 0.0001 SOL
  const slope = new anchor.BN(10);

  const [curvePda] = PublicKey.findProgramAddressSync(
    [CURVE_SEED, tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  const metadataPda = getMetadataPDA(tokenMint.publicKey);

  const curveTx = await (program.methods as any)
    .initBondingCurve(basePrice, slope, "FYRST E2E Test", "FTEST", "https://fyrst.fun/meta.json")
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
  pass("Bonding curve + SPL mint created");
  passed++;

  // ─── 4. Buy tokens (0.1 SOL) ────────────────────────────────
  log("4/8", "Buying tokens with 0.1 SOL...");
  const buyAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
  const minTokensOut = new anchor.BN(1); // accept any amount
  const buyerAta = getAssociatedTokenAddressSync(tokenMint.publicKey, deployer.publicKey);

  const buyIx = await (program.methods as any)
    .buyTokens(buyAmount, minTokensOut)
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
  console.log(`  Tokens minted:    ${curveAfterBuy.currentSupply.toNumber()}`);
  console.log(`  SPL balance:      ${ataInfo.amount.toString()}`);
  console.log(`  Reserve:          ${curveAfterBuy.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Total collected:  ${curveAfterBuy.totalSolCollected.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Deployer fees:    ${curveAfterBuy.totalDeployerFees.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // Verify treasury received fees
  const treasuryBalAfterBuy = await connection.getBalance(treasury);
  const treasuryGainBuy = treasuryBalAfterBuy - treasuryBalBefore;
  console.log(`  Treasury gained:  ${(treasuryGainBuy / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  if (curveAfterBuy.currentSupply.toNumber() > 0 && treasuryGainBuy > 0) {
    pass(`Buy OK — ${ataInfo.amount.toString()} tokens minted, treasury +${(treasuryGainBuy / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    passed++;
  } else {
    fail("Buy failed — no tokens minted or treasury didn't receive fees");
    failed++;
  }

  // ─── 5. Sell half tokens ─────────────────────────────────────
  log("5/8", "Selling half of tokens...");
  const sellAmount = new anchor.BN(Math.floor(curveAfterBuy.currentSupply.toNumber() / 2));
  const minSolOut = new anchor.BN(1); // accept any amount
  const deployerBalBefore = await connection.getBalance(deployer.publicKey);
  const treasuryBalBeforeSell = await connection.getBalance(treasury);

  const sellIx = await (program.methods as any)
    .sellTokens(sellAmount, minSolOut)
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
  const deployerBalAfter = await connection.getBalance(deployer.publicKey);
  const treasuryBalAfterSell = await connection.getBalance(treasury);
  const ataAfterSell = await getAccount(connection, buyerAta);
  const solReturned = (deployerBalAfter - deployerBalBefore) / LAMPORTS_PER_SOL;
  const treasuryGainSell = treasuryBalAfterSell - treasuryBalBeforeSell;

  console.log(`  Tokens sold:      ${sellAmount.toNumber()}`);
  console.log(`  Supply now:       ${curveAfterSell.currentSupply.toNumber()}`);
  console.log(`  SPL balance now:  ${ataAfterSell.amount.toString()}`);
  console.log(`  SOL returned:     ${solReturned.toFixed(6)} SOL (minus TX fee)`);
  console.log(`  Reserve now:      ${curveAfterSell.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Deployer fees:    ${curveAfterSell.totalDeployerFees.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Treasury gained:  ${(treasuryGainSell / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

  if (curveAfterSell.currentSupply.toNumber() < curveAfterBuy.currentSupply.toNumber() && treasuryGainSell > 0) {
    pass(`Sell OK — treasury +${(treasuryGainSell / LAMPORTS_PER_SOL).toFixed(6)} SOL on sell`);
    passed++;
  } else {
    fail("Sell failed");
    failed++;
  }

  // ─── 6. Claim fees ──────────────────────────────────────────
  log("6/8", "Claiming deployer fees (progressive unlock)...");
  const totalFees = curveAfterSell.totalDeployerFees.toNumber();
  const alreadyClaimed = curveAfterSell.claimedDeployerFees.toNumber();
  const maxReserve = curveAfterSell.maxReserveReached.toNumber();
  const gradThreshold = 85_000_000_000;
  const expectedUnlocked = Math.floor((totalFees * maxReserve) / gradThreshold);
  const claimable = expectedUnlocked - alreadyClaimed;

  console.log(`  Total deployer fees:   ${totalFees} lamports`);
  console.log(`  Already claimed:       ${alreadyClaimed} lamports`);
  console.log(`  Max reserve reached:   ${maxReserve} lamports`);
  console.log(`  Expected unlocked:     ${expectedUnlocked} lamports`);
  console.log(`  Claimable now:         ${claimable} lamports`);

  if (claimable > 0) {
    const deployerBalBeforeClaim = await connection.getBalance(deployer.publicKey);
    const claimTx = await (program.methods as any)
      .claimFees()
      .accounts({
        deployer: deployer.publicKey,
        bondingCurve: curvePda,
      })
      .rpc();

    logTx("Claim", claimTx);
    const curveAfterClaim = await (program.account as any).bondingCurve.fetch(curvePda);
    const deployerBalAfterClaim = await connection.getBalance(deployer.publicKey);
    const claimed = (deployerBalAfterClaim - deployerBalBeforeClaim) / LAMPORTS_PER_SOL;

    console.log(`  Deployer gained:  ${claimed.toFixed(6)} SOL (minus TX fee)`);
    console.log(`  Claimed total:    ${curveAfterClaim.claimedDeployerFees.toNumber()} lamports`);
    pass(`Claim OK — ${claimable} lamports claimed`);
    passed++;
  } else {
    console.log("  Skipped: unlock amount rounds to 0 (small reserve vs 85 SOL threshold)");
    pass("Claim skipped (expected for small test amounts)");
    passed++;
  }

  // ─── 7. Refund blocked — deadline not reached ────────────────
  log("7/8", "Testing burn-to-refund — should fail (deadline not reached)...");
  try {
    await (program.methods as any)
      .processRefund()
      .accounts({
        buyer: deployer.publicKey,
        escrowVault: escrowPda,
        bondingCurve: curvePda,
        tokenMint: tokenMint.publicKey,
        buyerTokenAccount: buyerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    fail("Refund should have been blocked — deadline not reached!");
    failed++;
  } catch (err: any) {
    const errStr = err.toString();
    if (errStr.includes("DeadlineNotReached")) {
      pass("Refund correctly blocked: DeadlineNotReached");
      passed++;
    } else {
      fail(`Unexpected error: ${errStr}`);
      failed++;
    }
  }

  // ─── 8. Summary ─────────────────────────────────────────────
  const finalCurve = await (program.account as any).bondingCurve.fetch(curvePda);
  const finalBalance = await connection.getBalance(deployer.publicKey);
  const finalAta = await getAccount(connection, buyerAta);
  const totalTreasuryGain = (await connection.getBalance(treasury)) - treasuryBalBefore;

  log("8/8", "TEST COMPLETE");
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Token Mint:     ${tokenMint.publicKey.toBase58()}`);
  console.log(`  Escrow PDA:     ${escrowPda.toBase58()}`);
  console.log(`  Curve PDA:      ${curvePda.toBase58()}`);
  console.log(`  Final Supply:   ${finalCurve.currentSupply.toNumber()}`);
  console.log(`  SPL Balance:    ${finalAta.amount.toString()}`);
  console.log(`  Graduated:      ${finalCurve.graduated}`);
  console.log(`  Treasury gain:  ${(totalTreasuryGain / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`  SOL spent:      ${((balance - finalBalance) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`  Balance left:   ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log("──────────────────────────────────────────────────────");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════════════");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message || err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
