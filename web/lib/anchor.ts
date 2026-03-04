import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, ComputeBudgetProgram, Connection } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
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
const PROTOCOL_SEED = Buffer.from("protocol");

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const RAYDIUM_CPMM_PROGRAM = new PublicKey(
  process.env.NEXT_PUBLIC_DEVNET !== "false"
    ? "DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb" // devnet (official)
    : "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // mainnet
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
  txSig: string;
}

/** Launch a new token: create_escrow + init_bonding_curve batched in 1 TX (1 wallet approval) */
export async function launchToken(
  program: FyrstProgram,
  deployer: PublicKey,
  collateralLamports: BN,
  name: string,
  symbol: string,
  uri: string,
  durationSeconds: BN = new BN(86_400),
  basePrice: BN = DEFAULT_BASE_PRICE,
  slope: BN = DEFAULT_SLOPE,
): Promise<LaunchResult> {
  const provider = program.provider as AnchorProvider;
  const tokenMintKeypair = Keypair.generate();
  const tokenMint = tokenMintKeypair.publicKey;

  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);
  const metadataAccount = getMetadataPDA(tokenMint);

  const methods = program.methods as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const escrowIx = await methods
    .createEscrow(collateralLamports, durationSeconds)
    .accounts({
      deployer,
      tokenMint,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const curveIx = await methods
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
    .instruction();

  // Single TX: escrow + bonding curve (1 wallet signature)
  const tx = new Transaction().add(escrowIx, curveIx);
  const txSig = await provider.sendAndConfirm(tx, [tokenMintKeypair]);

  return { tokenMintKeypair, txSig };
}

/** Launch + initial buy: escrow + curve + buy in 1 TX (1 wallet approval) */
export async function launchAndBuy(
  program: FyrstProgram,
  deployer: PublicKey,
  collateralLamports: BN,
  name: string,
  symbol: string,
  uri: string,
  buyAmountLamports: BN,
  durationSeconds: BN = new BN(86_400),
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
  basePrice: BN = DEFAULT_BASE_PRICE,
  slope: BN = DEFAULT_SLOPE,
): Promise<LaunchResult> {
  const provider = program.provider as AnchorProvider;
  const tokenMintKeypair = Keypair.generate();
  const tokenMint = tokenMintKeypair.publicKey;

  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);
  const metadataAccount = getMetadataPDA(tokenMint);
  const [protocolConfig] = getProtocolConfigPDA();
  const buyerTokenAccount = getAssociatedTokenAddressSync(tokenMint, deployer);

  // Fetch protocol config for treasury address
  const configAccount = await (program.account as any).protocolConfig.fetch(protocolConfig); // eslint-disable-line @typescript-eslint/no-explicit-any
  const treasury = configAccount.treasury as PublicKey;

  const methods = program.methods as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // IX 1: Create escrow
  const escrowIx = await methods
    .createEscrow(collateralLamports, durationSeconds)
    .accounts({
      deployer,
      tokenMint,
      escrowVault,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // IX 2: Init bonding curve
  const curveIx = await methods
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
    .instruction();

  // Calculate expected tokens using known initial state (supply = 0)
  // Total fee = 1% trade fee only (no separate protocol fee)
  const tradeFee = buyAmountLamports.mul(new BN(100)).div(new BN(10_000));
  const netSol = buyAmountLamports.sub(tradeFee);
  const expectedTokens = estimateBuyTokens(basePrice, slope, new BN(0), netSol);
  const minTokensOut = expectedTokens.muln(10_000 - slippageBps).divn(10_000);

  // IX 3: Buy tokens
  const buyIx = await methods
    .buyTokens(buyAmountLamports, minTokensOut)
    .accounts({
      buyer: deployer,
      bondingCurve,
      tokenMint,
      buyerTokenAccount,
      protocolConfig,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Single TX: escrow + curve + buy (1 wallet signature)
  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }))
    .add(escrowIx, curveIx, buyIx);
  const txSig = await provider.sendAndConfirm(tx, [tokenMintKeypair]);

  return { tokenMintKeypair, txSig };
}

/** Integer square root (Babylonian method) for BN */
function bnSqrt(n: BN): BN {
  if (n.isZero()) return new BN(0);
  let x = n;
  let y = x.addn(1).divn(2);
  while (y.lt(x)) {
    x = y;
    y = x.add(n.div(x)).divn(2);
  }
  return x;
}

/** Estimate tokens received for a buy using integral pricing */
export function estimateBuyTokens(
  basePrice: BN,
  slope: BN,
  currentSupply: BN,
  netSolLamports: BN,
): BN {
  const d = new BN(10 ** TOKEN_DECIMALS);
  if (slope.isZero()) {
    return netSolLamports.mul(d).div(basePrice);
  }
  // Quadratic: slope*T^2 + 2*(base*D + slope*S)*T - 2*net*D^2 = 0
  // T = (-b + sqrt(b^2 + 4ac)) / (2a)
  const s = currentSupply;
  const bp = basePrice;
  const sl = slope;
  const b = bp.mul(d).add(sl.mul(s)).muln(2);
  const cVal = netSolLamports.mul(d).mul(d).muln(2);
  const disc = b.mul(b).add(sl.muln(4).mul(cVal));
  const sqrtDisc = bnSqrt(disc);
  return sqrtDisc.sub(b).div(sl.muln(2));
}

/** Estimate SOL received for a sell using integral pricing */
export function estimateSellSol(
  basePrice: BN,
  slope: BN,
  currentSupply: BN,
  tokenAmount: BN,
): BN {
  const d = new BN(10 ** TOKEN_DECIMALS);
  // gross = base*T/D + slope*T*(2S-T) / (2*D^2)
  const t = tokenAmount;
  const s = currentSupply;
  const part1 = basePrice.mul(t).div(d);
  const part2 = slope.mul(t).mul(s.muln(2).sub(t)).div(d.mul(d).muln(2));
  return part1.add(part2);
}

/** Default slippage tolerance in basis points (1% = 100 bps) */
export const DEFAULT_SLIPPAGE_BPS = 100;

/** Buy tokens on a bonding curve (1 TX, 1 wallet approval) */
export async function buyTokens(
  program: FyrstProgram,
  buyer: PublicKey,
  tokenMint: PublicKey,
  solAmountLamports: BN,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const [bondingCurve] = getCurvePDA(tokenMint);
  const [protocolConfig] = getProtocolConfigPDA();

  // Fetch protocol config for treasury address
  const configAccount = await (program.account as any).protocolConfig.fetch(protocolConfig); // eslint-disable-line @typescript-eslint/no-explicit-any
  const treasury = configAccount.treasury as PublicKey;

  // Fetch current curve state
  const curveAccount = await (program.account as any).bondingCurve.fetch(bondingCurve); // eslint-disable-line @typescript-eslint/no-explicit-any
  const ca = curveAccount as BondingCurveData;

  // Calculate fees and net SOL (1% total fee)
  const tradeFee = solAmountLamports.mul(new BN(100)).div(new BN(10_000));
  const netSol = solAmountLamports.sub(tradeFee);

  // Estimate tokens using integral pricing
  const expectedTokens = estimateBuyTokens(ca.basePrice, ca.slope, ca.currentSupply, netSol);
  const minTokensOut = expectedTokens.muln(10_000 - slippageBps).divn(10_000);

  const buyerTokenAccount = getAssociatedTokenAddressSync(tokenMint, buyer);

  const buyIx = await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .buyTokens(solAmountLamports, minTokensOut)
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
    .instruction();

  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
    .add(buyIx);
  return await provider.sendAndConfirm(tx, []);
}

/** Sell tokens on a bonding curve — burns SPL tokens */
export async function sellTokens(
  program: FyrstProgram,
  seller: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: BN,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const [bondingCurve] = getCurvePDA(tokenMint);
  const [protocolConfig] = getProtocolConfigPDA();
  const sellerTokenAccount = getAssociatedTokenAddressSync(tokenMint, seller);

  // Fetch protocol config for treasury address
  const configAccount = await (program.account as any).protocolConfig.fetch(protocolConfig); // eslint-disable-line @typescript-eslint/no-explicit-any
  const treasury = configAccount.treasury as PublicKey;

  // Fetch curve state for expected SOL calculation
  const curveAccount = await (program.account as any).bondingCurve.fetch(bondingCurve); // eslint-disable-line @typescript-eslint/no-explicit-any
  const ca = curveAccount as BondingCurveData;

  // Estimate SOL received using integral pricing (1% total fee)
  const expectedGross = estimateSellSol(ca.basePrice, ca.slope, ca.currentSupply, tokenAmount);
  const tradeFee = expectedGross.muln(100).divn(10_000); // 1%
  let expectedNet = expectedGross.sub(tradeFee);

  // Cap at reserve balance (matches on-chain cap — prevents SlippageExceeded)
  if (expectedNet.gt(ca.reserveBalance)) {
    expectedNet = ca.reserveBalance;
  }

  const minSolOut = expectedNet.muln(10_000 - slippageBps).divn(10_000);

  const sellIx = await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .sellTokens(tokenAmount, minSolOut)
    .accounts({
      seller,
      bondingCurve,
      tokenMint,
      sellerTokenAccount,
      protocolConfig,
      treasury,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Add compute budget for safety with large amounts
  const tx = new Transaction()
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }))
    .add(sellIx);
  return await provider.sendAndConfirm(tx, []);
}

