import { v4 as uuid } from 'uuid';
import { PublicKey } from '@solana/web3.js';
import { Subscriber, SubscribeRequest, Channel } from '../types/index.js';
import { solanaClient } from './solana-client.js';
import { database } from './database.js';

interface SubscriberRow {
  id: string;
  wallet_address: string | null;
  channels: string;
  webhook_url: string | null;
  created_at: string;
  balance: number;
  alerts_received: number;
  active: boolean | number;
  on_chain: boolean | number;
}

/**
 * Persistent subscription store using Knex (SQLite/PostgreSQL)
 * Syncs with Solana on-chain data when wallet is provided
 */
export class SubscriptionStore {
  private walletCache: Map<string, string> = new Map(); // wallet -> subscriberId
  private initialized = false;

  /**
   * Initialize wallet cache from database
   */
  async init() {
    if (this.initialized) return;
    
    const db = await database.get();
    const rows = await db('subscribers')
      .select('id', 'wallet_address')
      .whereNotNull('wallet_address');
    
    for (const row of rows) {
      this.walletCache.set(row.wallet_address, row.id);
    }
    
    console.log(`[SubscriptionStore] Loaded ${this.walletCache.size} wallet mappings`);
    this.initialized = true;
  }

  /**
   * Convert database row to Subscriber object
   */
  private rowToSubscriber(row: SubscriberRow): Subscriber {
    return {
      id: row.id,
      walletAddress: row.wallet_address || undefined,
      channels: JSON.parse(row.channels) as Channel[],
      webhookUrl: row.webhook_url || undefined,
      createdAt: row.created_at,
      balance: row.balance,
      alertsReceived: row.alerts_received,
      active: Boolean(row.active),
      onChain: Boolean(row.on_chain)
    };
  }

  /**
   * Create a new subscription
   */
  async subscribe(request: SubscribeRequest): Promise<Subscriber> {
    await this.init();
    const db = await database.get();

    // Check if wallet already has subscription
    if (request.walletAddress) {
      const existingId = this.walletCache.get(request.walletAddress);
      if (existingId) {
        const existing = await this.get(existingId);
        if (existing) {
          // Update channels and return existing
          const updated = await this.updateChannels(existingId, request.channels);
          return updated || existing;
        }
      }
    }

    const subscriber: Subscriber = {
      id: uuid(),
      channels: request.channels,
      walletAddress: request.walletAddress,
      webhookUrl: request.webhookUrl,
      createdAt: new Date().toISOString(),
      balance: 0,
      alertsReceived: 0,
      active: true,
      onChain: false
    };

    // If wallet provided, check/sync on-chain state
    if (request.walletAddress && solanaClient.isValidPublicKey(request.walletAddress)) {
      try {
        const ownerPubkey = new PublicKey(request.walletAddress);
        const exists = await solanaClient.subscriberExists(ownerPubkey);
        
        if (exists) {
          const onChainData = await solanaClient.getSubscriber(ownerPubkey);
          if (onChainData) {
            subscriber.balance = Number(onChainData.balance) / 1e6;
            subscriber.alertsReceived = Number(onChainData.alertsReceived);
            subscriber.active = onChainData.active;
            subscriber.onChain = true;
            console.log(`[SubscriptionStore] Synced on-chain subscriber: ${request.walletAddress}`);
          }
        }
      } catch (err) {
        console.error('[SubscriptionStore] Error checking on-chain state:', err);
      }
    }

    // Insert into database
    await db('subscribers').insert({
      id: subscriber.id,
      wallet_address: subscriber.walletAddress || null,
      channels: JSON.stringify(subscriber.channels),
      webhook_url: subscriber.webhookUrl || null,
      created_at: subscriber.createdAt,
      balance: subscriber.balance,
      alerts_received: subscriber.alertsReceived,
      active: subscriber.active,
      on_chain: subscriber.onChain
    });

    // Update wallet cache
    if (request.walletAddress) {
      this.walletCache.set(request.walletAddress, subscriber.id);
    }

    console.log(`[SubscriptionStore] Created subscriber: ${subscriber.id}`);
    return subscriber;
  }

  /**
   * Get subscriber by ID
   */
  async get(id: string): Promise<Subscriber | undefined> {
    const db = await database.get();
    const row = await db('subscribers').where('id', id).first() as SubscriberRow | undefined;
    return row ? this.rowToSubscriber(row) : undefined;
  }

