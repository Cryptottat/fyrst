import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idlJson from "./idl/fyrst.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP",
);

const ESCROW_SEED = Buffer.from("escrow");
const CURVE_SEED = Buffer.from("curve");
const BUYER_SEED = Buffer.from("record");
const PROTOCOL_SEED = Buffer.from("protocol");

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

export const DEFAULT_BASE_PRICE = new BN(100_000); // 0.0001 SOL
export const DEFAULT_SLOPE = new BN(10);
export const TOKEN_DECIMALS = 6;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IDL = idlJson as any;

// ---------------------------------------------------------------------------
// PDA Derivation
// ---------------------------------------------------------------------------

export function getEscrowPDA(
  deployer: PublicKey,
  tokenMint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_SEED, deployer.toBuffer(), tokenMint.toBuffer()],
    PROGRAM_ID,
  );
}

export function getCurvePDA(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CURVE_SEED, tokenMint.toBuffer()],
    PROGRAM_ID,
  );
}

export function getBuyerRecordPDA(
  buyer: PublicKey,
  tokenMint: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BUYER_SEED, buyer.toBuffer(), tokenMint.toBuffer()],
    PROGRAM_ID,
  );
}

export function getProtocolConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    PROGRAM_ID,
  );
}

export function getMetadataPDA(tokenMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      tokenMint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return pda;
}

// ---------------------------------------------------------------------------
// Hook: useAnchorProgram
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FyrstProgram = Program<any>;

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new AnchorProvider(
      connection,
      wallet as never,
      AnchorProvider.defaultOptions(),
    );
  }, [connection, wallet]);

  const program: FyrstProgram | null = useMemo(() => {
    if (!provider) return null;
    try {
      return new Program(IDL, provider);
    } catch (err) {
      console.error("Failed to create Anchor Program:", err);
      return null;
    }
  }, [provider]);

  return { program, provider, connection };
}

// ---------------------------------------------------------------------------
// Transaction Helpers
// ---------------------------------------------------------------------------

export interface LaunchResult {
  tokenMintKeypair: Keypair;
  escrowTxSig: string;
  curveTxSig: string;
}

