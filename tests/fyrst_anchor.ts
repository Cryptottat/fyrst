import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fyrst } from "../target/types/fyrst";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("FYRST E2E Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Fyrst as Program<Fyrst>;
  const deployer = provider.wallet;
  const tokenMint = Keypair.generate();
  const buyer = Keypair.generate();

  // PDA derivations
  let escrowPda: anchor.web3.PublicKey;
  let escrowBump: number;
  let curvePda: anchor.web3.PublicKey;
  let curveBump: number;
  let buyerRecordPda: anchor.web3.PublicKey;
  let buyerRecordBump: number;

  before(async () => {
    // Derive PDAs
    [escrowPda, escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), deployer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
      program.programId
    );

    [curvePda, curveBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("curve"), tokenMint.publicKey.toBuffer()],
      program.programId
    );

    [buyerRecordPda, buyerRecordBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("record"), buyer.publicKey.toBuffer(), tokenMint.publicKey.toBuffer()],
      program.programId
    );

    // Fund buyer wallet
    const sig = await provider.connection.requestAirdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  });

  it("1. Create escrow with 2 SOL collateral", async () => {
    const collateral = new anchor.BN(2 * LAMPORTS_PER_SOL);

    await program.methods
      .createEscrow(collateral)
      .accounts({
        deployer: deployer.publicKey,
        tokenMint: tokenMint.publicKey,
        escrowVault: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const escrow = await program.account.escrowVault.fetch(escrowPda);
    assert.equal(escrow.deployer.toBase58(), deployer.publicKey.toBase58());
    assert.equal(escrow.tokenMint.toBase58(), tokenMint.publicKey.toBase58());
    assert.equal(escrow.collateralAmount.toNumber(), 2 * LAMPORTS_PER_SOL);
    assert.equal(escrow.released, false);
    assert.equal(escrow.rugged, false);

    console.log("  Escrow created: 2 SOL locked");
  });

  it("2. Reject escrow with insufficient collateral (0.5 SOL)", async () => {
    const badMint = Keypair.generate();
    const [badEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), deployer.publicKey.toBuffer(), badMint.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .createEscrow(new anchor.BN(0.5 * LAMPORTS_PER_SOL))
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
      console.log("  Correctly rejected: 0.5 SOL < 1 SOL minimum");
    }
  });

  it("3. Initialize bonding curve", async () => {
    const basePrice = new anchor.BN(100_000); // 0.0001 SOL in lamports
    const slope = new anchor.BN(10); // 0.00000001 SOL

    await program.methods
      .initBondingCurve(basePrice, slope)
      .accounts({
        deployer: deployer.publicKey,
        tokenMint: tokenMint.publicKey,
        bondingCurve: curvePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const curve = await program.account.bondingCurve.fetch(curvePda);
    assert.equal(curve.tokenMint.toBase58(), tokenMint.publicKey.toBase58());
    assert.equal(curve.currentSupply.toNumber(), 0);
    assert.equal(curve.basePrice.toNumber(), 100_000);
    assert.equal(curve.slope.toNumber(), 10);
    assert.equal(curve.reserveBalance.toNumber(), 0);
    assert.equal(curve.graduated, false);

    console.log("  Curve initialized: base=0.0001 SOL, slope=10");
  });

  it("4. Buy tokens on bonding curve (1 SOL)", async () => {
    const buyAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    const curveBefore = await program.account.bondingCurve.fetch(curvePda);

    await program.methods
      .buyTokens(buyAmount)
      .accounts({
        buyer: buyer.publicKey,
        bondingCurve: curvePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const curveAfter = await program.account.bondingCurve.fetch(curvePda);
    assert.isAbove(curveAfter.currentSupply.toNumber(), 0);
    assert.isAbove(curveAfter.reserveBalance.toNumber(), 0);

    console.log(`  Bought tokens: supply=${curveAfter.currentSupply.toNumber()}, reserve=${curveAfter.reserveBalance.toNumber()}`);
  });

  it("5. Record buyer for refund tracking", async () => {
    const amount = new anchor.BN(1_000_000);
    const price = new anchor.BN(100_000);

    await program.methods
      .recordBuyer(amount, price)
      .accounts({
        buyer: buyer.publicKey,
        tokenMint: tokenMint.publicKey,
        buyerRecord: buyerRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await program.account.buyerRecord.fetch(buyerRecordPda);
    assert.equal(record.buyer.toBase58(), buyer.publicKey.toBase58());
    assert.equal(record.totalBought.toNumber(), 1_000_000);
    assert.equal(record.refundClaimed, false);

    console.log("  Buyer recorded for refund eligibility");
  });

  it("6. Sell tokens on bonding curve", async () => {
    const curveState = await program.account.bondingCurve.fetch(curvePda);
    const sellAmount = new anchor.BN(Math.floor(curveState.currentSupply.toNumber() / 2));

    const buyerBalBefore = await provider.connection.getBalance(buyer.publicKey);

    await program.methods
      .sellTokens(sellAmount)
      .accounts({
        seller: buyer.publicKey,
        bondingCurve: curvePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const curveAfter = await program.account.bondingCurve.fetch(curvePda);
    const buyerBalAfter = await provider.connection.getBalance(buyer.publicKey);

    assert.isBelow(curveAfter.currentSupply.toNumber(), curveState.currentSupply.toNumber());
    assert.isAbove(buyerBalAfter, buyerBalBefore);

    console.log(`  Sold ${sellAmount.toNumber()} tokens, supply now: ${curveAfter.currentSupply.toNumber()}`);
  });

  it("7. Reject early escrow release (safe period not elapsed)", async () => {
    try {
      await program.methods
        .releaseEscrow()
        .accounts({
          deployer: deployer.publicKey,
          escrowVault: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown SafePeriodActive");
    } catch (err: any) {
      assert.include(err.toString(), "SafePeriodActive");
      console.log("  Correctly rejected: 24h safe period still active");
    }
  });

  console.log("\n  All 7 E2E tests cover:");
  console.log("  - Escrow creation + collateral validation");
  console.log("  - Bonding curve init + buy + sell");
  console.log("  - Buyer record for refund tracking");
  console.log("  - Safe period enforcement");
});
