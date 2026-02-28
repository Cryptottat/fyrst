/**
 * Initialize FYRST protocol config on devnet.
 * Usage: npx ts-node scripts/init-protocol-devnet.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const PROTOCOL_SEED = Buffer.from("protocol");

// Use Helius devnet RPC
const RPC_URL = process.env.HELIUS_RPC_URL || "https://devnet.helius-rpc.com/?api-key=d5b2c18e-f19a-48b3-ae07-b1bb5436e6d6";

async function main() {
  // Load wallet
  const walletPath = path.resolve(process.env.HOME || "~", ".config/solana/id.json");
  const rawKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(rawKey));

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = path.resolve(__dirname, "../target/idl/fyrst.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  // Derive protocol config PDA
  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    PROGRAM_ID,
  );

  // Use deployer wallet as treasury for now (can be updated later)
  const treasury = keypair.publicKey;

  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Authority:", keypair.publicKey.toBase58());
  console.log("Treasury:", treasury.toBase58());
  console.log("Protocol Config PDA:", protocolConfigPda.toBase58());

  // Check if already initialized
  try {
    const existing = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
    console.log("\nProtocol already initialized!");
    console.log("  Authority:", existing.authority.toBase58());
    console.log("  Treasury:", existing.treasury.toBase58());
    console.log("  Graduation Threshold:", existing.graduationThreshold.toString());
    return;
  } catch {
    console.log("\nProtocol not yet initialized. Initializing...");
  }

  const tx = await (program.methods as any)
    .initProtocol(treasury)
    .accounts({
      authority: keypair.publicKey,
      protocolConfig: protocolConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Init protocol TX:", tx);

  // Verify
  const config = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  console.log("Protocol initialized successfully!");
  console.log("  Authority:", config.authority.toBase58());
  console.log("  Treasury:", config.treasury.toBase58());
  console.log("  Graduation Threshold:", config.graduationThreshold.toString(), "lamports");
}

main().catch(console.error);
