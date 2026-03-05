use anchor_lang::prelude::*;
use crate::state::{ProtocolConfig, BondingCurve};
use crate::errors::FyrstError;
use crate::constants::*;

/// Initialize protocol configuration (one-time setup)
pub fn init_protocol(
    ctx: Context<InitProtocol>,
    treasury: Pubkey,
    ops_wallet: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = treasury;
    config.ops_wallet = ops_wallet;
    config.graduation_threshold = GRADUATION_THRESHOLD;
    config.bump = ctx.bumps.protocol_config;

    msg!(
        "Protocol initialized: authority={}, treasury={}, ops_wallet={}, threshold={}",
        config.authority,
        config.treasury,
        config.ops_wallet,
        config.graduation_threshold
    );

    Ok(())
}

/// Update protocol treasury (authority only)
pub fn update_treasury(ctx: Context<UpdateTreasury>, new_treasury: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.treasury = new_treasury;

    msg!("Treasury updated to: {}", new_treasury);
    Ok(())
}

/// Update operations wallet (authority only)
pub fn update_ops_wallet(ctx: Context<UpdateTreasury>, new_ops_wallet: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.ops_wallet = new_ops_wallet;

    msg!("Ops wallet updated to: {}", new_ops_wallet);
    Ok(())
}

/// Claim accumulated trade fees with progressive unlock (deployer only)
/// unlocked = (total_deployer_fees * max_reserve_reached) / GRADUATION_THRESHOLD
/// claimable = unlocked - claimed_deployer_fees
pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
    let curve = &ctx.accounts.bonding_curve;
    let threshold = GRADUATION_THRESHOLD as u128;

    let unlocked = (curve.total_deployer_fees as u128)
        .checked_mul(curve.max_reserve_reached as u128)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(threshold)
        .ok_or(FyrstError::MathOverflow)? as u64;

    let claimable = unlocked
        .checked_sub(curve.claimed_deployer_fees)
        .ok_or(FyrstError::MathOverflow)?;

    require!(claimable > 0, FyrstError::NoFeesToClaim);

    // Transfer claimable fees from curve PDA to deployer
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= claimable;
    **ctx.accounts.deployer.to_account_info().try_borrow_mut_lamports()? += claimable;

    let curve_mut = &mut ctx.accounts.bonding_curve;
    curve_mut.claimed_deployer_fees = curve_mut
        .claimed_deployer_fees
        .checked_add(claimable)
        .ok_or(FyrstError::MathOverflow)?;

    msg!("Fees claimed: deployer={}, amount={}", ctx.accounts.deployer.key(), claimable);

    Ok(())
}

/// Update graduation threshold (authority only)
pub fn update_graduation_threshold(
    ctx: Context<UpdateTreasury>,
    new_threshold: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.graduation_threshold = new_threshold;
    msg!("Graduation threshold updated to: {}", new_threshold);
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

/// Close protocol config for migration (authority only)
pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
    let config_info = ctx.accounts.protocol_config.to_account_info();
    let authority_info = ctx.accounts.authority.to_account_info();

    **authority_info.try_borrow_mut_lamports()? += config_info.lamports();
    **config_info.try_borrow_mut_lamports()? = 0;

    config_info.assign(&anchor_lang::solana_program::system_program::ID);
    config_info.realloc(0, false)?;

    msg!("Protocol config closed for migration");
    Ok(())
}

#[derive(Accounts)]
pub struct CloseConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Manual handling due to potential size mismatch during migration
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump,
    )]
    pub protocol_config: UncheckedAccount<'info>,
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
pub struct UpdateTreasury<'info> {
    #[account(
        constraint = authority.key() == protocol_config.authority @ FyrstError::Unauthorized
    )]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

#[derive(Accounts)]
pub struct ClaimFees<'info> {
    #[account(
        mut,
        constraint = deployer.key() == bonding_curve.deployer @ FyrstError::Unauthorized
    )]
    pub deployer: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
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
