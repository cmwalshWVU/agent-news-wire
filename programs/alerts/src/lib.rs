use anchor_lang::prelude::*;

declare_id!("BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t");

/// Agent News Wire - Alert Registry Program
/// 
/// Stores alert hashes on-chain for proof of existence and timing.
/// Enables dispute resolution and historical verification.

#[program]
pub mod alert_registry {
    use super::*;

    /// Initialize the alert registry
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_alerts = 0;
        registry.bump = ctx.bumps.registry;
        
        msg!("Alert registry initialized");
        Ok(())
    }

    /// Register a new alert on-chain (called by authorized publishers)
    pub fn register_alert(
        ctx: Context<RegisterAlert>,
        alert_id: String,
        channel: String,
        content_hash: [u8; 32],
        priority: u8,
        impact_score: u8,
    ) -> Result<()> {
        require!(alert_id.len() <= 64, ErrorCode::AlertIdTooLong);
        require!(channel.len() <= 32, ErrorCode::ChannelNameTooLong);
        require!(priority <= 3, ErrorCode::InvalidPriority);
        require!(impact_score <= 10, ErrorCode::InvalidImpactScore);
        
        let alert = &mut ctx.accounts.alert;
        alert.alert_id = alert_id.clone();
        alert.channel = channel;
        alert.content_hash = content_hash;
        alert.publisher = ctx.accounts.publisher.key();
        alert.timestamp = Clock::get()?.unix_timestamp;
        alert.priority = priority;
        alert.impact_score = impact_score;
        alert.delivery_count = 0;
        alert.bump = ctx.bumps.alert;
        
        let registry = &mut ctx.accounts.registry;
        registry.total_alerts += 1;
        
        msg!("Alert registered: {}", alert_id);
        Ok(())
    }

    /// Record an alert delivery (for proof)
    pub fn record_delivery(
        ctx: Context<RecordDelivery>,
        subscriber: Pubkey,
    ) -> Result<()> {
        let alert = &mut ctx.accounts.alert;
        alert.delivery_count += 1;
        
        let delivery = &mut ctx.accounts.delivery;
        delivery.alert = alert.key();
        delivery.subscriber = subscriber;
        delivery.timestamp = Clock::get()?.unix_timestamp;
        delivery.bump = ctx.bumps.delivery;
        
        msg!("Delivery recorded for alert {} to {}", alert.alert_id, subscriber);
        Ok(())
    }

    /// Verify alert existence (view function, no state change)
    pub fn verify_alert(
        ctx: Context<VerifyAlert>,
        expected_hash: [u8; 32],
    ) -> Result<bool> {
        let alert = &ctx.accounts.alert;
        let matches = alert.content_hash == expected_hash;
        
        msg!("Alert verification: {}", if matches { "VALID" } else { "INVALID" });
        Ok(matches)
    }
}

// === Account Structures ===

#[account]
pub struct AlertRegistry {
    pub authority: Pubkey,
    pub total_alerts: u64,
    pub bump: u8,
}

#[account]
pub struct Alert {
    pub alert_id: String,           // Max 64 chars
    pub channel: String,            // Max 32 chars
    pub content_hash: [u8; 32],     // SHA256 of alert content
    pub publisher: Pubkey,
    pub timestamp: i64,
    pub priority: u8,               // 0=low, 1=medium, 2=high, 3=critical
    pub impact_score: u8,           // 0-10
    pub delivery_count: u64,
    pub bump: u8,
}

#[account]
pub struct AlertDelivery {
    pub alert: Pubkey,
    pub subscriber: Pubkey,
    pub timestamp: i64,
    pub bump: u8,
}

// === Contexts ===

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 1,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, AlertRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(alert_id: String)]
pub struct RegisterAlert<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, AlertRegistry>,
    
    #[account(
        init,
        payer = publisher,
        space = 8 + 4 + 64 + 4 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 1,
        seeds = [b"alert", alert_id.as_bytes()],
        bump
    )]
    pub alert: Account<'info, Alert>,
    
    #[account(mut)]
    pub publisher: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordDelivery<'info> {
    #[account(mut)]
    pub alert: Account<'info, Alert>,
    
    #[account(
        init,
        payer = distributor,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [
            b"delivery",
            alert.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub delivery: Account<'info, AlertDelivery>,
    
    #[account(mut)]
    pub distributor: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAlert<'info> {
    pub alert: Account<'info, Alert>,
}

// === Errors ===

#[error_code]
pub enum ErrorCode {
    #[msg("Alert ID too long (max 64 chars)")]
    AlertIdTooLong,
    #[msg("Channel name too long (max 32 chars)")]
    ChannelNameTooLong,
    #[msg("Invalid priority (must be 0-3)")]
    InvalidPriority,
    #[msg("Invalid impact score (must be 0-10)")]
    InvalidImpactScore,
    #[msg("Unauthorized publisher")]
    UnauthorizedPublisher,
}
