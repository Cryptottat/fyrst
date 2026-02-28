import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fyrst } from "../target/types/fyrst";
import {
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

describe("FYRST E2E Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Fyrst as Program<Fyrst>;
  const deployer = provider.wallet;
  const tokenMint = Keypair.generate();
  const buyer = Keypair.generate();
  const treasury = Keypair.generate();

  // PDAs
  let escrowPda: PublicKey;
  let curvePda: PublicKey;
  let buyerRecordPda: PublicKey;
  let protocolConfigPda: PublicKey;

  before(async () => {
    // Derive PDAs
    [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        deployer.publicKey.toBuffer(),
        tokenMint.publicKey.toBuffer(),
      ],
      program.programId
    );

    [curvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), tokenMint.publicKey.toBuffer()],
      program.programId
    );

    [buyerRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("record"),
        buyer.publicKey.toBuffer(),
        tokenMint.publicKey.toBuffer(),
      ],
      program.programId
    );

    [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    // Fund buyer and treasury wallets (small amounts to conserve devnet SOL)
    const sig1 = await provider.connection.requestAirdrop(
      buyer.publicKey,
      0.5 * LAMPORTS_PER_SOL
    );
    const sig2 = await provider.connection.requestAirdrop(
      treasury.publicKey,
      0.05 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);
  });

  it("1. Initialize protocol config", async () => {
    await (program.methods as any)
      .initProtocol(treasury.publicKey)
      .accounts({
        authority: deployer.publicKey,
        protocolConfig: protocolConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await (program.account as any).protocolConfig.fetch(
      protocolConfigPda
    );
    assert.equal(
      config.authority.toBase58(),
      deployer.publicKey.toBase58()
    );
    assert.equal(config.treasury.toBase58(), treasury.publicKey.toBase58());
    assert.equal(
      config.graduationThreshold.toNumber(),
      85_000_000_000
    );

    console.log("  Protocol initialized: authority + treasury set");
  });

  it("2. Create escrow with 0.02 SOL collateral", async () => {
    const collateral = new anchor.BN(0.02 * LAMPORTS_PER_SOL);

    await (program.methods as any)
      .createEscrow(collateral)
      .accounts({
        deployer: deployer.publicKey,
        tokenMint: tokenMint.publicKey,
        escrowVault: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const escrow = await (program.account as any).escrowVault.fetch(escrowPda);
    assert.equal(escrow.deployer.toBase58(), deployer.publicKey.toBase58());
    assert.equal(
      escrow.collateralAmount.toNumber(),
      0.02 * LAMPORTS_PER_SOL
    );
    assert.equal(escrow.released, false);
    assert.equal(escrow.rugged, false);

    console.log("  Escrow created: 0.02 SOL locked");
  });

  it("3. Reject escrow with insufficient collateral (0.005 SOL)", async () => {
    const badMint = Keypair.generate();
    const [badEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        deployer.publicKey.toBuffer(),
        badMint.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await (program.methods as any)
        .createEscrow(new anchor.BN(0.005 * LAMPORTS_PER_SOL))
        .accounts({
          deployer: deployer.publicKey,
          tokenMint: badMint.publicKey,
          escrowVault: badEscrow,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown InsufficientCollateral");
    } catch (err: any) {
      assert.include(err.toString(), "InsufficientCollateral");
      console.log("  Correctly rejected: 0.005 SOL < 0.01 SOL minimum");
    }
  });

  it("4. Initialize bonding curve with SPL mint + metadata", async () => {
    const basePrice = new anchor.BN(100_000);
    const slope = new anchor.BN(10);
    const metadataAccount = getMetadataPDA(tokenMint.publicKey);

    await (program.methods as any)
      .initBondingCurve(basePrice, slope, "TestToken", "TEST", "https://example.com/meta.json")
      .accounts({
        deployer: deployer.publicKey,
        tokenMint: tokenMint.publicKey,
        bondingCurve: curvePda,
        metadataAccount,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([tokenMint])
      .rpc();

    const curve = await (program.account as any).bondingCurve.fetch(curvePda);
    assert.equal(curve.tokenMint.toBase58(), tokenMint.publicKey.toBase58());
    assert.equal(curve.currentSupply.toNumber(), 0);
    assert.equal(curve.basePrice.toNumber(), 100_000);
    assert.equal(curve.slope.toNumber(), 10);
    assert.equal(curve.reserveBalance.toNumber(), 0);
    assert.equal(curve.totalSolCollected.toNumber(), 0);
    assert.equal(curve.graduated, false);

    console.log("  Curve initialized with SPL mint + Metaplex metadata");
  });

  it("5. Buy tokens — mints real SPL tokens to buyer ATA", async () => {
    const buyAmount = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
    const buyerAta = getAssociatedTokenAddressSync(
      tokenMint.publicKey,
      buyer.publicKey
    );

    await (program.methods as any)
      .buyTokens(buyAmount)
      .accounts({
        buyer: buyer.publicKey,
        bondingCurve: curvePda,
        tokenMint: tokenMint.publicKey,
        buyerTokenAccount: buyerAta,
        protocolConfig: protocolConfigPda,
        treasury: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const curveAfter = await (program.account as any).bondingCurve.fetch(curvePda);
    assert.isAbove(curveAfter.currentSupply.toNumber(), 0);
    assert.isAbove(curveAfter.reserveBalance.toNumber(), 0);
    assert.isAbove(curveAfter.totalSolCollected.toNumber(), 0);

    // Verify SPL tokens arrived in buyer's ATA
    const ataInfo = await getAccount(provider.connection, buyerAta);
    assert.isAbove(Number(ataInfo.amount), 0);

    console.log(
      `  Bought tokens: supply=${curveAfter.currentSupply.toNumber()}, SPL balance=${ataInfo.amount}`
    );
  });

  it("6. Record buyer for refund tracking", async () => {
    const amount = new anchor.BN(1_000_000);
    const price = new anchor.BN(100_000);

    await (program.methods as any)
      .recordBuyer(amount, price)
      .accounts({
        buyer: buyer.publicKey,
        tokenMint: tokenMint.publicKey,
        buyerRecord: buyerRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await (program.account as any).buyerRecord.fetch(buyerRecordPda);
    assert.equal(record.buyer.toBase58(), buyer.publicKey.toBase58());
    assert.equal(record.totalBought.toNumber(), 1_000_000);
    assert.equal(record.refundClaimed, false);

    console.log("  Buyer recorded for refund eligibility");
  });

  it("7. Sell tokens — burns SPL tokens", async () => {
    const curveState = await (program.account as any).bondingCurve.fetch(curvePda);
    const sellAmount = new anchor.BN(
      Math.floor(curveState.currentSupply.toNumber() / 2)
    );
    const sellerAta = getAssociatedTokenAddressSync(
      tokenMint.publicKey,
      buyer.publicKey
    );

    const buyerBalBefore = await provider.connection.getBalance(buyer.publicKey);

    await (program.methods as any)
      .sellTokens(sellAmount)
      .accounts({
        seller: buyer.publicKey,
        bondingCurve: curvePda,
        tokenMint: tokenMint.publicKey,
        sellerTokenAccount: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const curveAfter = await (program.account as any).bondingCurve.fetch(curvePda);
    const buyerBalAfter = await provider.connection.getBalance(buyer.publicKey);

    assert.isBelow(
      curveAfter.currentSupply.toNumber(),
      curveState.currentSupply.toNumber()
    );
    assert.isAbove(buyerBalAfter, buyerBalBefore);

    console.log(
      `  Sold ${sellAmount.toNumber()} tokens, supply now: ${curveAfter.currentSupply.toNumber()}`
    );
  });

  it("8. Mark token as rugged (authority only)", async () => {
    await (program.methods as any)
      .markRugged()
      .accounts({
        authority: deployer.publicKey,
        protocolConfig: protocolConfigPda,
        escrowVault: escrowPda,
      })
      .rpc();

    const escrow = await (program.account as any).escrowVault.fetch(escrowPda);
    assert.equal(escrow.rugged, true);

    console.log("  Token marked as rugged");
  });

  it("9. Process pro-rata refund", async () => {
    const buyerBalBefore = await provider.connection.getBalance(buyer.publicKey);

    await (program.methods as any)
      .processRefund()
      .accounts({
        authority: deployer.publicKey,
        buyer: buyer.publicKey,
        protocolConfig: protocolConfigPda,
        escrowVault: escrowPda,
        bondingCurve: curvePda,
        buyerRecord: buyerRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const buyerBalAfter = await provider.connection.getBalance(buyer.publicKey);
    assert.isAbove(buyerBalAfter, buyerBalBefore);

    const record = await (program.account as any).buyerRecord.fetch(buyerRecordPda);
    assert.equal(record.refundClaimed, true);

    console.log(
      `  Refund processed: ${(buyerBalAfter - buyerBalBefore) / LAMPORTS_PER_SOL} SOL returned`
    );
  });

  it("10. Release escrow blocked when rugged", async () => {
    try {
      await (program.methods as any)
        .releaseEscrow()
        .accounts({
          deployer: deployer.publicKey,
          escrowVault: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown TokenIsRugged");
    } catch (err: any) {
      assert.include(err.toString(), "TokenIsRugged");
      console.log("  Correctly blocked: rugged escrow cannot be released");
    }
  });

  it("11. Reject early escrow release (safe period not elapsed)", async () => {
    // Create a new fresh escrow to test safe period (not rugged)
    const freshMint = Keypair.generate();
    const [freshEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        deployer.publicKey.toBuffer(),
        freshMint.publicKey.toBuffer(),
      ],
      program.programId
    );

    await (program.methods as any)
      .createEscrow(new anchor.BN(0.02 * LAMPORTS_PER_SOL))
      .accounts({
        deployer: deployer.publicKey,
        tokenMint: freshMint.publicKey,
        escrowVault: freshEscrow,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await (program.methods as any)
        .releaseEscrow()
        .accounts({
          deployer: deployer.publicKey,
          escrowVault: freshEscrow,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown SafePeriodActive");
    } catch (err: any) {
      assert.include(err.toString(), "SafePeriodActive");
      console.log("  Correctly rejected: 24h safe period still active");
    }
  });
});
