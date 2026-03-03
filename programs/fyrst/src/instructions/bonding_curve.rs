use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::{self, program::invoke_signed};
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{BondingCurve, ProtocolConfig};
use crate::errors::FyrstError;
use crate::constants::*;

/// Metaplex Token Metadata program ID
pub const TOKEN_METADATA_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/// Build a CreateMetadataAccountV3 instruction manually (no external crate needed).
/// Instruction discriminator = 33.
fn build_create_metadata_v3_ix(
    metadata: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    payer: Pubkey,
    update_authority: Pubkey,
    name: String,
    symbol: String,
    uri: String,
) -> solana_program::instruction::Instruction {
    // Borsh-serialize CreateMetadataAccountV3 instruction data:
    // discriminator (u8) = 33
    // DataV2 { name, symbol, uri, seller_fee_basis_points, creators, collection, uses }
    // is_mutable (bool)
    // update_authority_is_signer (Option<bool>) = Some(true)
    // collection_details (Option<CollectionDetails>) = None
    let mut data = vec![33u8]; // CreateMetadataAccountV3

    // name (Borsh string = u32 len + bytes)
    data.extend_from_slice(&(name.len() as u32).to_le_bytes());
    data.extend_from_slice(name.as_bytes());

    // symbol
    data.extend_from_slice(&(symbol.len() as u32).to_le_bytes());
    data.extend_from_slice(symbol.as_bytes());

    // uri
    data.extend_from_slice(&(uri.len() as u32).to_le_bytes());
    data.extend_from_slice(uri.as_bytes());

    // seller_fee_basis_points (u16)
    data.extend_from_slice(&0u16.to_le_bytes());

    // creators (Option<Vec<Creator>>) = None
    data.push(0);

    // collection (Option<Collection>) = None
    data.push(0);

    // uses (Option<Uses>) = None
    data.push(0);

    // is_mutable (bool)
    data.push(1);

    // collection_details (Option<CollectionDetails>) = None
    data.push(0);

    solana_program::instruction::Instruction {
        program_id: TOKEN_METADATA_PROGRAM_ID,
        accounts: vec![
            solana_program::instruction::AccountMeta::new(metadata, false),
            solana_program::instruction::AccountMeta::new_readonly(mint, false),
            solana_program::instruction::AccountMeta::new_readonly(mint_authority, true),
            solana_program::instruction::AccountMeta::new(payer, true),
            solana_program::instruction::AccountMeta::new_readonly(update_authority, true),
            solana_program::instruction::AccountMeta::new_readonly(solana_program::system_program::ID, false),
            solana_program::instruction::AccountMeta::new_readonly(solana_program::sysvar::rent::ID, false),
        ],
        data,
    }
}

/// Integer square root via Babylonian method (Newton's method)
fn isqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

