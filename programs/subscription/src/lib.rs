use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, transfer};

declare_id!("H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ");

/// Agent News Wire - Subscription Registry Program
/// 
/// Manages subscriber accounts, USDC deposits, channel subscriptions,
/// and payment processing for alert deliveries.

#[program]
pub mod subscription_registry {
    use super::*;

    /// Initialize the protocol configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        price_per_alert: u64,
        treasury_fee_bps: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.treasury = ctx.accounts.treasury.key();
        config.price_per_alert = price_per_alert;
        config.treasury_fee_bps = treasury_fee_bps;
        config.total_subscribers = 0;
        config.total_alerts_delivered = 0;
        config.total_revenue = 0;
        config.bump = ctx.bumps.config;
        
        msg!("Protocol initialized: price={} lamports/alert, treasury_fee={}bps", 
            price_per_alert, treasury_fee_bps);
        Ok(())
    }

    /// Create a new subscriber account and USDC vault
    pub fn create_subscriber(
        ctx: Context<CreateSubscriber>,
        channels: Vec<u8>, // Bitmap of subscribed channels
    ) -> Result<()> {
        require!(channels.len() <= 4, ErrorCode::TooManyChannels);
        
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.owner = ctx.accounts.owner.key();
        subscriber.channels = channels_to_u32(&channels);
        subscriber.balance = 0;
        subscriber.alerts_received = 0;
        subscriber.created_at = Clock::get()?.unix_timestamp;
        subscriber.active = true;
        subscriber.bump = ctx.bumps.subscriber;
        subscriber.vault_bump = ctx.bumps.subscriber_vault;
        
        let config = &mut ctx.accounts.config;
        config.total_subscribers += 1;
        
        msg!("Subscriber created with vault: {}", subscriber.owner);
        Ok(())
    }

    /// Deposit USDC into subscriber vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        // Transfer USDC from user to subscriber vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.subscriber_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, amount)?;
        
        // Update subscriber balance
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.balance = subscriber.balance.checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        
        msg!("Deposited {} to subscriber {}", amount, subscriber.owner);
        Ok(())
    }

    /// Withdraw USDC from subscriber vault
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let subscriber = &mut ctx.accounts.subscriber;
        require!(subscriber.balance >= amount, ErrorCode::InsufficientBalance);
        
        // Transfer USDC from vault to user
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[
            b"subscriber_vault",
            owner_key.as_ref(),
            &[ctx.bumps.subscriber_vault],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.subscriber_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.subscriber_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, amount)?;
        
        subscriber.balance = subscriber.balance.checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;
        
        msg!("Withdrew {} from subscriber {}", amount, subscriber.owner);
        Ok(())
    }

    /// Update channel subscriptions
    pub fn update_channels(
        ctx: Context<UpdateChannels>,
        channels: Vec<u8>,
    ) -> Result<()> {
        require!(channels.len() <= 4, ErrorCode::TooManyChannels);
        
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.channels = channels_to_u32(&channels);
        
        msg!("Updated channels for subscriber {}", subscriber.owner);
        Ok(())
    }

    /// Charge subscriber for alert delivery (called by authorized distributor)
    pub fn charge_for_alert(
        ctx: Context<ChargeForAlert>,
        alert_hash: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let subscriber = &mut ctx.accounts.subscriber;
        
        require!(subscriber.active, ErrorCode::SubscriberInactive);
        require!(subscriber.balance >= config.price_per_alert, ErrorCode::InsufficientBalance);
        
        // Calculate fees
        let total_amount = config.price_per_alert;
        let treasury_fee = (total_amount as u128)
            .checked_mul(config.treasury_fee_bps as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::Overflow)? as u64;
        let publisher_amount = total_amount.checked_sub(treasury_fee)
            .ok_or(ErrorCode::Overflow)?;
        
        // Deduct from subscriber
        subscriber.balance = subscriber.balance.checked_sub(total_amount)
            .ok_or(ErrorCode::Overflow)?;
        subscriber.alerts_received += 1;
        
        // Record delivery
        let delivery = &mut ctx.accounts.delivery_receipt;
        delivery.subscriber = subscriber.key();
        delivery.alert_hash = alert_hash;
        delivery.amount_charged = total_amount;
        delivery.timestamp = Clock::get()?.unix_timestamp;
        delivery.bump = ctx.bumps.delivery_receipt;
        
        // Update global stats
        let config = &mut ctx.accounts.config;
        config.total_alerts_delivered += 1;
        config.total_revenue = config.total_revenue.checked_add(total_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        msg!("Charged {} for alert {:?}", subscriber.owner, &alert_hash[..8]);
        Ok(())
    }

    /// Deactivate subscription
    pub fn deactivate(ctx: Context<Deactivate>) -> Result<()> {
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.active = false;
        
        msg!("Deactivated subscriber {}", subscriber.owner);
        Ok(())
    }

    /// Reactivate subscription
    pub fn reactivate(ctx: Context<Reactivate>) -> Result<()> {
        let subscriber = &mut ctx.accounts.subscriber;
        subscriber.active = true;
        
        msg!("Reactivated subscriber {}", subscriber.owner);
        Ok(())
    }
}

