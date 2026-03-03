import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import idl from "../web/lib/idl/fyrst.json";

const PROGRAM_ID = new PublicKey("CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP");
const PROTOCOL_SEED = Buffer.from("protocol");
const NEW_THRESHOLD = new BN(5_000_000_000); // 5 SOL

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load keypair from ~/.config/solana/id.json
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(secret));

  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(idl as any, provider);

  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID);

  console.log("Authority:", authority.publicKey.toBase58());
  console.log("Protocol config:", protocolConfig.toBase58());
  console.log("New threshold:", NEW_THRESHOLD.toString(), "lamports (5 SOL)");

  const tx = await (program.methods as any)
    .updateGraduationThreshold(NEW_THRESHOLD)
    .accounts({
      authority: authority.publicKey,
      protocolConfig,
    })
    .rpc();

  console.log("Done! TX:", tx);

  // Verify
  const config = await (program.account as any).protocolConfig.fetch(protocolConfig);
  console.log("Verified threshold:", config.graduationThreshold.toString(), "lamports");
}

main().catch(console.error);
