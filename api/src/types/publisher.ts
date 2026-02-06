import { z } from 'zod';
import { Channel } from './alert.js';

export const PublisherStatus = z.enum(['pending', 'active', 'suspended', 'banned']);
export type PublisherStatus = z.infer<typeof PublisherStatus>;

export const Publisher = z.object({
  id: z.string(),
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  walletAddress: z.string().optional(),
  apiKey: z.string(), // Hashed API key for authentication
  apiKeyPrefix: z.string(), // First 8 chars for identification
  channels: z.array(Channel), // Channels this publisher can post to
  status: PublisherStatus.default('active'),
  createdAt: z.string().datetime(),
  
  // Reputation & stats
  alertsPublished: z.number().default(0),
  alertsConsumed: z.number().default(0), // Total times their alerts were consumed
  reputationScore: z.number().min(0).max(100).default(50), // Starts at 50
  stake: z.number().default(0), // USDC staked (for skin in the game)
  
  // On-chain tracking
  onChain: z.boolean().default(false),
  publisherPDA: z.string().optional() // Solana PDA address
});
export type Publisher = z.infer<typeof Publisher>;

export const PublisherRegisterRequest = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
  walletAddress: z.string().optional(),
  channels: z.array(Channel).min(1).max(10)
});
export type PublisherRegisterRequest = z.infer<typeof PublisherRegisterRequest>;

export const PublishAlertRequest = z.object({
  channel: Channel,
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  headline: z.string().min(10).max(200),
  summary: z.string().min(20).max(1000),
  entities: z.array(z.string()).default([]),
  tickers: z.array(z.string()).default([]),
  tokens: z.array(z.string()).default([]),
  sourceUrl: z.string().url(),
  sentiment: z.enum(['bullish', 'bearish', 'neutral', 'mixed']).optional(),
  impactScore: z.number().min(0).max(10).optional()
});
export type PublishAlertRequest = z.infer<typeof PublishAlertRequest>;

// Leaderboard entry for publisher rankings
export const PublisherLeaderboardEntry = z.object({
  id: z.string(),
  name: z.string(),
  alertsPublished: z.number(),
  alertsConsumed: z.number(),
  reputationScore: z.number(),
  rank: z.number()
});
export type PublisherLeaderboardEntry = z.infer<typeof PublisherLeaderboardEntry>;
