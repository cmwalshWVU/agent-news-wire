/**
 * Agent News Wire - SDK Types
 * 
 * TypeScript types for alerts, subscriptions, and on-chain structures.
 */

// === Alert Types ===

export interface Alert {
  alertId: string;
  channel: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  headline: string;
  summary: string;
  entities: string[];
  tickers: string[];
  tokens: string[];
  sourceUrl: string;
  sourceType: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  impactScore?: number;
  rawData?: Record<string, unknown>;
}

// === Program IDs ===

// Deployed to Solana Devnet - 2026-02-03
export const PROGRAM_IDS = {
  SUBSCRIPTION_REGISTRY: 'H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ',
  ALERT_REGISTRY: 'BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t',
  PUBLISHER_REGISTRY: 'H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc',
};

// === On-Chain Types (for reference) ===

export interface ProtocolConfig {
  authority: string;
  usdcMint: string;
  treasury: string;
  pricePerAlert: bigint;
  treasuryFeeBps: number;
  totalSubscribers: bigint;
  totalAlertsDelivered: bigint;
  totalRevenue: bigint;
  bump: number;
}

export interface Subscriber {
  owner: string;
  channels: number; // u32 bitmap
  balance: bigint;
  alertsReceived: bigint;
  createdAt: bigint;
  active: boolean;
  bump: number;
}

export interface DeliveryReceipt {
  subscriber: string;
  alertHash: Uint8Array; // 32 bytes
  amountCharged: bigint;
  timestamp: bigint;
  bump: number;
}

export interface AlertRegistry {
  authority: string;
  totalAlerts: bigint;
  bump: number;
}

export interface OnChainAlert {
  alertId: string;
  channel: string;
  contentHash: Uint8Array; // 32 bytes
  publisher: string;
  timestamp: bigint;
  priority: number; // 0-3
  impactScore: number; // 0-10
  deliveryCount: bigint;
  bump: number;
}

export interface AlertDelivery {
  alert: string;
  subscriber: string;
  timestamp: bigint;
  bump: number;
}

export interface PublisherRegistry {
  authority: string;
  usdcMint: string;
  minStake: bigint;
  publisherShareBps: number;
  totalPublishers: bigint;
  totalPayouts: bigint;
  bump: number;
}

export interface Publisher {
  owner: string;
  name: string;
  metadataUri: string;
  stake: bigint;
  reputationScore: number; // 0-1000 (scaled by 10)
  alertsSubmitted: bigint;
  alertsAccepted: bigint;
  totalEarnings: bigint;
  registeredAt: bigint;
  active: boolean;
  slashed: boolean;
  bump: number;
}

// === Channel Definitions ===

export enum Channel {
  REGULATORY_SEC = 0,
  REGULATORY_CFTC = 1,
  REGULATORY_GLOBAL = 2,
  INSTITUTIONAL_BANKS = 3,
  INSTITUTIONAL_ASSET_MANAGERS = 4,
  DEFI_YIELDS = 5,
  DEFI_HACKS = 6,
  DEFI_PROTOCOLS = 7,
  RWA_TOKENIZATION = 8,
  NETWORKS_SOLANA = 9,
  NETWORKS_ETHEREUM = 10,
  NETWORKS_CANTON = 11,
  NETWORKS_HEDERA = 12,
  NETWORKS_RIPPLE = 13,
  NETWORKS_AVALANCHE = 14,
  NETWORKS_BITCOIN = 15,
  MARKETS_WHALE_MOVEMENTS = 16,
  MARKETS_LIQUIDATIONS = 17,
}

export const CHANNEL_NAMES: Record<Channel, string> = {
  [Channel.REGULATORY_SEC]: 'regulatory/sec',
  [Channel.REGULATORY_CFTC]: 'regulatory/cftc',
  [Channel.REGULATORY_GLOBAL]: 'regulatory/global',
  [Channel.INSTITUTIONAL_BANKS]: 'institutional/banks',
  [Channel.INSTITUTIONAL_ASSET_MANAGERS]: 'institutional/asset-managers',
  [Channel.DEFI_YIELDS]: 'defi/yields',
  [Channel.DEFI_HACKS]: 'defi/hacks',
  [Channel.DEFI_PROTOCOLS]: 'defi/protocols',
  [Channel.RWA_TOKENIZATION]: 'rwa/tokenization',
  [Channel.NETWORKS_SOLANA]: 'networks/solana',
  [Channel.NETWORKS_ETHEREUM]: 'networks/ethereum',
  [Channel.NETWORKS_CANTON]: 'networks/canton',
  [Channel.NETWORKS_HEDERA]: 'networks/hedera',
  [Channel.NETWORKS_RIPPLE]: 'networks/ripple',
  [Channel.NETWORKS_AVALANCHE]: 'networks/avalanche',
  [Channel.NETWORKS_BITCOIN]: 'networks/bitcoin',
  [Channel.MARKETS_WHALE_MOVEMENTS]: 'markets/whale-movements',
  [Channel.MARKETS_LIQUIDATIONS]: 'markets/liquidations',
};

// === Helper Functions ===

/**
 * Convert channel array to bitmap
 */
export function channelsToBitmap(channels: Channel[]): number {
  let bitmap = 0;
  for (const channel of channels) {
    bitmap |= (1 << channel);
  }
  return bitmap;
}

/**
 * Convert bitmap to channel array
 */
export function bitmapToChannels(bitmap: number): Channel[] {
  const channels: Channel[] = [];
  for (let i = 0; i < 32; i++) {
    if (bitmap & (1 << i)) {
      channels.push(i as Channel);
    }
  }
  return channels;
}

/**
 * Derive PDA seeds for subscriber account
 */
export function getSubscriberSeeds(owner: string): Buffer[] {
  return [Buffer.from('subscriber'), Buffer.from(owner)];
}

/**
 * Derive PDA seeds for subscriber vault
 */
export function getSubscriberVaultSeeds(owner: string): Buffer[] {
  return [Buffer.from('subscriber_vault'), Buffer.from(owner)];
}

/**
 * Derive PDA seeds for publisher account
 */
export function getPublisherSeeds(owner: string): Buffer[] {
  return [Buffer.from('publisher'), Buffer.from(owner)];
}

/**
 * Derive PDA seeds for alert account
 */
export function getAlertSeeds(alertId: string): Buffer[] {
  return [Buffer.from('alert'), Buffer.from(alertId)];
}

// === Price Constants ===

export const USDC_DECIMALS = 6;
export const DEFAULT_PRICE_PER_ALERT = 20_000; // 0.02 USDC (in lamports)
export const DEFAULT_TREASURY_FEE_BPS = 3000; // 30%
export const DEFAULT_PUBLISHER_SHARE_BPS = 5000; // 50%
export const MIN_PUBLISHER_STAKE = 100_000_000; // 100 USDC
