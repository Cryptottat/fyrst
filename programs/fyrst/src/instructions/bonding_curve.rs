use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::{self, program::invoke_signed};
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
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

/// Initialize bonding curve for a token with SPL mint + metadata.
/// Mints entire token supply to curve ATA (constant product AMM model).
pub fn init_bonding_curve(
    ctx: Context<InitBondingCurve>,
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

    // Mint entire token supply to curve's ATA
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.curve_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        TOKEN_TOTAL_SUPPLY,
    )?;

    // Initialize bonding curve state (constant product AMM)
    let curve = &mut ctx.accounts.bonding_curve;
    curve.token_mint = ctx.accounts.token_mint.key();
    curve.current_supply = 0;
    curve.virtual_token_reserves = INITIAL_VIRTUAL_TOKEN_RESERVES;
    curve.virtual_sol_reserves = INITIAL_VIRTUAL_SOL_RESERVES;
    curve.real_token_reserves = INITIAL_REAL_TOKEN_RESERVES;
    curve.real_sol_reserves = 0;
    curve.token_total_supply = TOKEN_TOTAL_SUPPLY;
    curve.reserve_balance = 0;
    curve.graduated = false;
    curve.deployer = ctx.accounts.deployer.key();
    curve.total_sol_collected = 0;
    curve.max_reserve_reached = 0;
    curve.total_deployer_fees = 0;
    curve.claimed_deployer_fees = 0;
    curve.bump = ctx.bumps.bonding_curve;

    msg!(
        "Bonding curve initialized (CPMM): mint={}, virtual_token={}, virtual_sol={}, real_token={}",
        curve.token_mint,
        INITIAL_VIRTUAL_TOKEN_RESERVES,
        INITIAL_VIRTUAL_SOL_RESERVES,
        INITIAL_REAL_TOKEN_RESERVES
    );

    Ok(())
}

/// Buy tokens on the bonding curve — constant product AMM (x*y=k).
/// Transfers pre-minted tokens from curve ATA to buyer ATA.
pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
    let tokens: u64;
    let net_sol: u64;
    let protocol_fee: u64;
    let trade_fee: u64;
    let token_mint_key: Pubkey;
    let curve_bump: u8;
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

        // Constant product AMM: tokens_out = virtual_token - k / (virtual_sol + net_sol)
        let vt = curve.virtual_token_reserves as u128;
        let vs = curve.virtual_sol_reserves as u128;
        let k = vt.checked_mul(vs).ok_or(FyrstError::MathOverflow)?;
        let new_vs = vs.checked_add(net_sol as u128).ok_or(FyrstError::MathOverflow)?;
        let new_vt = k.checked_div(new_vs).ok_or(FyrstError::MathOverflow)?;
        tokens = vt.checked_sub(new_vt).ok_or(FyrstError::MathOverflow)? as u64;

        require!(tokens > 0, FyrstError::InsufficientFunds);
        require!(tokens <= curve.real_token_reserves, FyrstError::InsufficientTokens);
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

    // Transfer tokens from curve ATA to buyer ATA
    let seeds = &[
        CURVE_SEED,
        token_mint_key.as_ref(),
        &[curve_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.curve_token_account.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens,
    )?;

    // Split trade fee: 50% deployer, 50% protocol (of which OPS_SHARE_BPS% → ops, rest → treasury)
    let deployer_share = trade_fee / 2;
    let treasury_trade_share = trade_fee.checked_sub(deployer_share).ok_or(FyrstError::MathOverflow)?;
    if treasury_trade_share > 0 {
        let ops_share = treasury_trade_share
            .checked_mul(OPS_SHARE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;
        let buyback_share = treasury_trade_share.checked_sub(ops_share).ok_or(FyrstError::MathOverflow)?;
        if ops_share > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= ops_share;
            **ctx.accounts.ops_wallet.to_account_info().try_borrow_mut_lamports()? += ops_share;
        }
        if buyback_share > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= buyback_share;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += buyback_share;
        }
    }

    let graduation_threshold = ctx.accounts.protocol_config.graduation_threshold;

    // Update curve state
    let curve = &mut ctx.accounts.bonding_curve;
    curve.virtual_token_reserves = curve
        .virtual_token_reserves
        .checked_sub(tokens)
        .ok_or(FyrstError::MathOverflow)?;
    curve.virtual_sol_reserves = curve
        .virtual_sol_reserves
        .checked_add(net_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.real_token_reserves = curve
        .real_token_reserves
        .checked_sub(tokens)
        .ok_or(FyrstError::MathOverflow)?;
    curve.real_sol_reserves = curve
        .real_sol_reserves
        .checked_add(net_sol)
        .ok_or(FyrstError::MathOverflow)?;
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

    // Auto-graduation check: SOL threshold OR all real tokens sold
    if curve.reserve_balance >= graduation_threshold || curve.real_token_reserves == 0 {
        curve.graduated = true;
        msg!("Token auto-graduated: mint={}", curve.token_mint);
    }

    msg!(
        "Buy: buyer={}, sol={}, tokens={}, new_supply={}, vt={}, vs={}",
        ctx.accounts.buyer.key(),
        sol_amount,
        tokens,
        curve.current_supply,
        curve.virtual_token_reserves,
        curve.virtual_sol_reserves
    );

    Ok(())
}

