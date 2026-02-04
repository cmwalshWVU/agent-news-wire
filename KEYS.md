# Keys & Wallet Reference

**⚠️ SENSITIVE — Do not commit seed phrases to public repos**

**Last Updated:** 2026-02-03 22:45 UTC

---

## Deploy Wallet (Devnet)

**Address:** `8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2`

**Keypair Location:** `~/.config/solana/id.json`

**Balance:** ~1.3 SOL (as of 2026-02-03)

**Seed Phrase:** (stored in terminal history during creation — do not use for mainnet)

---

## Program Addresses (Devnet)

| Program | Address | Status |
|---------|---------|--------|
| SubscriptionRegistry | `H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ` | ✅ Deployed & Initialized |
| AlertRegistry | `BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t` | ✅ Deployed & Initialized |
| PublisherRegistry | `H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc` | ✅ Deployed & Initialized |

**Upgrade Authority (all programs):** `8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2`

---

## PDA Addresses (Initialized)

These are the Program Derived Addresses created during initialization:

| PDA | Address | Seeds |
|-----|---------|-------|
| Subscription Config | `7pobVEtga9fSLngK3EUgtu45WuqrrnTgBsHPAc4cYRQN` | `["config"]` |
| Alert Registry | `ErwSC32EUrF9PNcbqeT1Hdn85x2VhHVMfXUFTqyD5uWs` | `["registry"]` |
| Publisher Registry | `3H8MprBvoDiuKRCoUmYw3x9WipWu8nU9uRWffEzEEzmx` | `["publisher_registry"]` |

**Subscriber PDA derivation:** `["subscriber", owner_pubkey]` → SubscriptionRegistry
**Subscriber Vault PDA:** `["subscriber_vault", owner_pubkey]` → SubscriptionRegistry
**Publisher PDA:** `["publisher", owner_pubkey]` → PublisherRegistry
**Stake Vault PDA:** `["stake_vault", owner_pubkey]` → PublisherRegistry
**Alert PDA:** `["alert", alert_id_bytes]` → AlertRegistry
**Delivery PDA:** `["delivery", alert_pubkey, timestamp_bytes]` → AlertRegistry

---

## Protocol Configuration (On-Chain)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Price per alert | 20,000 | 0.02 USDC (6 decimals) |
| Treasury fee | 3,000 bps | 30% |
| Min publisher stake | 100,000,000 | 100 USDC (6 decimals) |
| Publisher share | 5,000 bps | 50% |
| Treasury address | `8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2` | Deploy wallet (temporary) |

---

## Program Data Accounts

These store the actual program bytecode:

| Program | ProgramData Address |
|---------|---------------------|
| SubscriptionRegistry | `HdUywGF6HQkbBkPyjG7ME6B2GSpDXYzySJ7F6jHRg1XN` |
| AlertRegistry | `ymADnn4yWp7yXzLsXb9s6T4FbHxuitMZYxkLgZxSXAb` |
| PublisherRegistry | `83cPqArHJcrwkguB5GrN1g2bPHu8W29uY4pse3uui6Mt` |

---

## Program Keypairs (for deterministic addresses)

Located in `programs/keypairs/`:

```
programs/keypairs/
├── subscription_registry-keypair.json
├── alert_registry-keypair.json
└── publisher_registry-keypair.json
```

These were generated to get the specific program addresses. Keep them if you need to redeploy to the same addresses.

---

## USDC Mint (Devnet)

**Devnet USDC:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

(This is the standard devnet USDC mint used for testing)

---

## API Keys (External Services)

| Service | Status | Location |
|---------|--------|----------|
| Whale Alert | Not configured | Need to obtain from whalealert.io |
| Helius | Not configured | Need for Solana webhooks |
| DeFiLlama | No key needed | Public API |
| SEC EDGAR | No key needed | Public RSS |

---

## Solana Config

**Config File:** `~/.config/solana/cli/config.yml`

**Current Settings:**
```yaml
json_rpc_url: https://api.devnet.solana.com
websocket_url: wss://api.devnet.solana.com/
keypair_path: /home/clawd/.config/solana/id.json
commitment: confirmed
```

**Switch Networks:**
```bash
# Devnet
solana config set --url devnet

# Mainnet (when ready)
solana config set --url mainnet-beta

# Local
solana config set --url localhost
```

---

## Recovery Commands

**Check program authority:**
```bash
solana program show <PROGRAM_ID>
```

**Transfer authority (if needed):**
```bash
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <NEW_AUTHORITY>
```

**Close program and recover SOL:**
```bash
solana program close <PROGRAM_ID>
```

---

## For Mainnet (Future)

Before mainnet deployment:

1. [ ] Generate new keypair (never use devnet wallet)
2. [ ] Use hardware wallet for authority
3. [ ] Set up multisig for program upgrades
4. [ ] Store seed phrases in secure vault
5. [ ] Remove all test keys from server

---

*Keep this file updated when keys change. Never commit actual seed phrases.*