// === Account Structures ===

#[account]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
    pub price_per_alert: u64,       // In USDC lamports (6 decimals)
    pub treasury_fee_bps: u16,      // Basis points (30% = 3000)
    pub total_subscribers: u64,
    pub total_alerts_delivered: u64,
    pub total_revenue: u64,
    pub bump: u8,
}

#[account]
pub struct Subscriber {
    pub owner: Pubkey,
    pub channels: u32,              // Bitmap: bit 0 = channel 0, etc.
    pub balance: u64,               // USDC balance in lamports
    pub alerts_received: u64,
    pub created_at: i64,
    pub active: bool,
    pub bump: u8,
    pub vault_bump: u8,             // Bump for subscriber_vault PDA
}

#[account]
pub struct DeliveryReceipt {
    pub subscriber: Pubkey,
    pub alert_hash: [u8; 32],
    pub amount_charged: u64,
    pub timestamp: i64,
    pub bump: u8,
}

// === Contexts ===

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 2 + 8 + 8 + 8 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    /// CHECK: USDC mint address
    pub usdc_mint: AccountInfo<'info>,
    
    /// CHECK: Treasury token account
    pub treasury: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSubscriber<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 4 + 8 + 8 + 8 + 1 + 1 + 1, // Added 1 byte for vault_bump
        seeds = [b"subscriber", owner.key().as_ref()],
        bump
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    /// Subscriber's USDC vault - initialized alongside subscriber account
    #[account(
        init,
        payer = owner,
        seeds = [b"subscriber_vault", owner.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = subscriber_vault,
    )]
    pub subscriber_vault: Account<'info, TokenAccount>,
    
    /// USDC mint (must match config.usdc_mint)
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ ErrorCode::InvalidMint
    )]
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"subscriber", owner.key().as_ref()],
        bump = subscriber.bump,
        has_one = owner
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    #[account(
        mut,
        seeds = [b"subscriber_vault", owner.key().as_ref()],
        bump
    )]
    pub subscriber_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"subscriber", owner.key().as_ref()],
        bump = subscriber.bump,
        has_one = owner
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    #[account(
        mut,
        seeds = [b"subscriber_vault", owner.key().as_ref()],
        bump
    )]
    pub subscriber_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateChannels<'info> {
    #[account(
        mut,
        seeds = [b"subscriber", owner.key().as_ref()],
        bump = subscriber.bump,
        has_one = owner
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ChargeForAlert<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    
    #[account(mut)]
    pub subscriber: Account<'info, Subscriber>,
    
    #[account(
        init,
        payer = distributor,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"delivery", subscriber.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub delivery_receipt: Account<'info, DeliveryReceipt>,
    
    /// Authorized distributor (protocol-controlled)
    #[account(mut)]
    pub distributor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deactivate<'info> {
    #[account(
        mut,
        seeds = [b"subscriber", owner.key().as_ref()],
        bump = subscriber.bump,
        has_one = owner
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Reactivate<'info> {
    #[account(
        mut,
        seeds = [b"subscriber", owner.key().as_ref()],
        bump = subscriber.bump,
        has_one = owner
    )]
    pub subscriber: Account<'info, Subscriber>,
    
    pub owner: Signer<'info>,
}

// === Helpers ===

fn channels_to_u32(channels: &[u8]) -> u32 {
    let mut result: u32 = 0;
    for (i, &byte) in channels.iter().enumerate() {
        result |= (byte as u32) << (i * 8);
    }
    result
}

// === Errors ===

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Too many channels (max 32)")]
    TooManyChannels,
    #[msg("Subscriber is inactive")]
    SubscriberInactive,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid USDC mint")]
    InvalidMint,
}
