/**
 * Test: 100% 전량 매도 테스트
 * 1) 토큰 런칭 + 매수 (0.05 SOL)
 * 2) 전량 매도 (100%)
 * 3) 잔고 0 확인
 *
 * Usage: npx ts-node --skip-project scripts/test-sell-all.ts
 */
import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey, SystemProgram, Keypair, Connection, LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY, Transaction, ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync, getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
// devnet 전용 — 메인넷 키는 환경변수로만 사용할 것
const RPC_URL = process.env.HELIUS_RPC_URL || "https://devnet.helius-rpc.com/?api-key=d5b2c18e-f19a-48b3-ae07-b1bb5436e6d6";

const ESCROW_SEED = Buffer.from("escrow");
const CURVE_SEED = Buffer.from("curve");
const PROTOCOL_SEED = Buffer.from("protocol");

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

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

  const [protocolConfigPda] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);
  const protocolConfig = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  const treasury = protocolConfig.treasury as PublicKey;

  console.log("══════════════════════════════════════════");
  console.log("  100% SELL TEST");
  console.log("══════════════════════════════════════════");

  // 1. Launch token
  console.log("\n[1/3] Launching token + buying 0.05 SOL...");
  const tokenMint = Keypair.generate();
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [ESCROW_SEED, deployer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()], PROGRAM_ID,
  );
  const [curvePda] = PublicKey.findProgramAddressSync(
    [CURVE_SEED, tokenMint.publicKey.toBuffer()], PROGRAM_ID,
  );
  const metadataPda = getMetadataPDA(tokenMint.publicKey);
  const buyerAta = getAssociatedTokenAddressSync(tokenMint.publicKey, deployer.publicKey);
  const basePrice = new anchor.BN(100_000);
  const slope = new anchor.BN(10);

  const escrowIx = await (program.methods as any)
    .createEscrow(new anchor.BN(0.02 * LAMPORTS_PER_SOL))
    .accounts({
      deployer: deployer.publicKey, tokenMint: tokenMint.publicKey,
      escrowVault: escrowPda, systemProgram: SystemProgram.programId,
    }).instruction();

  const curveIx = await (program.methods as any)
    .initBondingCurve(basePrice, slope, "Sell All Test", "SELL", "https://fyrst.fun/test")
    .accounts({
      deployer: deployer.publicKey, tokenMint: tokenMint.publicKey,
      bondingCurve: curvePda, metadataAccount: metadataPda,
      metadataProgram: METAPLEX_PROGRAM_ID, tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
    }).instruction();

  const buyIx = await (program.methods as any)
    .buyTokens(new anchor.BN(0.05 * LAMPORTS_PER_SOL), new anchor.BN(1))
    .accounts({
      buyer: deployer.publicKey, bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey, buyerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda, treasury,
      tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).instruction();

  const launchTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }))
    .add(escrowIx, curveIx, buyIx);
  await provider.sendAndConfirm(launchTx, [tokenMint]);

  const curveAfterBuy = await (program.account as any).bondingCurve.fetch(curvePda);
  const ataAfterBuy = await getAccount(connection, buyerAta);
  const totalTokens = BigInt(ataAfterBuy.amount.toString());
  console.log(`  Mint:     ${tokenMint.publicKey.toBase58()}`);
  console.log(`  Tokens:   ${totalTokens.toString()}`);
  console.log(`  Supply:   ${curveAfterBuy.currentSupply.toNumber()}`);
  console.log(`  Reserve:  ${curveAfterBuy.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // 2. Sell 100%
  console.log("\n[2/3] Selling 100% of tokens...");
  const sellAmount = new anchor.BN(totalTokens.toString());
  const balBefore = await connection.getBalance(deployer.publicKey);

  const sellIx = await (program.methods as any)
    .sellTokens(sellAmount, new anchor.BN(1)) // min 1 lamport
    .accounts({
      seller: deployer.publicKey, bondingCurve: curvePda,
      tokenMint: tokenMint.publicKey, sellerTokenAccount: buyerAta,
      protocolConfig: protocolConfigPda, treasury,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    }).instruction();

  const sellTx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }))
    .add(sellIx);
  const sellSig = await provider.sendAndConfirm(sellTx, []);

  const balAfter = await connection.getBalance(deployer.publicKey);
  const curveAfterSell = await (program.account as any).bondingCurve.fetch(curvePda);
  const ataAfterSell = await getAccount(connection, buyerAta);
  const solReturned = (balAfter - balBefore) / LAMPORTS_PER_SOL;

  console.log(`  TX: https://explorer.solana.com/tx/${sellSig}?cluster=devnet`);
  console.log(`  SPL balance:  ${ataAfterSell.amount.toString()}`);
  console.log(`  Supply now:   ${curveAfterSell.currentSupply.toNumber()}`);
  console.log(`  Reserve now:  ${curveAfterSell.reserveBalance.toNumber() / LAMPORTS_PER_SOL} SOL`);
  console.log(`  SOL returned: ${solReturned.toFixed(6)} SOL`);

  // 3. Verify
  console.log("\n[3/3] Verification...");
  const splLeft = BigInt(ataAfterSell.amount.toString());
  const supplyLeft = curveAfterSell.currentSupply.toNumber();
  const reserveLeft = curveAfterSell.reserveBalance.toNumber();

  if (splLeft === BigInt(0) && supplyLeft === 0 && solReturned > 0) {
    console.log("  ✅ 100% SELL SUCCESS");
    console.log(`     Tokens: ${totalTokens.toString()} → 0`);
    console.log(`     SOL returned: ${solReturned.toFixed(6)} SOL`);
    console.log(`     Reserve left: ${reserveLeft} lamports`);
  } else {
    console.log("  ❌ 100% SELL FAILED");
    console.log(`     SPL left: ${splLeft.toString()}`);
    console.log(`     Supply left: ${supplyLeft}`);
    console.log(`     Reserve left: ${reserveLeft}`);
    process.exit(1);
  }

  console.log("══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message || err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
