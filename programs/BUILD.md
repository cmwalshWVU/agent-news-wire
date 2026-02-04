# Building the Anchor Programs

## Prerequisites

1. **Rust** (installed ✅)
   ```bash
   source "$HOME/.cargo/env"
   rustc --version
   ```

2. **Solana CLI** (installed ✅)
   ```bash
   export PATH="/home/clawd/.local/share/solana/install/active_release/bin:$PATH"
   solana --version
   ```

3. **Build Tools** (need sudo access)
   ```bash
   sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev
   ```

4. **Anchor CLI** (after build tools)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --force
   avm install latest
   avm use latest
   anchor --version
   ```

## Building

Once prerequisites are installed:

```bash
cd agent-news-wire/programs

# Build all programs
anchor build

# Generate TypeScript IDL
anchor idl init --filepath target/idl/subscription_registry.json ANWSubXXX...
anchor idl init --filepath target/idl/alert_registry.json ANWAlrtXXX...
anchor idl init --filepath target/idl/publisher_registry.json ANWPubXXX...
```

## Deploying to Devnet

```bash
# Configure for devnet
solana config set --url devnet

# Create a new keypair (or use existing)
solana-keygen new -o ~/.config/solana/id.json

# Airdrop SOL for deployment
solana airdrop 2

# Deploy programs
anchor deploy

# Note the program IDs and update:
# - programs/Anchor.toml
# - Each program's declare_id!() macro
```

## Testing

```bash
# Run Anchor tests
anchor test

# Or run against local validator
solana-test-validator &
anchor test --skip-local-validator
```

## Program Overview

### 1. Subscription Registry (`subscription_registry`)
- **Purpose:** Manages subscriber accounts and USDC deposits
- **Key Instructions:**
  - `initialize` - Set up protocol config
  - `create_subscriber` - Create new subscriber PDA
  - `deposit` / `withdraw` - Manage USDC balance
  - `update_channels` - Change channel subscriptions
  - `charge_for_alert` - Deduct payment for alert delivery

### 2. Alert Registry (`alert_registry`)
- **Purpose:** On-chain proof of alert existence and timing
- **Key Instructions:**
  - `initialize` - Set up registry
  - `register_alert` - Store alert hash on-chain
  - `record_delivery` - Create delivery receipt
  - `verify_alert` - Check alert hash

### 3. Publisher Registry (`publisher_registry`)
- **Purpose:** Publisher staking, reputation, and revenue distribution
- **Key Instructions:**
  - `initialize` - Set up registry with stake requirements
  - `register_publisher` - Register with USDC stake
  - `record_alert_submission` - Track acceptance rate
  - `distribute_revenue` - Pay publishers for deliveries
  - `slash_publisher` - Penalize bad actors
  - `withdraw_stake` - Exit and reclaim stake

## Account Structures

### ProtocolConfig (Subscription)
```
authority: Pubkey
usdc_mint: Pubkey
treasury: Pubkey
price_per_alert: u64
treasury_fee_bps: u16
total_subscribers: u64
total_alerts_delivered: u64
total_revenue: u64
```

### Subscriber
```
owner: Pubkey
channels: u32 (bitmap)
balance: u64
alerts_received: u64
created_at: i64
active: bool
```

### Alert
```
alert_id: String
channel: String
content_hash: [u8; 32]
publisher: Pubkey
timestamp: i64
priority: u8
impact_score: u8
delivery_count: u64
```

### Publisher
```
owner: Pubkey
name: String
metadata_uri: String
stake: u64
reputation_score: u16
alerts_submitted: u64
alerts_accepted: u64
total_earnings: u64
active: bool
slashed: bool
```

## Integration with API Server

The API server (TypeScript) will:

1. **On subscriber creation:**
   - Call `create_subscriber` instruction
   - Store subscriber PDA address

2. **On deposit:**
   - Call `deposit` instruction
   - Update local balance cache

3. **On alert delivery:**
   - Call `charge_for_alert` instruction
   - Call `register_alert` (for on-chain proof)
   - Call `record_delivery` (for receipt)

4. **On publisher submission:**
   - Verify publisher stake via `publisher` account
   - Call `record_alert_submission` after validation
   - Call `distribute_revenue` after deliveries

## USDC Token

- **Devnet USDC:** Use SPL token faucet or create test token
- **Mainnet USDC:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Security Considerations

1. **PDA Seeds:** All accounts use deterministic seeds for easy lookup
2. **Authority Checks:** Protocol operations require authorized signers
3. **Stake Requirements:** Publishers must stake to prevent spam
4. **Slashing:** Bad actors can be penalized by slashing stake
5. **Overflow Protection:** All arithmetic uses checked operations