/// Sell tokens on the bonding curve — constant product AMM (x*y=k).
/// Transfers tokens from seller ATA back to curve ATA.
pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    let net_sol: u64;
    let trade_fee_sell: u64;
    let protocol_fee_sell: u64;
    let gross_sol: u64;
    {
        let curve = &ctx.accounts.bonding_curve;

        require!(!curve.graduated, FyrstError::AlreadyGraduated);
        require!(token_amount > 0, FyrstError::InsufficientTokens);

        // Constant product AMM: sol_out = virtual_sol - k / (virtual_token + token_amount)
        let vt = curve.virtual_token_reserves as u128;
        let vs = curve.virtual_sol_reserves as u128;
        let k = vt.checked_mul(vs).ok_or(FyrstError::MathOverflow)?;
        let new_vt = vt.checked_add(token_amount as u128).ok_or(FyrstError::MathOverflow)?;
        let new_vs = k.checked_div(new_vt).ok_or(FyrstError::MathOverflow)?;
        let amm_sol_out = vs.checked_sub(new_vs).ok_or(FyrstError::MathOverflow)? as u64;

        // Cap at real SOL reserves (safety)
        gross_sol = amm_sol_out.min(curve.real_sol_reserves).min(curve.reserve_balance);

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

        require!(net_sol >= min_sol_out, FyrstError::SlippageExceeded);
    }

    // Transfer tokens from seller ATA to curve ATA
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.curve_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Transfer SOL from curve PDA to seller
    **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= net_sol;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += net_sol;

    // Split trade fee: 50% deployer, 50% protocol (of which OPS_SHARE_BPS% → ops, rest → treasury)
    let deployer_share = trade_fee_sell / 2;
    let treasury_trade_share = trade_fee_sell.checked_sub(deployer_share).ok_or(FyrstError::MathOverflow)?;
    let total_protocol_sell = treasury_trade_share
        .checked_add(protocol_fee_sell)
        .ok_or(FyrstError::MathOverflow)?;
    if total_protocol_sell > 0 {
        let ops_share = total_protocol_sell
            .checked_mul(OPS_SHARE_BPS)
            .ok_or(FyrstError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(FyrstError::MathOverflow)?;
        let buyback_share = total_protocol_sell.checked_sub(ops_share).ok_or(FyrstError::MathOverflow)?;
        if ops_share > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= ops_share;
            **ctx.accounts.ops_wallet.to_account_info().try_borrow_mut_lamports()? += ops_share;
        }
        if buyback_share > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= buyback_share;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += buyback_share;
        }
    }

    // Update curve state — total_sol_collected does NOT decrease
    let curve = &mut ctx.accounts.bonding_curve;
    curve.virtual_token_reserves = curve
        .virtual_token_reserves
        .checked_add(token_amount)
        .ok_or(FyrstError::MathOverflow)?;
    curve.virtual_sol_reserves = curve
        .virtual_sol_reserves
        .checked_sub(gross_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.real_token_reserves = curve
        .real_token_reserves
        .checked_add(token_amount)
        .ok_or(FyrstError::MathOverflow)?;
    curve.real_sol_reserves = curve
        .real_sol_reserves
        .checked_sub(gross_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.current_supply = curve
        .current_supply
        .checked_sub(token_amount)
        .ok_or(FyrstError::MathOverflow)?;
    curve.reserve_balance = curve
        .reserve_balance
        .checked_sub(gross_sol)
        .ok_or(FyrstError::MathOverflow)?;
    curve.total_deployer_fees = curve
        .total_deployer_fees
        .checked_add(deployer_share)
        .ok_or(FyrstError::MathOverflow)?;

    msg!(
        "Sell: seller={}, tokens={}, sol={}, new_supply={}, vt={}, vs={}",
        ctx.accounts.seller.key(),
        token_amount,
        net_sol,
        curve.current_supply,
        curve.virtual_token_reserves,
        curve.virtual_sol_reserves
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

    /// Curve's token ATA — holds entire token supply for AMM transfers
    #[account(
        init,
        payer = deployer,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

    /// CHECK: Created by Metaplex CPI — validated by the Metaplex program
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata program
    #[account(address = TOKEN_METADATA_PROGRAM_ID)]
    pub metadata_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
        address = bonding_curve.token_mint @ FyrstError::TokenMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    /// Curve's token ATA — source of tokens for transfer
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

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

    /// CHECK: Treasury wallet from protocol config (buyback+burn)
    #[account(
        mut,
        address = protocol_config.treasury @ FyrstError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: Operations wallet from protocol config (service revenue)
    #[account(
        mut,
        address = protocol_config.ops_wallet @ FyrstError::Unauthorized,
    )]
    pub ops_wallet: UncheckedAccount<'info>,

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
        address = bonding_curve.token_mint @ FyrstError::TokenMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    /// Curve's token ATA — destination for returned tokens
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve,
    )]
    pub curve_token_account: Account<'info, TokenAccount>,

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

    /// CHECK: Treasury wallet from protocol config (buyback+burn)
    #[account(
        mut,
        address = protocol_config.treasury @ FyrstError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: Operations wallet from protocol config (service revenue)
    #[account(
        mut,
        address = protocol_config.ops_wallet @ FyrstError::Unauthorized,
    )]
    pub ops_wallet: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
