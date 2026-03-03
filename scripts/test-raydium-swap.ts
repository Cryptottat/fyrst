import { Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const RAYDIUM_CPMM = new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// Graduated tokens and their pools
const POOLS = [
  {
    tokenMint: new PublicKey("9KirzWw5vD6NJ5dsL1Trn98kM3CDYfE4qmNhgA3dug8a"),
    pool: new PublicKey("HxJRtKt2B9GdFnix2sy7BA3SypJNg6PBZTaCdt59Zhwd"),
  },
  {
    tokenMint: new PublicKey("EwWTSTWHL2PgkdRvXTHVEe4X9v8dpXdzDMZb7fofzqcE"),
    pool: new PublicKey("H75izMADUAWNZuHuSBHbQJKCUssvqVASKsx4Rph5K5vu"),
  },
];

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

  console.log("Payer:", payer.publicKey.toBase58());
  const bal = await connection.getBalance(payer.publicKey);
  console.log("Balance:", bal / 1e9, "SOL\n");

  const target = POOLS[0]; // First graduated token
  const tokenMint = target.tokenMint;
  const poolState = target.pool;

  console.log("Token:", tokenMint.toBase58());
  console.log("Pool:", poolState.toBase58());

  // Check if payer has tokens to sell
  const payerTokenAta = getAssociatedTokenAddressSync(tokenMint, payer.publicKey);
  const payerTokenInfo = await connection.getAccountInfo(payerTokenAta);

  if (!payerTokenInfo) {
    console.log("Payer has no token ATA. Need to buy tokens first via bonding curve or have some.");
    // Check bonding curve for this token
    const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), tokenMint.toBuffer()], PROGRAM_ID);
    const curveTokenAta = getAssociatedTokenAddressSync(tokenMint, bondingCurve, true);
    const curveTokenInfo = await connection.getAccountInfo(curveTokenAta);
    if (curveTokenInfo) {
      const curveTokenBalance = curveTokenInfo.data.readBigUInt64LE(64);
      console.log("Bonding curve token ATA balance:", curveTokenBalance.toString());
    }
    console.log("\nPayer has no tokens to sell. Check if payer received tokens from graduation mint.");
    // Actually, graduation minted tokens to payer's ATA for Raydium, then Raydium transferred them to vault.
    // So payer's token ATA should be empty after graduation.
    // To test selling, we first need to BUY tokens on Raydium.
    console.log("Will attempt a BUY on Raydium instead (swap SOL → token).\n");
  } else {
    const tokenBalance = payerTokenInfo.data.readBigUInt64LE(64);
    console.log("Payer token balance:", tokenBalance.toString());
  }

  // Derive Raydium accounts
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

  // Check vault balances
  const [v0Info, v1Info] = await Promise.all([
    connection.getAccountInfo(token0Vault),
    connection.getAccountInfo(token1Vault),
  ]);
  if (v0Info) {
    const v0Bal = v0Info.data.readBigUInt64LE(64);
    console.log(`Vault 0 (${wsolIsToken0 ? "WSOL" : "Token"}) balance:`, v0Bal.toString());
  }
  if (v1Info) {
    const v1Bal = v1Info.data.readBigUInt64LE(64);
    console.log(`Vault 1 (${wsolIsToken0 ? "Token" : "WSOL"}) balance:`, v1Bal.toString());
  }

  // === SWAP: Buy tokens with 0.01 SOL ===
  const swapAmountIn = 10_000_000; // 0.01 SOL
  const minAmountOut = 0; // no slippage protection for test

  // Raydium CPMM swap discriminator: sha256("global:swap_base_input")[0..8]
  // = 0x8f, 0x23, 0x36, 0xad, 0x42, 0xc0, 0xb0, 0x38
  const swapDiscriminator = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222]);

  const swapData = Buffer.alloc(8 + 8 + 8);
  swapDiscriminator.copy(swapData, 0);
  swapData.writeBigUInt64LE(BigInt(swapAmountIn), 8);
  swapData.writeBigUInt64LE(BigInt(minAmountOut), 16);

  // For swap_base_input, input = token being sold, output = token being bought
  // We want to sell WSOL → buy Token
  // If WSOL is token0: input_vault = token0_vault, output_vault = token1_vault
  //                    input_token_account = payer_wsol_ata, output_token_account = payer_token_ata
  //                    input_token_mint = WSOL, output_token_mint = token
  const payerWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, payer.publicKey);

  // Raydium CPMM swap_base_input accounts (from source):
  // 0: payer (signer)
  // 1: authority
  // 2: amm_config
  // 3: pool_state (mut)
  // 4: input_token_account (mut) — user's input token ATA
  // 5: output_token_account (mut) — user's output token ATA
  // 6: input_vault (mut) — pool vault for input token
  // 7: output_vault (mut) — pool vault for output token
  // 8: input_token_program
  // 9: output_token_program
  // 10: input_token_mint
  // 11: output_token_mint
  // 12: observation_state (mut)

  let inputTokenAccount: PublicKey;
  let outputTokenAccount: PublicKey;
  let inputVault: PublicKey;
  let outputVault: PublicKey;
  let inputTokenMint: PublicKey;
  let outputTokenMint: PublicKey;

  // Buying tokens: input = WSOL, output = Token
  if (wsolIsToken0) {
    inputTokenAccount = payerWsolAta;
    outputTokenAccount = payerTokenAta;
    inputVault = token0Vault;
    outputVault = token1Vault;
    inputTokenMint = WSOL_MINT;
    outputTokenMint = tokenMint;
  } else {
    inputTokenAccount = payerWsolAta;
    outputTokenAccount = payerTokenAta;
    inputVault = token1Vault;
    outputVault = token0Vault;
    inputTokenMint = WSOL_MINT;
    outputTokenMint = tokenMint;
  }

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

  // Create token ATA if needed
  if (!payerTokenInfo) {
    tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, payerTokenAta, payer.publicKey, tokenMint));
  }

  // Ensure WSOL ATA has funds — wrap 0.01 SOL
  const wsolAtaInfo = await connection.getAccountInfo(payerWsolAta);
  if (!wsolAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, payerWsolAta, payer.publicKey, WSOL_MINT));
  }

  // Transfer SOL to WSOL ATA
  const { SystemProgram } = await import("@solana/web3.js");
  tx.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: payerWsolAta, lamports: swapAmountIn }));

  // Sync native
  const { createSyncNativeInstruction } = await import("@solana/spl-token");
  tx.add(createSyncNativeInstruction(payerWsolAta));

  // Swap instruction
  const swapIx = {
    programId: RAYDIUM_CPMM,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },        // 0: payer
      { pubkey: raydiumAuthority, isSigner: false, isWritable: false },     // 1: authority
      { pubkey: ammConfig, isSigner: false, isWritable: false },            // 2: amm_config
      { pubkey: poolState, isSigner: false, isWritable: true },             // 3: pool_state
      { pubkey: inputTokenAccount, isSigner: false, isWritable: true },     // 4: input_token_account
      { pubkey: outputTokenAccount, isSigner: false, isWritable: true },    // 5: output_token_account
      { pubkey: inputVault, isSigner: false, isWritable: true },            // 6: input_vault
      { pubkey: outputVault, isSigner: false, isWritable: true },           // 7: output_vault
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },     // 8: input_token_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },     // 9: output_token_program
      { pubkey: inputTokenMint, isSigner: false, isWritable: false },       // 10: input_token_mint
      { pubkey: outputTokenMint, isSigner: false, isWritable: false },      // 11: output_token_mint
      { pubkey: observationState, isSigner: false, isWritable: true },      // 12: observation_state
    ],
    data: swapData,
  };
  tx.add(swapIx);

  console.log("\n=== Simulating SWAP (Buy 0.01 SOL → Token) ===");
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

    console.log("\n=== Sending SWAP TX ===");
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
      console.log("SWAP TX confirmed:", sig);

      // Check token balance after
      const afterInfo = await connection.getAccountInfo(payerTokenAta);
      if (afterInfo) {
        const afterBal = afterInfo.data.readBigUInt64LE(64);
        console.log("Payer token balance after buy:", afterBal.toString());
      }
    } catch (err: any) {
      console.log("SWAP TX failed:", err.message);
    }
  }
}

main().catch(console.error);
