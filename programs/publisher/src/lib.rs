use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

declare_id!("H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc");

/// Agent News Wire - Publisher Registry Program
/// 
/// Manages publisher registration, reputation scoring, staking,
/// and revenue distribution from alert deliveries.

#[program]
pub mod publisher_registry {
    use super::*;

    /// Initialize the publisher registry
    pub fn initialize(
        ctx: Context<Initialize>,
        min_stake: u64,
        publisher_share_bps: u16,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.usdc_mint = ctx.accounts.usdc_mint.key();
        registry.min_stake = min_stake;
        registry.publisher_share_bps = publisher_share_bps; // e.g., 5000 = 50%
        registry.total_publishers = 0;
        registry.total_payouts = 0;
        registry.bump = ctx.bumps.registry;
        
        msg!("Publisher registry initialized: min_stake={}, share={}bps", 
            min_stake, publisher_share_bps);
        Ok(())
    }

    /// Register as a publisher (requires stake)
    pub fn register_publisher(
        ctx: Context<RegisterPublisher>,
        name: String,
        metadata_uri: String,
    ) -> Result<()> {
        require!(name.len() <= 64, ErrorCode::NameTooLong);
        require!(metadata_uri.len() <= 200, ErrorCode::UriTooLong);
        
        let registry = &ctx.accounts.registry;
        
        // Transfer stake to publisher vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.publisher_token_account.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, registry.min_stake)?;
        
        let publisher = &mut ctx.accounts.publisher;
        publisher.owner = ctx.accounts.owner.key();
        publisher.name = name.clone();
        publisher.metadata_uri = metadata_uri;
        publisher.stake = registry.min_stake;
        publisher.reputation_score = 500; // Start at 50.0 (scaled by 10)
        publisher.alerts_submitted = 0;
        publisher.alerts_accepted = 0;
        publisher.total_earnings = 0;
        publisher.registered_at = Clock::get()?.unix_timestamp;
        publisher.active = true;
        publisher.slashed = false;
        publisher.bump = ctx.bumps.publisher;
        
        let registry = &mut ctx.accounts.registry;
        registry.total_publishers += 1;
        
        msg!("Publisher registered: {}", name);
        Ok(())
    }

    /// Record alert submission and acceptance
    pub fn record_alert_submission(
        ctx: Context<RecordSubmission>,
        accepted: bool,
    ) -> Result<()> {
        let publisher = &mut ctx.accounts.publisher;
        publisher.alerts_submitted += 1;
        
        if accepted {
            publisher.alerts_accepted += 1;
            // Increase reputation for accepted alerts
            publisher.reputation_score = publisher.reputation_score
                .saturating_add(10)
                .min(1000); // Max 100.0
        } else {
            // Decrease reputation for rejected alerts
            publisher.reputation_score = publisher.reputation_score
                .saturating_sub(20)
                .max(0);
        }
        
        msg!("Alert submission recorded: accepted={}, new_reputation={}", 
            accepted, publisher.reputation_score);
        Ok(())
    }

