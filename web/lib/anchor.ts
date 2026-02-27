import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import idlJson from "./idl/fyrst.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROGRAM_ID = new PublicKey(
  "CcyByKGzRDK17icyNGAgdUN4q7WzbL1BPi4BNzqytyMP",
);

const ESCROW_SEED = Buffer.from("escrow");
const CURVE_SEED = Buffer.from("curve");
const BUYER_SEED = Buffer.from("record");

export const DEFAULT_BASE_PRICE = new BN(100_000); // 0.0001 SOL
export const DEFAULT_SLOPE = new BN(10);

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
    } catch {
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

/** Launch a new token: create_escrow + init_bonding_curve */
export async function launchToken(
  program: FyrstProgram,
  deployer: PublicKey,
  collateralLamports: BN,
  basePrice: BN = DEFAULT_BASE_PRICE,
  slope: BN = DEFAULT_SLOPE,
): Promise<LaunchResult> {
  const tokenMintKeypair = Keypair.generate();
  const tokenMint = tokenMintKeypair.publicKey;

  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);

  const methods = program.methods as any;

  const escrowTxSig: string = await methods
    .createEscrow(collateralLamports)
    .accounts({
      deployer,
      tokenMint,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const curveTxSig: string = await methods
    .initBondingCurve(basePrice, slope)
    .accounts({
      deployer,
      tokenMint,
      bondingCurve,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { tokenMintKeypair, escrowTxSig, curveTxSig };
}

/** Buy tokens on a bonding curve */
export async function buyTokens(
  program: FyrstProgram,
  buyer: PublicKey,
  tokenMint: PublicKey,
  solAmountLamports: BN,
): Promise<{ txSig: string; recordTxSig: string }> {
  const [bondingCurve] = getCurvePDA(tokenMint);
  const [buyerRecord] = getBuyerRecordPDA(buyer, tokenMint);

  // Fetch current price for record_buyer
  const curveAccount = await (program.account as any).bondingCurve.fetch(bondingCurve);
  const ca = curveAccount as BondingCurveData;
  const currentPrice = ca.basePrice.add(ca.slope.mul(ca.currentSupply));

  // Calculate tokens received
  const tradeFee = solAmountLamports.mul(new BN(100)).div(new BN(10_000));
  const netSol = solAmountLamports.sub(tradeFee);
  const tokensReceived = netSol.mul(new BN(1_000_000_000)).div(currentPrice);

  const methods = program.methods as any;

  const txSig: string = await methods
    .buyTokens(solAmountLamports)
    .accounts({
      buyer,
      bondingCurve,
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

/** Sell tokens on a bonding curve */
export async function sellTokens(
  program: FyrstProgram,
  seller: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: BN,
): Promise<string> {
  const [bondingCurve] = getCurvePDA(tokenMint);

  return await (program.methods as any)
    .sellTokens(tokenAmount)
    .accounts({
      seller,
      bondingCurve,
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

export async function fetchBondingCurve(
  program: FyrstProgram,
  tokenMint: PublicKey,
): Promise<BondingCurveData | null> {
  try {
    const [pda] = getCurvePDA(tokenMint);
    const account = await (program.account as any).bondingCurve.fetch(pda);
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
    const account = await (program.account as any).buyerRecord.fetch(pda);
    return account as unknown as BuyerRecordData;
  } catch {
    return null;
  }
}