/// Initialize bonding curve for a token with SPL mint + metadata
pub fn init_bonding_curve(
    ctx: Context<InitBondingCurve>,
    base_price: u64,
    slope: u64,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    // Validate metadata lengths (bytes, not chars — UTF-8 multibyte safe)
    require!(name.len() <= 64, FyrstError::InvalidMetadata);
    require!(symbol.len() <= 20, FyrstError::InvalidMetadata);
    require!(uri.len() <= 200, FyrstError::InvalidMetadata);

    // Create token metadata via Metaplex CPI
    let token_mint_key = ctx.accounts.token_mint.key();
    let seeds = &[
        CURVE_SEED,
        token_mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ];
    let signer_seeds = &[&seeds[..]];

    let ix = build_create_metadata_v3_ix(
        ctx.accounts.metadata_account.key(),
        ctx.accounts.token_mint.key(),
        ctx.accounts.bonding_curve.key(),
        ctx.accounts.deployer.key(),
        ctx.accounts.bonding_curve.key(),
        name,
        symbol,
        uri,
    );

    invoke_signed(
        &ix,
        &[
            ctx.accounts.metadata_account.to_account_info(),
            ctx.accounts.token_mint.to_account_info(),
            ctx.accounts.bonding_curve.to_account_info(),
            ctx.accounts.deployer.to_account_info(),
            ctx.accounts.bonding_curve.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Initialize bonding curve state
    let curve = &mut ctx.accounts.bonding_curve;
    curve.token_mint = ctx.accounts.token_mint.key();
    curve.current_supply = 0;
    curve.base_price = base_price;
    curve.slope = slope;
    curve.reserve_balance = 0;
    curve.graduated = false;
    curve.deployer = ctx.accounts.deployer.key();
    curve.total_sol_collected = 0;
    curve.max_reserve_reached = 0;
    curve.total_deployer_fees = 0;
    curve.claimed_deployer_fees = 0;
    curve.bump = ctx.bumps.bonding_curve;

    msg!(
        "Bonding curve initialized: mint={}, base_price={}, slope={}",
        curve.token_mint,
        base_price,
        slope
    );

    Ok(())
}

/// Buy tokens on the bonding curve — mints real SPL tokens
/// Uses integral (area-under-curve) pricing to ensure reserve solvency.
pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
    let tokens;
    let net_sol;
    let protocol_fee;
    let trade_fee;
    let token_mint_key;
    let curve_bump;
    {
        let curve = &ctx.accounts.bonding_curve;

        require!(!curve.graduated, FyrstError::AlreadyGraduated);
        require!(sol_amount > 0, FyrstError::InsufficientFunds);

        trade_fee = sol_amount
            .checked_mul(TRADE_FEE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;

        protocol_fee = sol_amount
            .checked_mul(PROTOCOL_FEE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;

        net_sol = sol_amount
            .checked_sub(trade_fee)
            .ok_or(FyrstError::MathOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(FyrstError::MathOverflow)?;

        // Integral pricing (area under the linear bonding curve):
        // Price curve: P(S) = base_price + slope * (S / D)
        // Cost to buy T atomic tokens from supply S:
        //   cost = base_price*T/D + slope*T*(2S+T) / (2*D^2)
        // Rearranged as quadratic in T:
        //   slope*T^2 + 2*(base_price*D + slope*S)*T - 2*net_sol*D^2 = 0
        let d = 10u64.pow(TOKEN_DECIMALS as u32);
        let s = curve.current_supply as u128;
        let d128 = d as u128;
        let bp = curve.base_price as u128;
        let sl = curve.slope as u128;
        let net128 = net_sol as u128;

        tokens = if curve.slope == 0 {
            // Flat pricing: tokens = net_sol * D / base_price
            require!(curve.base_price > 0, FyrstError::InvalidPrice);
            (net128 * d128 / bp) as u64
        } else {
            let b = 2 * (bp * d128 + sl * s);
            let c_val = 2 * net128 * d128 * d128;
            let disc = b * b + 4 * sl * c_val;
            let sqrt_disc = isqrt(disc);
            ((sqrt_disc - b) / (2 * sl)) as u64
        };

        require!(tokens > 0, FyrstError::InsufficientFunds);
        require!(tokens >= min_tokens_out, FyrstError::SlippageExceeded);

        token_mint_key = curve.token_mint;
        curve_bump = curve.bump;
    }

    // Transfer SOL to curve PDA (sol_amount minus protocol_fee)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        ),
        sol_amount.checked_sub(protocol_fee).ok_or(FyrstError::MathOverflow)?,
    )?;

    // Transfer protocol fee to treasury
    if protocol_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            protocol_fee,
        )?;
    }

    // Mint SPL tokens to buyer's ATA
    let seeds = &[
        CURVE_SEED,
        token_mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens,
    )?;

    // Transfer remaining trade fee share to treasury (from curve PDA) — before mutable borrow
    let deployer_share = trade_fee / 2;
    let treasury_trade_share = trade_fee.checked_sub(deployer_share).ok_or(FyrstError::MathOverflow)?;
    if treasury_trade_share > 0 {
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= treasury_trade_share;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += treasury_trade_share;
    }

    let graduation_threshold = ctx.accounts.protocol_config.graduation_threshold;

    // Update curve state
    let curve = &mut ctx.accounts.bonding_curve;
    curve.current_supply = curve
        .current_supply
        .checked_add(tokens)
        .ok_or(FyrstError::MathOverflow)?;
    curve.reserve_balance = curve
        .reserve_balance
        .checked_add(net_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.total_sol_collected = curve
        .total_sol_collected
        .checked_add(net_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.total_deployer_fees = curve
        .total_deployer_fees
        .checked_add(deployer_share)
        .ok_or(FyrstError::MathOverflow)?;

    // Update max_reserve_reached (capped at GRADUATION_THRESHOLD)
    let capped_reserve = curve.reserve_balance.min(graduation_threshold);
    if capped_reserve > curve.max_reserve_reached {
        curve.max_reserve_reached = capped_reserve;
    }

    // Auto-graduation check
    if curve.reserve_balance >= graduation_threshold {
        curve.graduated = true;
        msg!("Token auto-graduated: mint={}", curve.token_mint);
    }

    msg!(
        "Buy: buyer={}, sol={}, tokens={}, new_supply={}",
        ctx.accounts.buyer.key(),
        sol_amount,
        tokens,
        curve.current_supply
    );

    Ok(())
}

/// Sell tokens on the bonding curve — burns SPL tokens
/// Uses integral pricing to ensure reserve solvency.
pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    let mut net_sol;
    let trade_fee_sell;
    let protocol_fee_sell;
    {
        let curve = &ctx.accounts.bonding_curve;

        require!(!curve.graduated, FyrstError::AlreadyGraduated);
        require!(token_amount > 0, FyrstError::InsufficientTokens);
        require!(
            curve.current_supply >= token_amount,
            FyrstError::InsufficientTokens
        );

        // Integral pricing (area under the curve for sell):
        // Revenue = base_price*T/D + slope*T*(2S-T) / (2*D^2)
        // where T = token_amount (atomic), S = current_supply (atomic), D = 10^decimals
        let d = 10u64.pow(TOKEN_DECIMALS as u32);
        let t = token_amount as u128;
        let s = curve.current_supply as u128;
        let d128 = d as u128;
        let bp = curve.base_price as u128;
        let sl = curve.slope as u128;

        let gross_sol = (bp * t / d128
            + sl * t * (2 * s - t) / (2 * d128 * d128)) as u64;

        trade_fee_sell = gross_sol
            .checked_mul(TRADE_FEE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;

        protocol_fee_sell = gross_sol
            .checked_mul(PROTOCOL_FEE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;

        net_sol = gross_sol
            .checked_sub(trade_fee_sell)
            .ok_or(FyrstError::MathOverflow)?
            .checked_sub(protocol_fee_sell)
            .ok_or(FyrstError::MathOverflow)?;

        // Cap at reserve balance to handle integer rounding when selling 100%
        if net_sol > curve.reserve_balance {
            net_sol = curve.reserve_balance;
        }

        require!(net_sol >= min_sol_out, FyrstError::SlippageExceeded);
    }

    // Burn SPL tokens from seller's ATA
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Transfer SOL from curve PDA to seller
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= net_sol;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;

    // Transfer trade fee share + protocol fee to treasury (from curve PDA) — before mutable borrow
    let deployer_share = trade_fee_sell / 2;
    let treasury_trade_share = trade_fee_sell.checked_sub(deployer_share).ok_or(FyrstError::MathOverflow)?;
    let total_treasury_sell = treasury_trade_share
        .checked_add(protocol_fee_sell)
        .ok_or(FyrstError::MathOverflow)?;
    if total_treasury_sell > 0 {
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= total_treasury_sell;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += total_treasury_sell;
    }

    // Update curve state — total_sol_collected does NOT decrease
    let curve = &mut ctx.accounts.bonding_curve;
    curve.current_supply = curve
        .current_supply
        .checked_sub(token_amount)
        .ok_or(FyrstError::MathOverflow)?;
    curve.reserve_balance = curve
        .reserve_balance
        .checked_sub(net_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.total_deployer_fees = curve
        .total_deployer_fees
        .checked_add(deployer_share)
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

    #[account(
        init,
        payer = deployer,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = bonding_curve,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = deployer,
        space = BondingCurve::LEN,
        seeds = [CURVE_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: Created by Metaplex CPI — validated by the Metaplex program
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata program
    #[account(address = TOKEN_METADATA_PROGRAM_ID)]
    pub metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
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

    #[account(
        mut,
        address = bonding_curve.token_mint @ FyrstError::TokenMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// CHECK: Treasury wallet from protocol config
    #[account(
        mut,
        address = protocol_config.treasury @ FyrstError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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

    #[account(
        mut,
        address = bonding_curve.token_mint @ FyrstError::TokenMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// CHECK: Treasury wallet from protocol config
    #[account(
        mut,
        address = protocol_config.treasury @ FyrstError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
