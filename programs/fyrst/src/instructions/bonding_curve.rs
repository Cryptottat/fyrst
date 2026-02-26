use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::BondingCurve;
use crate::errors::FyrstError;
use crate::constants::*;

/// Initialize bonding curve for a token
pub fn init_bonding_curve(
    ctx: Context<InitBondingCurve>,
    base_price: u64,
    slope: u64,
) -> Result<()> {
    let curve = &mut ctx.accounts.bonding_curve;
    curve.token_mint = ctx.accounts.token_mint.key();
    curve.current_supply = 0;
    curve.base_price = base_price;
    curve.slope = slope;
    curve.reserve_balance = 0;
    curve.graduated = false;
    curve.deployer = ctx.accounts.deployer.key();
    curve.bump = ctx.bumps.bonding_curve;

    msg!(
        "Bonding curve initialized: mint={}, base_price={}, slope={}",
        curve.token_mint,
        base_price,
        slope
    );

    Ok(())
}

/// Buy tokens on the bonding curve
pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
    let curve = &mut ctx.accounts.bonding_curve;

    require!(!curve.graduated, FyrstError::AlreadyGraduated);
    require!(sol_amount > 0, FyrstError::InsufficientFunds);

    // Calculate tokens to receive: price = base_price + slope * current_supply
    // For a linear curve: tokens = sol_amount / current_price (simplified)
    let current_price = curve
        .base_price
        .checked_add(
            curve.slope.checked_mul(curve.current_supply).ok_or(FyrstError::MathOverflow)?,
        )
        .ok_or(FyrstError::MathOverflow)?;

    require!(current_price > 0, FyrstError::InvalidPrice);

    // Apply trade fee
    let fee = sol_amount
        .checked_mul(TRADE_FEE_BPS)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(FyrstError::MathOverflow)?;

    let net_sol = sol_amount.checked_sub(fee).ok_or(FyrstError::MathOverflow)?;

    // tokens = net_sol * 1e9 / current_price (to maintain precision)
    let tokens = net_sol
        .checked_mul(1_000_000_000)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(current_price)
        .ok_or(FyrstError::MathOverflow)?;

    // Transfer SOL from buyer to curve PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        ),
        sol_amount,
    )?;

    // Update curve state
    curve.current_supply = curve
        .current_supply
        .checked_add(tokens)
        .ok_or(FyrstError::MathOverflow)?;
    curve.reserve_balance = curve
        .reserve_balance
        .checked_add(net_sol)
        .ok_or(FyrstError::MathOverflow)?;

    msg!(
        "Buy: buyer={}, sol={}, tokens={}, new_supply={}",
        ctx.accounts.buyer.key(),
        sol_amount,
        tokens,
        curve.current_supply
    );

    Ok(())
}

/// Sell tokens on the bonding curve
pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
    let curve = &mut ctx.accounts.bonding_curve;

    require!(!curve.graduated, FyrstError::AlreadyGraduated);
    require!(token_amount > 0, FyrstError::InsufficientTokens);
    require!(
        curve.current_supply >= token_amount,
        FyrstError::InsufficientTokens
    );

    // Calculate SOL to return
    let current_price = curve
        .base_price
        .checked_add(
            curve.slope.checked_mul(curve.current_supply).ok_or(FyrstError::MathOverflow)?,
        )
        .ok_or(FyrstError::MathOverflow)?;

    let gross_sol = token_amount
        .checked_mul(current_price)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(1_000_000_000)
        .ok_or(FyrstError::MathOverflow)?;

    // Apply trade fee
    let fee = gross_sol
        .checked_mul(TRADE_FEE_BPS)
        .ok_or(FyrstError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(FyrstError::MathOverflow)?;

    let net_sol = gross_sol.checked_sub(fee).ok_or(FyrstError::MathOverflow)?;

    require!(
        curve.reserve_balance >= net_sol,
        FyrstError::InsufficientFunds
    );

    // Transfer SOL from curve PDA to seller
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= net_sol;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;

    // Update curve state
    curve.current_supply = curve
        .current_supply
        .checked_sub(token_amount)
        .ok_or(FyrstError::MathOverflow)?;
    curve.reserve_balance = curve
        .reserve_balance
        .checked_sub(net_sol)
        .ok_or(FyrstError::MathOverflow)?;

    msg!(
        "Sell: seller={}, tokens={}, sol={}, new_supply={}",
        ctx.accounts.seller.key(),
        token_amount,
        net_sol,
        curve.current_supply
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitBondingCurve<'info> {
    #[account(mut)]
    pub deployer: Signer<'info>,

    /// CHECK: Token mint account
    pub token_mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = deployer,
        space = BondingCurve::LEN,
        seeds = [CURVE_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.token_mint.as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    pub system_program: Program<'info, System>,
}
