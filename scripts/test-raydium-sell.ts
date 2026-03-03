import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const RAYDIUM_CPMM = new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

  const tokenMint = new PublicKey("9KirzWw5vD6NJ5dsL1Trn98kM3CDYfE4qmNhgA3dug8a");
  const poolState = new PublicKey("HxJRtKt2B9GdFnix2sy7BA3SypJNg6PBZTaCdt59Zhwd");

  const payerTokenAta = getAssociatedTokenAddressSync(tokenMint, payer.publicKey);
  const payerWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, payer.publicKey);

  const tokenInfo = await connection.getAccountInfo(payerTokenAta);
  if (!tokenInfo) { console.log("No tokens to sell"); return; }
  const tokenBalance = tokenInfo.data.readBigUInt64LE(64);
  console.log("Token balance:", tokenBalance.toString());

  // Sell 1,000 tokens (with 6 decimals = 1_000_000_000)
  const sellAmount = 1_000_000_000n;
  if (tokenBalance < sellAmount) { console.log("Not enough tokens"); return; }

  // Derive accounts
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)], RAYDIUM_CPMM);
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")], RAYDIUM_CPMM);

  const wsolIsToken0 = Buffer.compare(WSOL_MINT.toBuffer(), tokenMint.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : tokenMint;
  const token1Mint = wsolIsToken0 ? tokenMint : WSOL_MINT;

  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()], RAYDIUM_CPMM);
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()], RAYDIUM_CPMM);
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()], RAYDIUM_CPMM);

  // Selling Token → WSOL
  // Input = Token, Output = WSOL
  let inputTokenAccount: PublicKey, outputTokenAccount: PublicKey;
  let inputVault: PublicKey, outputVault: PublicKey;
  let inputTokenMint: PublicKey, outputTokenMint: PublicKey;

  if (wsolIsToken0) {
    // token0 = WSOL, token1 = Token
    inputTokenAccount = payerTokenAta;   // selling token (token1)
    outputTokenAccount = payerWsolAta;   // receiving WSOL (token0)
    inputVault = token1Vault;            // token vault
    outputVault = token0Vault;           // wsol vault
    inputTokenMint = tokenMint;
    outputTokenMint = WSOL_MINT;
  } else {
    inputTokenAccount = payerTokenAta;
    outputTokenAccount = payerWsolAta;
    inputVault = token0Vault;
    outputVault = token1Vault;
    inputTokenMint = tokenMint;
    outputTokenMint = WSOL_MINT;
  }

  // swap_base_input discriminator
  const swapDiscriminator = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222]);
  const swapData = Buffer.alloc(8 + 8 + 8);
  swapDiscriminator.copy(swapData, 0);
  swapData.writeBigUInt64LE(sellAmount, 8);
  swapData.writeBigUInt64LE(0n, 16); // min_amount_out = 0 for test

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

  // Ensure WSOL ATA exists
  const wsolInfo = await connection.getAccountInfo(payerWsolAta);
  if (!wsolInfo) {
    tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, payerWsolAta, payer.publicKey, WSOL_MINT));
  }

  const swapIx = {
    programId: RAYDIUM_CPMM,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: raydiumAuthority, isSigner: false, isWritable: false },
      { pubkey: ammConfig, isSigner: false, isWritable: false },
      { pubkey: poolState, isSigner: false, isWritable: true },
      { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
      { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
      { pubkey: inputVault, isSigner: false, isWritable: true },
      { pubkey: outputVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: inputTokenMint, isSigner: false, isWritable: false },
      { pubkey: outputTokenMint, isSigner: false, isWritable: false },
      { pubkey: observationState, isSigner: false, isWritable: true },
    ],
    data: swapData,
  };
  tx.add(swapIx);

  console.log("\n=== Simulating SELL (1,000 tokens → SOL) ===");
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    console.log("Simulation FAILED:", JSON.stringify(sim.value.err));
    sim.value.logs?.forEach(l => console.log("  ", l));
  } else {
    console.log("Simulation SUCCESS! Units:", sim.value.unitsConsumed);

    console.log("\n=== Sending SELL TX ===");
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
      console.log("SELL TX confirmed:", sig);

      const afterToken = await connection.getAccountInfo(payerTokenAta);
      const afterWsol = await connection.getAccountInfo(payerWsolAta);
      if (afterToken) console.log("Token balance after:", afterToken.data.readBigUInt64LE(64).toString());
      if (afterWsol) console.log("WSOL balance after:", afterWsol.data.readBigUInt64LE(64).toString());
    } catch (err: any) {
      console.log("SELL TX failed:", err.message);
    }
  }
}

main().catch(console.error);
