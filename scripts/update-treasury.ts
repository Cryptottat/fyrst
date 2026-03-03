/**
 * Update FYRST protocol treasury to the new wallet.
 * Usage: npx ts-node --skip-project scripts/update-treasury.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const PROTOCOL_SEED = Buffer.from("protocol");
const NEW_TREASURY = new PublicKey("6m2hSPkqWoG3eFYjWJApDK1p33kqemHD92BC8219QeNN");

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

  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    PROGRAM_ID,
  );

  // Show current state
  const before = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  console.log("Current treasury:", before.treasury.toBase58());
  console.log("Updating to:", NEW_TREASURY.toBase58());

  const tx = await (program.methods as any)
    .updateTreasury(NEW_TREASURY)
    .accounts({
      authority: keypair.publicKey,
      protocolConfig: protocolConfigPda,
    })
    .rpc();

  console.log("TX:", tx);

  const after = await (program.account as any).protocolConfig.fetch(protocolConfigPda);
  console.log("Treasury updated:", after.treasury.toBase58());
}

main().catch(console.error);
