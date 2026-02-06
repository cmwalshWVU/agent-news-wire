import { z } from 'zod';

export const AlertPriority = z.enum(['low', 'medium', 'high', 'critical']);
export type AlertPriority = z.infer<typeof AlertPriority>;

export const AlertSentiment = z.enum(['bullish', 'bearish', 'neutral', 'mixed']);
export type AlertSentiment = z.infer<typeof AlertSentiment>;

export const SourceType = z.enum([
  'regulatory_filing',
  'press_release',
  'enforcement_action',
  'security_incident',
  'on_chain',
  'social',
  'news',
  'protocol',
  'defi_data',
  'agent' // Agent-published alerts
]);
export type SourceType = z.infer<typeof SourceType>;

export const Channel = z.enum([
  'regulatory/sec',
  'regulatory/cftc',
  'regulatory/global',
  'institutional/banks',
  'institutional/asset-managers',
  'defi/yields',
  'defi/hacks',
  'defi/protocols',
  'rwa/tokenization',
  'networks/solana',
  'networks/ethereum',
  'networks/canton',
  'networks/hedera',
  'networks/ripple',
  'networks/avalanche',
  'networks/bitcoin',
  'markets/whale-movements',
  'markets/liquidations'
]);
export type Channel = z.infer<typeof Channel>;

export const Alert = z.object({
  alertId: z.string(),
  channel: Channel,
  priority: AlertPriority,
  timestamp: z.string().datetime(),
  headline: z.string().max(200),
  summary: z.string().max(1000),
  entities: z.array(z.string()),
  tickers: z.array(z.string()),
  tokens: z.array(z.string()),
  sourceUrl: z.string().url(),
  sourceType: SourceType,
  sentiment: AlertSentiment.optional(),
  impactScore: z.number().min(0).max(10).optional(),
  rawData: z.record(z.unknown()).optional(),
  // Agent publisher tracking
  publisherId: z.string().optional(), // ID of agent that published this
  publisherName: z.string().optional() // Name for display
});
export type Alert = z.infer<typeof Alert>;

export const AlertInput = Alert.omit({ alertId: true, timestamp: true }).extend({
  publishedAt: z.string().optional() // Original publication timestamp from source
});
export type AlertInput = z.infer<typeof AlertInput>;