/** Process burn-to-refund: burns buyer's tokens and returns pro-rata SOL from escrow */
export async function processRefund(
  program: FyrstProgram,
  buyer: PublicKey,
  deployer: PublicKey,
  tokenMint: PublicKey,
): Promise<string> {
  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);
  const buyerTokenAccount = getAssociatedTokenAddressSync(tokenMint, buyer);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .processRefund()
    .accounts({
      buyer,
      escrowVault,
      bondingCurve,
      tokenMint,
      buyerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Claim accumulated trade fees (deployer only — 50% of trade fees) */
export async function claimFees(
  program: FyrstProgram,
  deployer: PublicKey,
  tokenMint: PublicKey,
): Promise<string> {
  const [bondingCurve] = getCurvePDA(tokenMint);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .claimFees()
    .accounts({
      deployer,
      bondingCurve,
    })
    .rpc();
}

/** Release escrow back to deployer (requires token graduation) */
export async function releaseEscrow(
  program: FyrstProgram,
  deployer: PublicKey,
  tokenMint: PublicKey,
): Promise<string> {
  const [escrowVault] = getEscrowPDA(deployer, tokenMint);
  const [bondingCurve] = getCurvePDA(tokenMint);

  return await (program.methods as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .releaseEscrow()
    .accounts({
      deployer,
      escrowVault,
      bondingCurve,
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

/** Migrate graduated token to Raydium CPMM DEX (permissionless — multi-IX TX).
 *  Payer temporarily fronts the WSOL; program reimburses from bonding curve reserve. */
export async function graduateToDex(
  program: FyrstProgram,
  payer: PublicKey,
  tokenMint: PublicKey,
  reserveLamports: number | BN,
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const connection = provider.connection;
  const [bondingCurve] = getCurvePDA(tokenMint);
  const reserveSol = typeof reserveLamports === "number" ? reserveLamports : reserveLamports.toNumber();

  // Payer's ATAs (payer = Raydium pool creator)
  const payerTokenAccount = getAssociatedTokenAddressSync(tokenMint, payer);
  const payerWsolAccount = getAssociatedTokenAddressSync(WSOL_MINT, payer);

  // Raydium CPMM account derivations
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")],
    RAYDIUM_CPMM_PROGRAM,
  );

  // Token ordering: token0 < token1 by pubkey bytes
  const wsolIsToken0 = Buffer.compare(WSOL_MINT.toBuffer(), tokenMint.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : tokenMint;
  const token1Mint = wsolIsToken0 ? tokenMint : WSOL_MINT;

  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), ammConfig.toBuffer(), token0Mint.toBuffer(), token1Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [lpMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), poolState.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );

  const createPoolFee = new PublicKey(
    process.env.NEXT_PUBLIC_DEVNET !== "false"
      ? "3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy"
      : "DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8"
  );

  // LP token ATA for payer (Raydium creates it, we burn after)
  const creatorLpToken = getAssociatedTokenAddressSync(lpMint, payer);

  // Build multi-IX transaction
  const tx = new Transaction();

  // IX 0: Compute budget
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }));

  // IX 1: Create payer WSOL ATA if needed
  const wsolAtaInfo = await connection.getAccountInfo(payerWsolAccount);
  if (!wsolAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(payer, payerWsolAccount, payer, WSOL_MINT));
  }

  // IX 2: Create payer token ATA if needed
  const tokenAtaInfo = await connection.getAccountInfo(payerTokenAccount);
  if (!tokenAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(payer, payerTokenAccount, payer, tokenMint));
  }

  // IX 3: Transfer SOL to payer's WSOL ATA
  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: payerWsolAccount, lamports: reserveSol }));

  // IX 4: sync_native
  tx.add(createSyncNativeInstruction(payerWsolAccount));

  // IX 5: graduate_to_dex
  const methods = program.methods as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const graduateIx = await methods
    .graduateToDex()
    .accounts({
      payer,
      bondingCurve,
      tokenMint,
      wsolMint: WSOL_MINT,
      payerTokenAccount,
      payerWsolAccount,
      cpSwapProgram: RAYDIUM_CPMM_PROGRAM,
      ammConfig,
      raydiumAuthority,
      poolState,
      token0Vault,
      token1Vault,
      createPoolFee,
      lpMint,
      creatorLpToken,
      observationState,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();
  tx.add(graduateIx);

  return await provider.sendAndConfirm(tx, []);
}

// ---------------------------------------------------------------------------
// Raydium CPMM Swap Helpers
// ---------------------------------------------------------------------------

/** Derive all Raydium CPMM accounts for a given token mint */
export function deriveRaydiumAccounts(tokenMint: PublicKey) {
  const [ammConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_config"), Buffer.alloc(2)],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [raydiumAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_and_lp_mint_auth_seed")],
    RAYDIUM_CPMM_PROGRAM,
  );

  const wsolIsToken0 = Buffer.compare(WSOL_MINT.toBuffer(), tokenMint.toBuffer()) < 0;
  const token0Mint = wsolIsToken0 ? WSOL_MINT : tokenMint;
  const token1Mint = wsolIsToken0 ? tokenMint : WSOL_MINT;

  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), ammConfig.toBuffer(), token0Mint.toBuffer(), token1Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [token0Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token0Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [token1Vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolState.toBuffer(), token1Mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );
  const [observationState] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolState.toBuffer()],
    RAYDIUM_CPMM_PROGRAM,
  );

  return { ammConfig, raydiumAuthority, poolState, token0Vault, token1Vault, observationState, wsolIsToken0, token0Mint, token1Mint };
}

