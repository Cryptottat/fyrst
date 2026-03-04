import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import idl from "../web/lib/idl/fyrst.json";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const RAYDIUM_CPMM = new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb");
const CREATE_POOL_FEE = new PublicKey("3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const wallet = new Wallet(payer);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as any, provider);

  console.log("Payer:", payer.publicKey.toBase58());
  const payerBalance = await connection.getBalance(payer.publicKey);
  console.log("Payer balance:", payerBalance / 1e9, "SOL");

  // Find graduated bonding curves
  const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 171 }],
  });
  const curves = rawAccounts.map((raw) => {
    try {
      return { publicKey: raw.pubkey, account: (program.coder as any).accounts.decode("bondingCurve", raw.account.data) };
    } catch { return null; }
  }).filter(Boolean) as any[];

  const graduated = curves.filter((c) => c.account.graduated && !c.account.dexMigrated);
  console.log(`Graduated but not migrated: ${graduated.length}`);
  if (graduated.length === 0) { console.log("No graduated curves."); return; }

  const curve = graduated[0];
  const tokenMint = curve.account.tokenMint as PublicKey;
  const bondingCurve = curve.publicKey as PublicKey;
  const reserveSol = Number(curve.account.reserveBalance);

  console.log("\nToken mint:", tokenMint.toBase58());
  console.log("Bonding curve:", bondingCurve.toBase58());
  console.log("Reserve:", reserveSol / 1e9, "SOL");

  if (payerBalance < reserveSol + 50_000_000) {
    console.log(`ERROR: Payer needs at least ${(reserveSol + 50_000_000) / 1e9} SOL`);
    return;
  }

  // Derive PAYER's ATAs (not bonding curve's)
  const payerTokenAccount = getAssociatedTokenAddressSync(tokenMint, payer.publicKey);
  const payerWsolAccount = getAssociatedTokenAddressSync(WSOL_MINT, payer.publicKey);

  console.log("Payer token ATA:", payerTokenAccount.toBase58());
  console.log("Payer WSOL ATA:", payerWsolAccount.toBase58());

  // Raydium CPMM account derivation
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)], RAYDIUM_CPMM);

  // Read pool creation fee from AmmConfig account
  const ammConfigInfo = await connection.getAccountInfo(ammConfig);
  if (!ammConfigInfo) { console.log("ERROR: Failed to fetch AmmConfig"); return; }
  const poolCreationFee = Number(ammConfigInfo.data.readBigUInt64LE(36));
  const liquiditySol = reserveSol - poolCreationFee;
  console.log(`Pool creation fee: ${poolCreationFee / 1e9} SOL, liquidity: ${liquiditySol / 1e9} SOL`);
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")], RAYDIUM_CPMM);

  const wsolIsToken0 = Buffer.compare(WSOL_MINT.toBuffer(), tokenMint.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : tokenMint;
  const token1Mint = wsolIsToken0 ? tokenMint : WSOL_MINT;

  console.log("WSOL is token0:", wsolIsToken0);

  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), ammConfig.toBuffer(), token0Mint.toBuffer(), token1Mint.toBuffer()], RAYDIUM_CPMM);
  const [lpMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), poolState.toBuffer()], RAYDIUM_CPMM);
  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()], RAYDIUM_CPMM);
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()], RAYDIUM_CPMM);
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()], RAYDIUM_CPMM);
  // LP token ATA for PAYER (not bonding curve)
  const creatorLpToken = getAssociatedTokenAddressSync(lpMint, payer.publicKey);

  // Build multi-IX transaction
  const tx = new Transaction();

  // IX 0: Compute budget
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  // IX 1: Create payer's WSOL ATA if needed
  const wsolAtaInfo = await connection.getAccountInfo(payerWsolAccount);
  if (!wsolAtaInfo) {
    console.log("Creating payer WSOL ATA...");
    tx.add(createAssociatedTokenAccountInstruction(
      payer.publicKey, payerWsolAccount, payer.publicKey, WSOL_MINT
    ));
  }

  // IX 2: Create payer's token ATA if needed
  const tokenAtaInfo = await connection.getAccountInfo(payerTokenAccount);
  if (!tokenAtaInfo) {
    console.log("Creating payer token ATA...");
    tx.add(createAssociatedTokenAccountInstruction(
      payer.publicKey, payerTokenAccount, payer.publicKey, tokenMint
    ));
  }

  // IX 3: Transfer liquidity SOL (reserve minus pool fee) to payer's WSOL ATA
  console.log(`Transferring ${liquiditySol / 1e9} SOL (liquidity) to payer WSOL ATA...`);
  tx.add(SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: payerWsolAccount,
    lamports: liquiditySol,
  }));

  // IX 4: sync_native to update WSOL balance
  tx.add(createSyncNativeInstruction(payerWsolAccount));

  // IX 5: graduate_to_dex
  const methods = program.methods as any;
  const graduateIx = await methods
    .graduateToDex()
    .accounts({
      payer: payer.publicKey,
      bondingCurve,
      tokenMint,
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

  // Simulate first
  console.log("\n=== Simulating TX ===");
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    console.log("Simulation FAILED:", JSON.stringify(sim.value.err));
    console.log("Logs:");
    sim.value.logs?.forEach(l => console.log("  ", l));
  } else {
    console.log("Simulation SUCCESS! Units:", sim.value.unitsConsumed);
    sim.value.logs?.forEach(l => console.log("  ", l));

    // Actually send
    console.log("\n=== Sending TX ===");
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
      console.log("TX confirmed:", sig);
    } catch (err: any) {
      console.log("TX failed:", err.message);
    }
  }
}

main().catch(console.error);
