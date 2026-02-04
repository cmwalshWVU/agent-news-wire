import { z } from 'zod';
import { Channel } from './alert.js';

export const Subscriber = z.object({
  id: z.string(),
  walletAddress: z.string().optional(), // Solana wallet for payments
  channels: z.array(Channel),
  webhookUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  balance: z.number().default(0), // USDC balance (human readable)
  alertsReceived: z.number().default(0),
  active: z.boolean().default(true),
  onChain: z.boolean().default(false) // Whether subscriber exists on Solana
});
export type Subscriber = z.infer<typeof Subscriber>;

export const SubscribeRequest = z.object({
  channels: z.array(Channel).min(1),
  walletAddress: z.string().optional(),
  webhookUrl: z.string().url().optional()
});
export type SubscribeRequest = z.infer<typeof SubscribeRequest>;