/** Launch a new token: create_escrow + init_bonding_curve (with SPL mint + metadata) */
export async function launchToken(
  program: FyrstProgram,
  deployer: PublicKey,
  collateralLamports: BN,
  name: string,
  symbol: string,
  uri: string,
  basePrice: BN = DEFAULT_BASE_PRICE,
  slope: BN = DEFAULT_SLOPE,
): Promise<LaunchResult> {
  const tokenMintKeypair = Keypair.generate();
  const tokenMint = tokenMintKeypair.publicKey;

  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);
  const metadataAccount = getMetadataPDA(tokenMint);

  const methods = program.methods as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Step 1: Create escrow with collateral
  const escrowTxSig: string = await methods
    .createEscrow(collateralLamports)
    .accounts({
      deployer,
      tokenMint,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  // Step 2: Initialize bonding curve + SPL mint + metadata
  const curveTxSig: string = await methods
    .initBondingCurve(basePrice, slope, name, symbol, uri)
    .accounts({
      deployer,
      tokenMint,
      bondingCurve,
      metadataAccount,
      metadataProgram: TOKEN_METADATA_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([tokenMintKeypair])
    .rpc();

  return { tokenMintKeypair, escrowTxSig, curveTxSig };
}

/** Buy tokens on a bonding curve — mints real SPL tokens to buyer ATA */
export async function buyTokens(
  program: FyrstProgram,
  buyer: PublicKey,
  tokenMint: PublicKey,
  solAmountLamports: BN,
): Promise<{ txSig: string; recordTxSig: string }> {
  const [bondingCurve] = getCurvePDA(tokenMint);
  const [protocolConfig] = getProtocolConfigPDA();
  const [buyerRecord] = getBuyerRecordPDA(buyer, tokenMint);

  // Fetch protocol config for treasury address
  const configAccount = await (program.account as any).protocolConfig.fetch(protocolConfig); // eslint-disable-line @typescript-eslint/no-explicit-any
  const treasury = configAccount.treasury as PublicKey;

  // Fetch current price for record_buyer
  const curveAccount = await (program.account as any).bondingCurve.fetch(bondingCurve); // eslint-disable-line @typescript-eslint/no-explicit-any
  const ca = curveAccount as BondingCurveData;
  // Normalize supply to whole-token units (matching on-chain logic)
  const supplyUnits = ca.currentSupply.div(new BN(10 ** TOKEN_DECIMALS));
  const currentPrice = ca.basePrice.add(ca.slope.mul(supplyUnits));

  // Calculate tokens received (accounting for both fees)
  const tradeFee = solAmountLamports.mul(new BN(100)).div(new BN(10_000));
  const protocolFee = solAmountLamports.mul(new BN(50)).div(new BN(10_000));
  const netSol = solAmountLamports.sub(tradeFee).sub(protocolFee);
  const tokensReceived = netSol
    .mul(new BN(10 ** TOKEN_DECIMALS))
    .div(currentPrice);

  const buyerTokenAccount = getAssociatedTokenAddressSync(tokenMint, buyer);

  const methods = program.methods as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const txSig: string = await methods
    .buyTokens(solAmountLamports)
    .accounts({
      buyer,
      bondingCurve,
      tokenMint,
      buyerTokenAccount,
      protocolConfig,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const recordTxSig: string = await methods
    .recordBuyer(tokensReceived, currentPrice)
    .accounts({
      buyer,
      tokenMint,
      buyerRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { txSig, recordTxSig };
}

/** Sell tokens on a bonding curve — burns SPL tokens */
export async function sellTokens(
  program: FyrstProgram,
  seller: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: BN,
): Promise<string> {
  const [bondingCurve] = getCurvePDA(tokenMint);
  const sellerTokenAccount = getAssociatedTokenAddressSync(tokenMint, seller);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .sellTokens(tokenAmount)
    .accounts({
      seller,
      bondingCurve,
      tokenMint,
      sellerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Mark a token as rugged (protocol authority only) */
export async function markRugged(
  program: FyrstProgram,
  authority: PublicKey,
  deployer: PublicKey,
  tokenMint: PublicKey,
): Promise<string> {
  const [protocolConfig] = getProtocolConfigPDA();
  const [escrowVault] = getEscrowPDA(deployer, tokenMint);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .markRugged()
    .accounts({
      authority,
      protocolConfig,
      escrowVault,
    })
    .rpc();
}

/** Process refund for a buyer (protocol authority only) */
export async function processRefund(
  program: FyrstProgram,
  authority: PublicKey,
  buyer: PublicKey,
  deployer: PublicKey,
  tokenMint: PublicKey,
): Promise<string> {
  const [protocolConfig] = getProtocolConfigPDA();
  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);
  const [buyerRecord] = getBuyerRecordPDA(buyer, tokenMint);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .processRefund()
    .accounts({
      authority,
      buyer,
      protocolConfig,
      escrowVault,
      bondingCurve,
      buyerRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Initialize protocol config (one-time admin setup) */
export async function initProtocol(
  program: FyrstProgram,
  authority: PublicKey,
  treasury: PublicKey,
): Promise<string> {
  const [protocolConfig] = getProtocolConfigPDA();

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .initProtocol(treasury)
    .accounts({
      authority,
      protocolConfig,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------------------------------------------------------------------------
// On-chain Data Types & Fetchers
// ---------------------------------------------------------------------------

export interface BondingCurveData {
  tokenMint: PublicKey;
  currentSupply: BN;
  basePrice: BN;
  slope: BN;
  reserveBalance: BN;
  graduated: boolean;
  deployer: PublicKey;
  totalSolCollected: BN;
}

export interface BuyerRecordData {
  buyer: PublicKey;
  tokenMint: PublicKey;
  totalBought: BN;
  totalSolSpent: BN;
  avgPrice: BN;
  refundClaimed: boolean;
  firstBuyAt: BN;
}

export interface ProtocolConfigData {
  authority: PublicKey;
  treasury: PublicKey;
  graduationThreshold: BN;
}

export async function fetchBondingCurve(
  program: FyrstProgram,
  tokenMint: PublicKey,
): Promise<BondingCurveData | null> {
  try {
    const [pda] = getCurvePDA(tokenMint);
    const account = await (program.account as any).bondingCurve.fetch(pda); // eslint-disable-line @typescript-eslint/no-explicit-any
    return account as unknown as BondingCurveData;
  } catch {
    return null;
  }
}

export async function fetchBuyerRecord(
  program: FyrstProgram,
  buyer: PublicKey,
  tokenMint: PublicKey,
): Promise<BuyerRecordData | null> {
  try {
    const [pda] = getBuyerRecordPDA(buyer, tokenMint);
    const account = await (program.account as any).buyerRecord.fetch(pda); // eslint-disable-line @typescript-eslint/no-explicit-any
    return account as unknown as BuyerRecordData;
  } catch {
    return null;
  }
}

export async function fetchProtocolConfig(
  program: FyrstProgram,
): Promise<ProtocolConfigData | null> {
  try {
    const [pda] = getProtocolConfigPDA();
    const account = await (program.account as any).protocolConfig.fetch(pda); // eslint-disable-line @typescript-eslint/no-explicit-any
    return account as unknown as ProtocolConfigData;
  } catch {
    return null;
  }
}