    /// Distribute revenue to publisher for delivered alert
    pub fn distribute_revenue(
        ctx: Context<DistributeRevenue>,
        amount: u64,
    ) -> Result<()> {
        let registry = &ctx.accounts.registry;
        let publisher = &mut ctx.accounts.publisher;
        
        require!(publisher.active, ErrorCode::PublisherInactive);
        require!(!publisher.slashed, ErrorCode::PublisherSlashed);
        
        // Calculate publisher share
        let publisher_amount = (amount as u128)
            .checked_mul(registry.publisher_share_bps as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::Overflow)? as u64;
        
        // Transfer from revenue pool to publisher
        let registry_key = registry.key();
        let seeds = &[
            b"revenue_pool",
            registry_key.as_ref(),
            &[ctx.bumps.revenue_pool],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.revenue_pool.to_account_info(),
            to: ctx.accounts.publisher_token_account.to_account_info(),
            authority: ctx.accounts.revenue_pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, publisher_amount)?;
        
        publisher.total_earnings = publisher.total_earnings
            .checked_add(publisher_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        let registry = &mut ctx.accounts.registry;
        registry.total_payouts = registry.total_payouts
            .checked_add(publisher_amount)
            .ok_or(ErrorCode::Overflow)?;
        
        msg!("Distributed {} to publisher {}", publisher_amount, publisher.name);
        Ok(())
    }

    /// Slash publisher stake for bad behavior
    pub fn slash_publisher(
        ctx: Context<SlashPublisher>,
        slash_amount: u64,
        reason: String,
    ) -> Result<()> {
        let publisher = &mut ctx.accounts.publisher;
        
        require!(slash_amount <= publisher.stake, ErrorCode::InsufficientStake);
        
        publisher.stake = publisher.stake.checked_sub(slash_amount)
            .ok_or(ErrorCode::Overflow)?;
        publisher.reputation_score = 0;
        
        if publisher.stake == 0 {
            publisher.slashed = true;
            publisher.active = false;
        }
        
        // Transfer slashed amount to treasury
        let owner_key = publisher.owner;
        let seeds = &[
            b"stake_vault",
            owner_key.as_ref(),
            &[ctx.bumps.stake_vault],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.stake_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, slash_amount)?;
        
        msg!("Publisher {} slashed {} for: {}", publisher.name, slash_amount, reason);
        Ok(())
    }

    /// Withdraw stake (deactivates publisher)
    pub fn withdraw_stake(ctx: Context<WithdrawStake>) -> Result<()> {
        let publisher = &mut ctx.accounts.publisher;
        
        require!(!publisher.slashed, ErrorCode::PublisherSlashed);
        
        let stake_amount = publisher.stake;
        publisher.stake = 0;
        publisher.active = false;
        
        // Transfer stake back to publisher
        let owner_key = ctx.accounts.owner.key();
        let seeds = &[
            b"stake_vault",
            owner_key.as_ref(),
            &[ctx.bumps.stake_vault],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.stake_vault.to_account_info(),
            to: ctx.accounts.publisher_token_account.to_account_info(),
            authority: ctx.accounts.stake_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer(cpi_ctx, stake_amount)?;
        
        msg!("Publisher {} withdrew stake: {}", publisher.name, stake_amount);
        Ok(())
    }
}

// === Account Structures ===

#[account]
pub struct PublisherRegistry {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub min_stake: u64,             // Minimum USDC stake required
    pub publisher_share_bps: u16,   // Publisher revenue share (5000 = 50%)
    pub total_publishers: u64,
    pub total_payouts: u64,
    pub bump: u8,
}

#[account]
pub struct Publisher {
    pub owner: Pubkey,
    pub name: String,               // Max 64 chars
    pub metadata_uri: String,       // Max 200 chars (IPFS/Arweave link)
    pub stake: u64,                 // USDC staked
    pub reputation_score: u16,      // 0-1000 (scaled by 10, so 500 = 50.0)
    pub alerts_submitted: u64,
    pub alerts_accepted: u64,
    pub total_earnings: u64,
    pub registered_at: i64,
    pub active: bool,
    pub slashed: bool,
    pub bump: u8,
}

// === Contexts ===

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 2 + 8 + 8 + 1,
        seeds = [b"publisher_registry"],
        bump
    )]
    pub registry: Account<'info, PublisherRegistry>,
    
    /// CHECK: USDC mint address
    pub usdc_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterPublisher<'info> {
    #[account(
        mut,
        seeds = [b"publisher_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, PublisherRegistry>,
    
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 4 + 64 + 4 + 200 + 8 + 2 + 8 + 8 + 8 + 8 + 1 + 1 + 1,
        seeds = [b"publisher", owner.key().as_ref()],
        bump
    )]
    pub publisher: Account<'info, Publisher>,
    
    #[account(
        init,
        payer = owner,
        token::mint = usdc_mint,
        token::authority = stake_vault,
        seeds = [b"stake_vault", owner.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub publisher_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: USDC mint
    pub usdc_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RecordSubmission<'info> {
    #[account(mut)]
    pub publisher: Account<'info, Publisher>,
    
    /// Authority (protocol-controlled)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeRevenue<'info> {
    #[account(
        mut,
        seeds = [b"publisher_registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, PublisherRegistry>,
    
    #[account(mut)]
    pub publisher: Account<'info, Publisher>,
    
    #[account(
        mut,
        seeds = [b"revenue_pool", registry.key().as_ref()],
        bump
    )]
    pub revenue_pool: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub publisher_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    /// Authority (protocol-controlled)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SlashPublisher<'info> {
    #[account(
        seeds = [b"publisher_registry"],
        bump = registry.bump,
        has_one = authority
    )]
    pub registry: Account<'info, PublisherRegistry>,
    
    #[account(mut)]
    pub publisher: Account<'info, Publisher>,
    
    #[account(
        mut,
        seeds = [b"stake_vault", publisher.owner.as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(
        mut,
        seeds = [b"publisher", owner.key().as_ref()],
        bump = publisher.bump,
        has_one = owner
    )]
    pub publisher: Account<'info, Publisher>,
    
    #[account(
        mut,
        seeds = [b"stake_vault", owner.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub publisher_token_account: Account<'info, TokenAccount>,
    
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// === Errors ===

#[error_code]
pub enum ErrorCode {
    #[msg("Name too long (max 64 chars)")]
    NameTooLong,
    #[msg("URI too long (max 200 chars)")]
    UriTooLong,
    #[msg("Publisher is inactive")]
    PublisherInactive,
    #[msg("Publisher has been slashed")]
    PublisherSlashed,
    #[msg("Insufficient stake")]
    InsufficientStake,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}
