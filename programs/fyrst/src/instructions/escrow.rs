use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{EscrowVault, BondingCurve};
use crate::errors::FyrstError;
use crate::constants::*;

/// Create an escrow vault with deployer collateral and custom deadline
pub fn create_escrow(ctx: Context<CreateEscrow>, collateral_amount: u64, duration_seconds: i64) -> Result<()> {
    require!(
        collateral_amount >= MIN_COLLATERAL,
        FyrstError::InsufficientCollateral
    );
    require!(
        duration_seconds >= MIN_DURATION && duration_seconds <= MAX_DURATION,
        FyrstError::InvalidDuration
    );

    let now = Clock::get()?.unix_timestamp;

    // Transfer SOL from deployer to escrow PDA (before mutable borrow)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.deployer.to_account_info(),
                to: ctx.accounts.escrow_vault.to_account_info(),
            },
        ),
        collateral_amount,
    )?;

    let escrow = &mut ctx.accounts.escrow_vault;
    escrow.deployer = ctx.accounts.deployer.key();
    escrow.token_mint = ctx.accounts.token_mint.key();
    escrow.collateral_amount = collateral_amount;
    escrow.created_at = now;
    escrow.deadline_timestamp = now + duration_seconds;
    escrow.released = false;
    escrow.bump = ctx.bumps.escrow_vault;

    msg!(
        "Escrow created: deployer={}, mint={}, collateral={}, deadline={}",
        escrow.deployer,
        escrow.token_mint,
        collateral_amount,
        escrow.deadline_timestamp
    );

    Ok(())
}

/// Release escrow back to deployer (requires token graduation)
/// Anchor `close = deployer` closes the PDA, returning collateral + rent to deployer.
pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_vault;
    let curve = &ctx.accounts.bonding_curve;

    require!(!escrow.released, FyrstError::EscrowAlreadyReleased);
    require!(curve.graduated, FyrstError::NotGraduated);

    msg!(
        "Escrow released: deployer={}, amount={}",
        escrow.deployer,
        escrow.collateral_amount
    );

    // Anchor `close = deployer` handles all lamport transfer + account cleanup

    Ok(())
}

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub deployer: Signer<'info>,

    /// CHECK: Token mint account (validated by seed derivation)
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = deployer,
        space = EscrowVault::LEN,
        seeds = [ESCROW_SEED, deployer.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(mut)]
    pub deployer: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, deployer.key().as_ref(), escrow_vault.token_mint.as_ref()],
        bump = escrow_vault.bump,
        has_one = deployer,
        close = deployer,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(
        seeds = [CURVE_SEED, escrow_vault.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    pub system_program: Program<'info, System>,
}
