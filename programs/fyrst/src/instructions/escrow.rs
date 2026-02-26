use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::EscrowVault;
use crate::errors::FyrstError;
use crate::constants::*;

/// Create an escrow vault with deployer collateral
pub fn create_escrow(ctx: Context<CreateEscrow>, collateral_amount: u64) -> Result<()> {
    require!(
        collateral_amount >= MIN_COLLATERAL,
        FyrstError::InsufficientCollateral
    );

    let escrow = &mut ctx.accounts.escrow_vault;
    escrow.deployer = ctx.accounts.deployer.key();
    escrow.token_mint = ctx.accounts.token_mint.key();
    escrow.collateral_amount = collateral_amount;
    escrow.created_at = Clock::get()?.unix_timestamp;
    escrow.released = false;
    escrow.rugged = false;
    escrow.bump = ctx.bumps.escrow_vault;

    // Transfer SOL from deployer to escrow PDA
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

    msg!(
        "Escrow created: deployer={}, mint={}, collateral={}",
        escrow.deployer,
        escrow.token_mint,
        collateral_amount
    );

    Ok(())
}

/// Release escrow back to deployer after safe period
pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_vault;

    require!(!escrow.released, FyrstError::EscrowAlreadyReleased);
    require!(
        ctx.accounts.deployer.key() == escrow.deployer,
        FyrstError::Unauthorized
    );

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= escrow.created_at + SAFE_PERIOD,
        FyrstError::SafePeriodActive
    );

    escrow.released = true;

    // Transfer SOL back to deployer from escrow PDA
    let amount = escrow.collateral_amount;
    **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.deployer.to_account_info().try_borrow_mut_lamports()? += amount;

    msg!(
        "Escrow released: deployer={}, amount={}",
        escrow.deployer,
        amount
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
    )]
    pub escrow_vault: Account<'info, EscrowVault>,

    pub system_program: Program<'info, System>,
}
