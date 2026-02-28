use anchor_lang::prelude::*;
use crate::state::{ProtocolConfig, EscrowVault, BondingCurve};
use crate::errors::FyrstError;
use crate::constants::*;

/// Initialize protocol configuration (one-time setup)
pub fn init_protocol(
    ctx: Context<InitProtocol>,
    treasury: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = treasury;
    config.graduation_threshold = GRADUATION_THRESHOLD;
    config.bump = ctx.bumps.protocol_config;

    msg!(
        "Protocol initialized: authority={}, treasury={}, threshold={}",
        config.authority,
        config.treasury,
        config.graduation_threshold
    );

    Ok(())
}

/// Mark a token as rugged (authority only)
pub fn mark_rugged(ctx: Context<MarkRugged>) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow_vault;

    require!(!escrow.rugged, FyrstError::EscrowIsRugged);

    escrow.rugged = true;

    msg!(
        "Token marked as rugged: mint={}, deployer={}",
        escrow.token_mint,
        escrow.deployer
    );

    Ok(())
}

/// Graduate a bonding curve when reserve meets threshold
pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
    let curve = &mut ctx.accounts.bonding_curve;
    let config = &ctx.accounts.protocol_config;

    require!(!curve.graduated, FyrstError::AlreadyGraduated);
    require!(
        curve.reserve_balance >= config.graduation_threshold,
        FyrstError::InsufficientFunds
    );

    curve.graduated = true;

    msg!(
        "Token graduated: mint={}, reserve={}",
        curve.token_mint,
        curve.reserve_balance
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::LEN,
        seeds = [PROTOCOL_SEED],
        bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MarkRugged<'info> {
    #[account(
        constraint = authority.key() == protocol_config.authority @ FyrstError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, escrow_vault.deployer.as_ref(), escrow_vault.token_mint.as_ref()],
        bump = escrow_vault.bump,
    )]
    pub escrow_vault: Account<'info, EscrowVault>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    pub caller: Signer<'info>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
}