const SWAP_BASE_INPUT_DISCRIMINATOR = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222]);

/** Encode a BN as 8-byte little-endian buffer (browser-safe, no BigInt needed) */
function bnToU64LE(val: BN): Buffer {
  return val.toArrayLike(Buffer, "le", 8);
}

/** Buy token via Raydium CPMM swap (SOL → Token) */
export async function raydiumBuy(
  program: FyrstProgram,
  buyer: PublicKey,
  tokenMint: PublicKey,
  solLamports: BN,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const connection = provider.connection;
  const { ammConfig, raydiumAuthority, poolState, token0Vault, token1Vault, observationState, wsolIsToken0, token0Mint, token1Mint } = deriveRaydiumAccounts(tokenMint);

  const buyerTokenAta = getAssociatedTokenAddressSync(tokenMint, buyer);
  const buyerWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, buyer);

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

  // Create token ATA if needed
  const tokenAtaInfo = await connection.getAccountInfo(buyerTokenAta);
  if (!tokenAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(buyer, buyerTokenAta, buyer, tokenMint));
  }

  // Create WSOL ATA if needed
  const wsolAtaInfo = await connection.getAccountInfo(buyerWsolAta);
  if (!wsolAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(buyer, buyerWsolAta, buyer, WSOL_MINT));
  }

  // Transfer SOL → WSOL ATA + syncNative
  tx.add(SystemProgram.transfer({ fromPubkey: buyer, toPubkey: buyerWsolAta, lamports: solLamports.toNumber() }));
  tx.add(createSyncNativeInstruction(buyerWsolAta));

  // swap_base_input IX data: discriminator(8) + amount_in(8) + min_amount_out(8)
  const data = Buffer.concat([
    SWAP_BASE_INPUT_DISCRIMINATOR,
    bnToU64LE(solLamports),
    bnToU64LE(new BN(0)), // min_amount_out
  ]);

  // input = WSOL, output = Token
  const inputAta = buyerWsolAta;
  const outputAta = buyerTokenAta;
  const inputVault = wsolIsToken0 ? token0Vault : token1Vault;
  const outputVault = wsolIsToken0 ? token1Vault : token0Vault;
  const inputMint = WSOL_MINT;
  const outputMint = tokenMint;

  const swapIx = {
    programId: RAYDIUM_CPMM_PROGRAM,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: raydiumAuthority, isSigner: false, isWritable: false },
      { pubkey: ammConfig, isSigner: false, isWritable: false },
      { pubkey: poolState, isSigner: false, isWritable: true },
      { pubkey: inputAta, isSigner: false, isWritable: true },
      { pubkey: outputAta, isSigner: false, isWritable: true },
      { pubkey: inputVault, isSigner: false, isWritable: true },
      { pubkey: outputVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: inputMint, isSigner: false, isWritable: false },
      { pubkey: outputMint, isSigner: false, isWritable: false },
      { pubkey: observationState, isSigner: false, isWritable: true },
    ],
    data,
  };
  tx.add(swapIx);

  return await provider.sendAndConfirm(tx, []);
}

