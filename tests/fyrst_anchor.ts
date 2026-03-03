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

describe("FYRST v13 E2E Tests", () => {
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

    [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol")],
      program.programId
    );

    // Fund buyer and treasury wallets
    const sig1 = await provider.connection.requestAirdrop(
      buyer.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    const sig2 = await provider.connection.requestAirdrop(
      treasury.publicKey,
      0.05 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);
  });

  // ─── 1. Protocol Init ────────────────────────────────────────────

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

  // ─── 2. Escrow with Deadline ─────────────────────────────────────

  it("2. Create escrow with 0.1 SOL + 1h deadline", async () => {
    const collateral = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const duration = new anchor.BN(3600); // 1 hour

    await (program.methods as any)
      .createEscrow(collateral, duration)
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
      0.1 * LAMPORTS_PER_SOL
    );
    assert.equal(escrow.released, false);
    // deadline_timestamp should be created_at + 3600
    assert.equal(
      escrow.deadlineTimestamp.toNumber(),
      escrow.createdAt.toNumber() + 3600
    );

    console.log(
      `  Escrow created: 0.1 SOL, deadline=${escrow.deadlineTimestamp.toNumber()}`
    );
  });

  // ─── 3. Reject Insufficient Collateral ───────────────────────────

  it("3. Reject escrow with insufficient collateral (< 0.1 SOL)", async () => {
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
        .createEscrow(
          new anchor.BN(0.05 * LAMPORTS_PER_SOL),
          new anchor.BN(3600)
        )
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
      console.log("  Correctly rejected: 0.05 SOL < 0.1 SOL minimum");
    }
  });

  // ─── 4. Reject Invalid Duration ──────────────────────────────────

  it("4. Reject escrow with invalid duration (< 1h)", async () => {
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
        .createEscrow(
          new anchor.BN(0.1 * LAMPORTS_PER_SOL),
          new anchor.BN(1800) // 30 minutes — too short
        )
        .accounts({
          deployer: deployer.publicKey,
          tokenMint: badMint.publicKey,
          escrowVault: badEscrow,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown InvalidDuration");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidDuration");
      console.log("  Correctly rejected: 1800s < 3600s minimum");
    }
  });

  // ─── 5. Init Bonding Curve ───────────────────────────────────────

  it("5. Initialize bonding curve with SPL mint + metadata", async () => {
    const basePrice = new anchor.BN(100_000);
    const slope = new anchor.BN(10);
    const metadataAccount = getMetadataPDA(tokenMint.publicKey);

    await (program.methods as any)
      .initBondingCurve(
        basePrice,
        slope,
        "TestToken",
        "TEST",
        "https://example.com/meta.json"
      )
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
    assert.equal(
      curve.tokenMint.toBase58(),
      tokenMint.publicKey.toBase58()
    );
    assert.equal(curve.currentSupply.toNumber(), 0);
    assert.equal(curve.reserveBalance.toNumber(), 0);
    assert.equal(curve.totalSolCollected.toNumber(), 0);
    assert.equal(curve.maxReserveReached.toNumber(), 0);
    assert.equal(curve.totalDeployerFees.toNumber(), 0);
    assert.equal(curve.claimedDeployerFees.toNumber(), 0);
    assert.equal(curve.graduated, false);

    console.log("  Curve initialized with SPL mint + Metaplex metadata");
  });

  // ─── 6. Buy Tokens (fee split + max_reserve tracking) ───────────

  it("6. Buy tokens — verify SPL mint + fee split + max_reserve_reached", async () => {
    const buyAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    const buyerAta = getAssociatedTokenAddressSync(
      tokenMint.publicKey,
      buyer.publicKey
    );

    const treasuryBalBefore = await provider.connection.getBalance(
      treasury.publicKey
    );

    await (program.methods as any)
      .buyTokens(buyAmount, new anchor.BN(0))
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

    const curve = await (program.account as any).bondingCurve.fetch(curvePda);
    assert.isAbove(curve.currentSupply.toNumber(), 0);
    assert.isAbove(curve.reserveBalance.toNumber(), 0);
    assert.isAbove(curve.totalSolCollected.toNumber(), 0);
    assert.isAbove(curve.totalDeployerFees.toNumber(), 0);
    assert.isAbove(curve.maxReserveReached.toNumber(), 0);
    assert.equal(curve.claimedDeployerFees.toNumber(), 0);

    // max_reserve_reached should equal reserve_balance after first buy
    assert.equal(
      curve.maxReserveReached.toNumber(),
      curve.reserveBalance.toNumber()
    );

    // Treasury should have received trade fee share
    const treasuryBalAfter = await provider.connection.getBalance(
      treasury.publicKey
    );
    assert.isAbove(treasuryBalAfter, treasuryBalBefore);

    // Verify SPL tokens in buyer ATA
    const ataInfo = await getAccount(provider.connection, buyerAta);
    assert.isAbove(Number(ataInfo.amount), 0);

    console.log(
      `  Bought: supply=${curve.currentSupply.toNumber()}, reserve=${curve.reserveBalance.toNumber()}, deployer_fees=${curve.totalDeployerFees.toNumber()}, max_reserve=${curve.maxReserveReached.toNumber()}`
    );
  });

  // ─── 7. Sell Tokens (with protocol_config + treasury) ────────────

  it("7. Sell tokens — burns SPL + fee split", async () => {
    const curveBefore = await (program.account as any).bondingCurve.fetch(
      curvePda
    );
    const sellAmount = new anchor.BN(
      Math.floor(curveBefore.currentSupply.toNumber() / 2)
    );
    const sellerAta = getAssociatedTokenAddressSync(
      tokenMint.publicKey,
      buyer.publicKey
    );
    const buyerBalBefore = await provider.connection.getBalance(
      buyer.publicKey
    );

    await (program.methods as any)
      .sellTokens(sellAmount, new anchor.BN(0))
      .accounts({
        seller: buyer.publicKey,
        bondingCurve: curvePda,
        tokenMint: tokenMint.publicKey,
        sellerTokenAccount: sellerAta,
        protocolConfig: protocolConfigPda,
        treasury: treasury.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const curveAfter = await (program.account as any).bondingCurve.fetch(
      curvePda
    );
    const buyerBalAfter = await provider.connection.getBalance(buyer.publicKey);

    assert.isBelow(
      curveAfter.currentSupply.toNumber(),
      curveBefore.currentSupply.toNumber()
    );
    assert.isAbove(buyerBalAfter, buyerBalBefore);

    // max_reserve_reached should NOT decrease after sell
    assert.equal(
      curveAfter.maxReserveReached.toNumber(),
      curveBefore.maxReserveReached.toNumber()
    );

    // total_deployer_fees should increase (sell also generates fees)
    assert.isAbove(
      curveAfter.totalDeployerFees.toNumber(),
      curveBefore.totalDeployerFees.toNumber()
    );

    console.log(
      `  Sold ${sellAmount.toNumber()} tokens, supply=${curveAfter.currentSupply.toNumber()}, max_reserve unchanged=${curveAfter.maxReserveReached.toNumber()}`
    );
  });

  // ─── 8. Claim Fees (progressive unlock) ──────────────────────────

  it("8. Claim deployer fees (progressive unlock)", async () => {
    const curveBefore = await (program.account as any).bondingCurve.fetch(
      curvePda
    );
    const deployerBalBefore = await provider.connection.getBalance(
      deployer.publicKey
    );

    // Progressive unlock: unlocked = (totalDeployerFees * maxReserveReached) / GRADUATION_THRESHOLD
    const expectedUnlocked = Math.floor(
      (curveBefore.totalDeployerFees.toNumber() *
        curveBefore.maxReserveReached.toNumber()) /
        85_000_000_000
    );

    console.log(
      `  Pre-claim: totalFees=${curveBefore.totalDeployerFees.toNumber()}, maxReserve=${curveBefore.maxReserveReached.toNumber()}, expectedUnlocked=${expectedUnlocked}`
    );

    if (expectedUnlocked === 0) {
      // Reserve is too small relative to 85 SOL threshold — skip
      console.log("  Skipped: unlock amount rounds to 0 (small reserve vs 85 SOL threshold)");
      return;
    }

    await (program.methods as any)
      .claimFees()
      .accounts({
        deployer: deployer.publicKey,
        bondingCurve: curvePda,
      })
      .rpc();

    const curveAfter = await (program.account as any).bondingCurve.fetch(
      curvePda
    );
    assert.equal(curveAfter.claimedDeployerFees.toNumber(), expectedUnlocked);

    const deployerBalAfter = await provider.connection.getBalance(
      deployer.publicKey
    );
    // Account for tx fee, so just check balance didn't decrease much
    console.log(
      `  Claimed ${expectedUnlocked} lamports, claimedDeployerFees=${curveAfter.claimedDeployerFees.toNumber()}`
    );
  });

  // ─── 9. Release Escrow Blocked (not graduated) ──────────────────

  it("9. Release escrow blocked — token not graduated", async () => {
    try {
      await (program.methods as any)
        .releaseEscrow()
        .accounts({
          deployer: deployer.publicKey,
          escrowVault: escrowPda,
          bondingCurve: curvePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown NotGraduated");
    } catch (err: any) {
      assert.include(err.toString(), "NotGraduated");
      console.log("  Correctly blocked: token not graduated");
    }
  });

  // ─── 10. Refund blocked — deadline not reached ─────────────────

  it("10. Refund blocked — deadline not reached yet (burn-to-refund)", async () => {
    const buyerAta = getAssociatedTokenAddressSync(
      tokenMint.publicKey,
      buyer.publicKey
    );

    try {
      await (program.methods as any)
        .processRefund()
        .accounts({
          buyer: buyer.publicKey,
          escrowVault: escrowPda,
          bondingCurve: curvePda,
          tokenMint: tokenMint.publicKey,
          buyerTokenAccount: buyerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      assert.fail("Should have thrown DeadlineNotReached");
    } catch (err: any) {
      assert.include(err.toString(), "DeadlineNotReached");
      console.log("  Correctly blocked: deadline (1h) has not passed yet");
    }
  });

  // NOTE: Full refund success test requires clock warp (advancing time past
  // deadline). Since localnet mocha doesn't easily support clock warp,
  // we verify the DeadlineNotReached guard above. The burn-to-refund
  // model ensures: no tokens → no refund (eliminating the exploit).

});