  /**
   * Get subscriber by wallet address
   */
  async getByWallet(walletAddress: string): Promise<Subscriber | undefined> {
    await this.init();
    const id = this.walletCache.get(walletAddress);
    return id ? this.get(id) : undefined;
  }

  /**
   * Get all subscribers for a channel
   */
  async getByChannel(channel: Channel): Promise<Subscriber[]> {
    const db = await database.get();
    
    // JSON contains query - works for both SQLite and PostgreSQL
    const rows = await db('subscribers')
      .where('active', true)
      .where('channels', 'like', `%"${channel}"%`) as SubscriberRow[];
    
    return rows.map(row => this.rowToSubscriber(row));
  }

  /**
   * Update subscriber channels
   */
  async updateChannels(id: string, channels: Channel[]): Promise<Subscriber | null> {
    const db = await database.get();
    
    await db('subscribers')
      .where('id', id)
      .update({ channels: JSON.stringify(channels) });

    const result = await this.get(id);
    return result ?? null;
  }

  /**
   * Deposit balance
   */
  async deposit(id: string, amount: number): Promise<Subscriber | null> {
    const subscriber = await this.get(id);
    if (!subscriber) return null;

    const db = await database.get();

    // For on-chain subscribers, refresh balance from chain
    if (subscriber.walletAddress && subscriber.onChain) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        const newBalance = Number(onChainBalance) / 1e6;
        
        await db('subscribers').where('id', id).update({ balance: newBalance });
        
        console.log(`[SubscriptionStore] Refreshed on-chain balance: ${newBalance} USDC`);
        const updated = await this.get(id);
        return updated ?? null;
      } catch (err) {
        console.error('[SubscriptionStore] Error fetching on-chain balance:', err);
      }
    }

    // Mock deposit for non-wallet subscribers
    await db('subscribers')
      .where('id', id)
      .increment('balance', amount);
    
    const result = await this.get(id);
    return result ?? null;
  }

  /**
   * Get balance
   */
  async getBalance(id: string): Promise<number> {
    const subscriber = await this.get(id);
    if (!subscriber) return 0;

    if (subscriber.walletAddress && solanaClient.isValidPublicKey(subscriber.walletAddress)) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        const balance = Number(onChainBalance) / 1e6;
        
        // Update cached balance
        const db = await database.get();
        await db('subscribers').where('id', id).update({ balance });
        
        return balance;
      } catch {
        // Fall back to cached balance
      }
    }

    return subscriber.balance;
  }

  /**
   * Charge for an alert
   */
  async charge(id: string, amount: number): Promise<boolean> {
    const db = await database.get();
    
    const subscriber = await this.get(id);
    if (!subscriber || subscriber.balance < amount) return false;

    await db('subscribers')
      .where('id', id)
      .where('balance', '>=', amount)
      .decrement('balance', amount)
      .increment('alerts_received', 1);

    return true;
  }

  /**
   * Increment alerts received counter
   */
  async incrementAlertsReceived(id: string): Promise<boolean> {
    const db = await database.get();
    const result = await db('subscribers')
      .where('id', id)
      .increment('alerts_received', 1);
    
    return result > 0;
  }

  /**
   * Deactivate subscription
   */
  async unsubscribe(id: string): Promise<boolean> {
    const db = await database.get();
    const result = await db('subscribers')
      .where('id', id)
      .update({ active: false });
    
    return result > 0;
  }

  /**
   * Stats
   */
  async stats() {
    const db = await database.get();
    
    const [total] = await db('subscribers').count('* as count');
    const [active] = await db('subscribers').where('active', true).count('* as count');
    const [onChain] = await db('subscribers').where('on_chain', true).count('* as count');
    
    // Channel counts
    const channelCounts: Record<string, number> = {};
    const rows = await db('subscribers')
      .select('channels')
      .where('active', true) as { channels: string }[];
    
    for (const row of rows) {
      const channels = JSON.parse(row.channels) as string[];
      for (const channel of channels) {
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      }
    }

    return {
      totalSubscribers: Number(total.count),
      activeSubscribers: Number(active.count),
      onChainSubscribers: Number(onChain.count),
      byChannel: channelCounts
    };
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();