/** Sell token via Raydium CPMM swap (Token → SOL) */
export async function raydiumSell(
  program: FyrstProgram,
  seller: PublicKey,
  tokenMint: PublicKey,
  tokenAmount: BN,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS,
): Promise<string> {
  const provider = program.provider as AnchorProvider;
  const connection = provider.connection;
  const { ammConfig, raydiumAuthority, poolState, token0Vault, token1Vault, observationState, wsolIsToken0 } = deriveRaydiumAccounts(tokenMint);

  const sellerTokenAta = getAssociatedTokenAddressSync(tokenMint, seller);
  const sellerWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, seller);

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));

  // Create WSOL ATA if needed
  const wsolAtaInfo = await connection.getAccountInfo(sellerWsolAta);
  if (!wsolAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(seller, sellerWsolAta, seller, WSOL_MINT));
  }

  // swap_base_input IX data: discriminator(8) + amount_in(8) + min_amount_out(8)
  const data = Buffer.concat([
    SWAP_BASE_INPUT_DISCRIMINATOR,
    bnToU64LE(tokenAmount),
    bnToU64LE(new BN(0)), // min_amount_out
  ]);

  // input = Token, output = WSOL
  const inputAta = sellerTokenAta;
  const outputAta = sellerWsolAta;
  const inputVault = wsolIsToken0 ? token1Vault : token0Vault;
  const outputVault = wsolIsToken0 ? token0Vault : token1Vault;
  const inputMint = tokenMint;
  const outputMint = WSOL_MINT;

  const swapIx = {
    programId: RAYDIUM_CPMM_PROGRAM,
    keys: [
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: raydiumAuthority, isSigner: false, isWritable: false },
      { pubkey: ammConfig, isSigner: false, isWritable: false },
      { pubkey: poolState, isSigner: false, isWritable: true },
      { pubkey: inputAta, isSigner: false, isWritable: true },
      { pubkey: outputAta, isSigner: false, isWritable: true },
      { pubkey: inputVault, isSigner: false, isWritable: true },
      { pubkey: outputVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: inputMint, isSigner: false, isWritable: false },
      { pubkey: outputMint, isSigner: false, isWritable: false },
      { pubkey: observationState, isSigner: false, isWritable: true },
    ],
    data,
  };
  tx.add(swapIx);

  // Close WSOL ATA → unwrap SOL back to seller
  tx.add(createCloseAccountInstruction(sellerWsolAta, seller, seller));

  return await provider.sendAndConfirm(tx, []);
}

