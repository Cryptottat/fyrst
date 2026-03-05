use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{EscrowVault, BondingCurve, ProtocolConfig};
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

/// Expire escrow after deadline when no holders exist (permissionless).
/// 50% collateral → deployer refund, 50% → treasury (for $FYRST buyback+burn).
pub fn expire_escrow(ctx: Context<ExpireEscrow>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_vault;
    let curve = &ctx.accounts.bonding_curve;
    let now = Clock::get()?.unix_timestamp;

    require!(!escrow.released, FyrstError::EscrowAlreadyReleased);
    require!(now >= escrow.deadline_timestamp, FyrstError::DeadlineNotReached);
    require!(!curve.graduated, FyrstError::AlreadyGraduated);
    require!(curve.current_supply == 0, FyrstError::TokensStillCirculating);

    let collateral = escrow.collateral_amount;
    let treasury_share = collateral / 2;

    // Transfer treasury share from escrow PDA to treasury
    let escrow_info = ctx.accounts.escrow_vault.to_account_info();
    **escrow_info.try_borrow_mut_lamports()? -= treasury_share;
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += treasury_share;

    // Close escrow PDA — remaining lamports (deployer_share + rent) go to deployer
    let remaining = escrow_info.lamports();
    **escrow_info.try_borrow_mut_lamports()? = 0;
    **ctx.accounts.deployer.to_account_info().try_borrow_mut_lamports()? += remaining;

    // Zero out account data and assign to system program
    escrow_info.assign(&anchor_lang::solana_program::system_program::ID);
    escrow_info.realloc(0, false)?;

    msg!(
        "Escrow expired: deployer={}, treasury_share={}, deployer_refund={}",
        escrow.deployer,
        treasury_share,
        remaining
    );

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

#[derive(Accounts)]
pub struct ExpireEscrow<'info> {
    /// CHECK: Deployer wallet (receives 50% refund + rent). Not required to sign.
    #[account(mut)]
    pub deployer: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, deployer.key().as_ref(), escrow_vault.token_mint.as_ref()],
        bump = escrow_vault.bump,
        has_one = deployer,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    #[account(
        seeds = [CURVE_SEED, escrow_vault.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// CHECK: Treasury wallet (receives 50% for buyback+burn)
    #[account(
        mut,
        constraint = treasury.key() == protocol_config.treasury
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
