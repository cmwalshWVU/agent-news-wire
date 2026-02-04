/**
 * Agent News Wire SDK
 * 
 * TypeScript SDK for interacting with Agent News Wire -
 * Bloomberg Terminal for the Agent Economy.
 * 
 * @example
 * ```typescript
 * import { ANWClient, Channel } from '@agent-news-wire/sdk';
 * 
 * const client = new ANWClient({ apiUrl: 'http://localhost:3000' });
 * 
 * // Subscribe to channels
 * const sub = await client.subscribe([
 *   Channel.REGULATORY_SEC,
 *   Channel.MARKETS_WHALE_MOVEMENTS,
 *   Channel.DEFI_YIELDS
 * ]);
 * 
 * // Deposit USDC
 * await client.deposit(sub.id, 10);
 * 
 * // Handle real-time alerts
 * client.onAlert((alert) => {
 *   console.log(`[${alert.channel}] ${alert.headline}`);
 *   
 *   if (alert.priority === 'critical') {
 *     // Take immediate action
 *   }
 * });
 * 
 * // Connect to stream
 * await client.connect(sub.id);
 * ```
 */

export { ANWClient } from './client.js';
export type { ANWClientConfig, Subscription, AlertHandler, WarningHandler } from './client.js';

export {
  // Types
  type Alert,
  type ProtocolConfig,
  type Subscriber,
  type DeliveryReceipt,
  type AlertRegistry,
  type OnChainAlert,
  type AlertDelivery,
  type PublisherRegistry,
  type Publisher,
  
  // Enums & Constants
  Channel,
  CHANNEL_NAMES,
  PROGRAM_IDS,
  USDC_DECIMALS,
  DEFAULT_PRICE_PER_ALERT,
  DEFAULT_TREASURY_FEE_BPS,
  DEFAULT_PUBLISHER_SHARE_BPS,
  MIN_PUBLISHER_STAKE,
  
  // Helpers
  channelsToBitmap,
  bitmapToChannels,
  getSubscriberSeeds,
  getSubscriberVaultSeeds,
  getPublisherSeeds,
  getAlertSeeds,
} from './types.js';