// ---------------------------------------------------------------------------
// Raydium Pool Price (on-chain vault balance ratio)
// ---------------------------------------------------------------------------

export interface RaydiumPoolPrice {
  price: number;       // SOL per token
  wsolReserve: number; // SOL in pool
  tokenReserve: number; // tokens in pool
}

/** Fetch current Raydium CPMM pool price from vault balances */
export async function fetchRaydiumPoolPrice(
  connection: Connection,
  tokenMint: PublicKey,
): Promise<RaydiumPoolPrice | null> {
  try {
    const { token0Vault, token1Vault, wsolIsToken0 } = deriveRaydiumAccounts(tokenMint);

    const wsolVault = wsolIsToken0 ? token0Vault : token1Vault;
    const tokenVault = wsolIsToken0 ? token1Vault : token0Vault;

    const [wsolInfo, tokenInfo] = await Promise.all([
      connection.getTokenAccountBalance(wsolVault),
      connection.getTokenAccountBalance(tokenVault),
    ]);

    const wsolReserve = wsolInfo.value.uiAmount ?? 0;
    const tokenReserve = tokenInfo.value.uiAmount ?? 0;

    if (tokenReserve === 0) return null;

    return {
      price: wsolReserve / tokenReserve,
      wsolReserve,
      tokenReserve,
    };
  } catch {
    return null;
  }
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
  maxReserveReached: BN;
  totalDeployerFees: BN;
  claimedDeployerFees: BN;
  dexMigrated: boolean;
  raydiumPool: PublicKey;
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
