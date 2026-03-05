/**
 * Migrate ProtocolConfig: close old PDA + reinitialize with ops_wallet.
 * Usage: npx ts-node scripts/migrate-config.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const PROTOCOL_SEED = Buffer.from("protocol");

const RPC_URL = process.env.HELIUS_RPC_URL || "https://devnet.helius-rpc.com/?api-key=d5b2c18e-f19a-48b3-ae07-b1bb5436e6d6";

async function main() {
  const walletPath = path.resolve(process.env.HOME || "~", ".config/solana/id.json");
  const rawKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(rawKey));

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = path.resolve(__dirname, "../target/idl/fyrst.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [protocolConfigPda, bump] = PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    PROGRAM_ID,
  );

  // Treasury (buyback+burn) and Ops wallet (service revenue)
  const treasury = new PublicKey("6m2hSPkqWoG3eFYjWJApDK1p33kqemHD92BC8219QeNN");
  const opsWallet = keypair.publicKey; // For devnet, use deployer wallet as ops

  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Authority:", keypair.publicKey.toBase58());
  console.log("Treasury:", treasury.toBase58());
  console.log("Ops Wallet:", opsWallet.toBase58());
  console.log("Protocol Config PDA:", protocolConfigPda.toBase58());

  // Step 1: Close existing config
  const existingAccount = await connection.getAccountInfo(protocolConfigPda);
  if (existingAccount) {
    console.log("\nStep 1: Closing old protocol config...");
    console.log("  Old size:", existingAccount.data.length, "bytes");

    const closeTx = await (program.methods as any)
      .closeConfig()
      .accounts({
        authority: keypair.publicKey,
        protocolConfig: protocolConfigPda,
      })
      .rpc();
    console.log("  Close TX:", closeTx);

    // Wait for confirmation
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log("\nNo existing config found, skipping close.");
  }

  // Step 2: Reinitialize with ops_wallet
  console.log("\nStep 2: Initializing new protocol config with ops_wallet...");
  const initTx = await (program.methods as any)
    .initProtocol(treasury, opsWallet)
    .accounts({
      authority: keypair.publicKey,
      protocolConfig: protocolConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("  Init TX:", initTx);

  // Verify
  const config = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  console.log("\nMigration complete!");
  console.log("  Authority:", config.authority.toBase58());
  console.log("  Treasury:", config.treasury.toBase58());
  console.log("  Ops Wallet:", config.opsWallet.toBase58());
  console.log("  Graduation Threshold:", config.graduationThreshold.toString(), "lamports");
}

main().catch(console.error);
