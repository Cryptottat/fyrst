use anchor_lang::prelude::*;
use crate::state::{BuyerRecord, EscrowVault, BondingCurve, ProtocolConfig};
use crate::errors::FyrstError;
use crate::constants::*;

/// Record a buyer's purchase for refund eligibility
pub fn record_buyer(ctx: Context<RecordBuyer>, amount: u64, price: u64) -> Result<()> {
    let record = &mut ctx.accounts.buyer_record;

    if record.total_bought == 0 {
        // First purchase
        record.buyer = ctx.accounts.buyer.key();
        record.token_mint = ctx.accounts.token_mint.key();
        record.first_buy_at = Clock::get()?.unix_timestamp;
        record.refund_claimed = false;
        record.bump = ctx.bumps.buyer_record;
    }

    // Update totals
    let sol_spent = (amount as u128)
        .checked_mul(price as u128)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(10u128.pow(TOKEN_DECIMALS as u32))
        .ok_or(FyrstError::MathOverflow)? as u64;

    record.total_bought = record
        .total_bought
        .checked_add(amount)
        .ok_or(FyrstError::MathOverflow)?;

    record.total_sol_spent = record
        .total_sol_spent
        .checked_add(sol_spent)
        .ok_or(FyrstError::MathOverflow)?;

    // Recalculate average price
    if record.total_bought > 0 {
        record.avg_price = (record.total_sol_spent as u128)
            .checked_mul(10u128.pow(TOKEN_DECIMALS as u32))
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(record.total_bought as u128)
            .ok_or(FyrstError::MathOverflow)? as u64;
    }

    msg!(
        "Buyer recorded: buyer={}, mint={}, amount={}, total={}",
        record.buyer,
        record.token_mint,
        amount,
        record.total_bought
    );

    Ok(())
}

/// Process pro-rata refund for a buyer from escrow (called by protocol authority)
pub fn process_refund(ctx: Context<ProcessRefund>) -> Result<()> {
    let escrow = &ctx.accounts.escrow_vault;
    let record = &mut ctx.accounts.buyer_record;
    let curve = &ctx.accounts.bonding_curve;

    require!(!record.refund_claimed, FyrstError::RefundAlreadyProcessed);
    require!(escrow.rugged, FyrstError::SafePeriodExpired);

    // Pro-rata refund: refund = (buyer_sol_spent * escrow_collateral) / total_sol_collected
    // Use u128 intermediate to avoid overflow
    let refund_amount = if curve.total_sol_collected > 0 {
        (record.total_sol_spent as u128)
            .checked_mul(escrow.collateral_amount as u128)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(curve.total_sol_collected as u128)
            .ok_or(FyrstError::MathOverflow)? as u64
    } else {
        // No SOL ever collected — refund full amount up to collateral
        record.total_sol_spent.min(escrow.collateral_amount)
    };

    require!(refund_amount > 0, FyrstError::NoBuyerRecord);

    // Transfer SOL from escrow to buyer
    **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? += refund_amount;

    record.refund_claimed = true;

    msg!(
        "Refund processed: buyer={}, amount={}, mint={}",
        record.buyer,
        refund_amount,
        record.token_mint
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RecordBuyer<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Token mint account
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = BuyerRecord::LEN,
        seeds = [BUYER_SEED, buyer.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessRefund<'info> {
    /// Protocol authority that triggers refunds
    #[account(
        constraint = authority.key() == protocol_config.authority @ FyrstError::Unauthorized
    )]
    pub authority: Signer<'info>,

    /// CHECK: Buyer receiving the refund
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,

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

    #[account(
        seeds = [CURVE_SEED, escrow_vault.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        seeds = [BUYER_SEED, buyer.key().as_ref(), escrow_vault.token_mint.as_ref()],
        bump = buyer_record.bump,
        has_one = buyer,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    pub system_program: Program<'info, System>,
}
