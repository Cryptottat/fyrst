/**
 * FYRST Devnet Launch E2E Test
 * 에스크로 생성 → 본딩커브+SPL민트 → 토큰 구매 → 토큰 판매
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
  console.log(`\n[${ step }] ${ msg }`);
}

function logTx(label: string, sig: string) {
  console.log(`  TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
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
  console.log("══════════════════════════════════════════════════");
  console.log("  FYRST Devnet Launch Test");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Deployer: ${deployer.publicKey.toBase58()}`);
  console.log(`  Balance:  ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`  Program:  ${PROGRAM_ID.toBase58()}`);

  // ─── 1. Verify protocol config ─────────────────────────────
  log("1/6", "Checking protocol config...");
  const [protocolConfigPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
  const protocolConfig = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  console.log(`  Authority: ${protocolConfig.authority.toBase58()}`);
  console.log(`  Treasury:  ${protocolConfig.treasury.toBase58()}`);
  console.log(`  Threshold: ${protocolConfig.graduationThreshold.toString()} lamports`);

  // ─── 2. Create escrow (0.02 SOL collateral) ────────────────
  log("2/6", "Creating escrow with 0.02 SOL collateral...");
  const tokenMint = Keypair.generate();
  const collateral = new anchor.BN(0.02 * LAMPORTS_PER_SOL);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED, deployer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );

  const escrowTx = await (program.methods as any)
    .createEscrow(collateral)
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
  console.log(`  Rugged: ${escrow.rugged} | Released: ${escrow.released}`);

  // ─── 3. Init bonding curve + SPL mint + metadata ───────────
  log("3/6", "Initializing bonding curve + SPL mint + Metaplex metadata...");
  const basePrice = new anchor.BN(100_000);
  const slope = new anchor.BN(10);

  const [curvePda] = PublicKey.findProgramAddressSync(
    [CURVE_SEED, tokenMint.publicKey.toBuffer()],
    PROGRAM_ID,
  );
  const metadataPda = getMetadataPDA(tokenMint.publicKey);

  const curveTx = await (program.methods as any)
    .initBondingCurve(basePrice, slope, "FYRST Test", "FTEST", "https://fyrst.fun/meta.json")
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
  const curve = await (program.account as any).bondingCurve.fetch(curvePda);
  console.log(`  Mint:     ${tokenMint.publicKey.toBase58()}`);
  console.log(`  Supply:   ${curve.currentSupply.toNumber()}`);
  console.log(`  Base:     ${curve.basePrice.toNumber()} lamports`);
  console.log(`  Slope:    ${curve.slope.toNumber()}`);
  console.log(`  Reserve:  ${curve.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // ─── 4. Buy tokens (0.01 SOL) ──────────────────────────────
  log("4/6", "Buying tokens with 0.01 SOL...");
  const buyAmount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
  const buyerAta = getAssociatedTokenAddressSync(tokenMint.publicKey, deployer.publicKey);

  const buyTx = await (program.methods as any)
    .buyTokens(buyAmount)
    .accounts({
      buyer: deployer.publicKey,
      bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey,
      buyerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda,
      treasury: protocolConfig.treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  logTx("Buy", buyTx);
  const curveAfterBuy = await (program.account as any).bondingCurve.fetch(curvePda);
  const ataInfo = await getAccount(connection, buyerAta);
  console.log(`  Tokens minted:    ${curveAfterBuy.currentSupply.toNumber()}`);
  console.log(`  SPL balance:      ${ataInfo.amount.toString()}`);
  console.log(`  Reserve balance:  ${curveAfterBuy.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  Total collected:  ${curveAfterBuy.totalSolCollected.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // ─── 5. Sell half tokens ───────────────────────────────────
  log("5/6", "Selling half of tokens...");
  const sellAmount = new anchor.BN(Math.floor(curveAfterBuy.currentSupply.toNumber() / 2));

  const balBefore = await connection.getBalance(deployer.publicKey);

  const sellTx = await (program.methods as any)
    .sellTokens(sellAmount)
    .accounts({
      seller: deployer.publicKey,
      bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey,
      sellerTokenAccount: buyerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  logTx("Sell", sellTx);
  const curveAfterSell = await (program.account as any).bondingCurve.fetch(curvePda);
  const balAfter = await connection.getBalance(deployer.publicKey);
  const ataAfter = await getAccount(connection, buyerAta);
  console.log(`  Tokens sold:      ${sellAmount.toNumber()}`);
  console.log(`  Supply now:       ${curveAfterSell.currentSupply.toNumber()}`);
  console.log(`  SPL balance now:  ${ataAfter.amount.toString()}`);
  console.log(`  SOL returned:     ${((balAfter - balBefore) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`  Reserve now:      ${curveAfterSell.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // ─── 6. Summary ───────────────────────────────────────────
  const finalBalance = await connection.getBalance(deployer.publicKey);
  log("6/6", "LAUNCH TEST COMPLETE");
  console.log("══════════════════════════════════════════════════");
  console.log(`  Token Mint:   ${tokenMint.publicKey.toBase58()}`);
  console.log(`  Escrow PDA:   ${escrowPda.toBase58()}`);
  console.log(`  Curve PDA:    ${curvePda.toBase58()}`);
  console.log(`  Final Supply: ${curveAfterSell.currentSupply.toNumber()}`);
  console.log(`  Graduated:    ${curveAfterSell.graduated}`);
  console.log(`  SOL spent:    ${((balance - finalBalance) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log(`  Balance left: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log("══════════════════════════════════════════════════");
  console.log("\n  Explorer links:");
  console.log(`  Mint:   https://explorer.solana.com/address/${tokenMint.publicKey.toBase58()}?cluster=devnet`);
  console.log(`  Escrow: https://explorer.solana.com/address/${escrowPda.toBase58()}?cluster=devnet`);
  console.log(`  Curve:  https://explorer.solana.com/address/${curvePda.toBase58()}?cluster=devnet`);
}

main().catch((err) => {
  console.error("\nLAUNCH TEST FAILED:", err.message || err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
