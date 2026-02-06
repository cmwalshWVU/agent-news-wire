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
  active: number;
  on_chain: number;
}

/**
 * Persistent subscription store using SQLite
 * Syncs with Solana on-chain data when wallet is provided
 */
export class SubscriptionStore {
  private byWallet: Map<string, string> = new Map(); // In-memory cache: wallet -> subscriberId

  constructor() {
    // Load wallet mapping into memory for fast lookups
    this.loadWalletCache();
  }

  /**
   * Load wallet -> subscriberId mapping into memory
   */
  private loadWalletCache() {
    const db = database.get();
    const rows = db.prepare('SELECT id, wallet_address FROM subscribers WHERE wallet_address IS NOT NULL').all() as { id: string; wallet_address: string }[];
    for (const row of rows) {
      this.byWallet.set(row.wallet_address, row.id);
    }
    console.log(`[SubscriptionStore] Loaded ${this.byWallet.size} wallet mappings from database`);
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
      active: row.active === 1,
      onChain: row.on_chain === 1
    };
  }

  /**
   * Create a new subscription
   * If walletAddress provided, will also sync with on-chain state
   */
  async subscribe(request: SubscribeRequest): Promise<Subscriber> {
    const db = database.get();

    // Check if wallet already has subscription
    if (request.walletAddress) {
      const existingId = this.byWallet.get(request.walletAddress);
      if (existingId) {
        const existing = this.get(existingId);
        if (existing) {
          // Update channels and return existing
          return this.updateChannels(existingId, request.channels) || existing;
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
        } else {
          subscriber.onChain = false;
          console.log(`[SubscriptionStore] New subscriber (not yet on-chain): ${request.walletAddress}`);
        }
      } catch (err) {
        console.error('[SubscriptionStore] Error checking on-chain state:', err);
      }
    }

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO subscribers (id, wallet_address, channels, webhook_url, created_at, balance, alerts_received, active, on_chain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      subscriber.id,
      subscriber.walletAddress || null,
      JSON.stringify(subscriber.channels),
      subscriber.webhookUrl || null,
      subscriber.createdAt,
      subscriber.balance,
      subscriber.alertsReceived,
      subscriber.active ? 1 : 0,
      subscriber.onChain ? 1 : 0
    );

    // Update wallet cache
    if (request.walletAddress) {
      this.byWallet.set(request.walletAddress, subscriber.id);
    }

    console.log(`[SubscriptionStore] Created subscriber: ${subscriber.id}`);
    return subscriber;
  }

  /**
   * Synchronous subscribe for backward compatibility
   */
  subscribeSync(request: SubscribeRequest): Subscriber {
    const db = database.get();

    // Check if wallet already has subscription
    if (request.walletAddress) {
      const existingId = this.byWallet.get(request.walletAddress);
      if (existingId) {
        const existing = this.get(existingId);
        if (existing) {
          return this.updateChannels(existingId, request.channels) || existing;
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

    const stmt = db.prepare(`
      INSERT INTO subscribers (id, wallet_address, channels, webhook_url, created_at, balance, alerts_received, active, on_chain)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      subscriber.id,
      subscriber.walletAddress || null,
      JSON.stringify(subscriber.channels),
      subscriber.webhookUrl || null,
      subscriber.createdAt,
      subscriber.balance,
      subscriber.alertsReceived,
      subscriber.active ? 1 : 0,
      subscriber.onChain ? 1 : 0
    );

    if (request.walletAddress) {
      this.byWallet.set(request.walletAddress, subscriber.id);
    }

    return subscriber;
  }

  /**
   * Get subscriber by ID
   */
  get(id: string): Subscriber | undefined {
    const db = database.get();
    const row = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(id) as SubscriberRow | undefined;
    return row ? this.rowToSubscriber(row) : undefined;
  }

  /**
   * Get subscriber by wallet address
   */
  getByWallet(walletAddress: string): Subscriber | undefined {
    const id = this.byWallet.get(walletAddress);
    return id ? this.get(id) : undefined;
  }

  /**
   * Get all subscribers for a channel
   */
  getByChannel(channel: Channel): Subscriber[] {
    const db = database.get();
    // SQLite JSON query - check if channel is in the channels array
    const rows = db.prepare(`
      SELECT * FROM subscribers 
      WHERE active = 1 AND channels LIKE ?
    `).all(`%"${channel}"%`) as SubscriberRow[];
    
    return rows.map(row => this.rowToSubscriber(row));
  }

  /**
   * Update subscriber channels
   */
  updateChannels(id: string, channels: Channel[]): Subscriber | null {
    const db = database.get();
    
    const result = db.prepare(`
      UPDATE subscribers SET channels = ? WHERE id = ?
    `).run(JSON.stringify(channels), id);

    if (result.changes === 0) return null;
    
    return this.get(id) || null;
  }

  /**
   * Deposit balance (for non-wallet subscribers or mock)
   */
  async deposit(id: string, amount: number): Promise<Subscriber | null> {
    const subscriber = this.get(id);
    if (!subscriber) return null;

    // For on-chain subscribers, refresh balance from chain
    if (subscriber.walletAddress && subscriber.onChain) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        const newBalance = Number(onChainBalance) / 1e6;
        
        const db = database.get();
        db.prepare('UPDATE subscribers SET balance = ? WHERE id = ?').run(newBalance, id);
        
        console.log(`[SubscriptionStore] Refreshed on-chain balance: ${newBalance} USDC`);
        return this.get(id) || null;
      } catch (err) {
        console.error('[SubscriptionStore] Error fetching on-chain balance:', err);
      }
    }

    // Mock deposit for non-wallet subscribers
    const db = database.get();
    db.prepare('UPDATE subscribers SET balance = balance + ? WHERE id = ?').run(amount, id);
    return this.get(id) || null;
  }

  /**
   * Synchronous deposit for backward compatibility
   */
  depositSync(id: string, amount: number): Subscriber | null {
    const db = database.get();
    const result = db.prepare('UPDATE subscribers SET balance = balance + ? WHERE id = ?').run(amount, id);
    if (result.changes === 0) return null;
    return this.get(id) || null;
  }

  /**
   * Get balance (refreshes from on-chain if applicable)
   */
  async getBalance(id: string): Promise<number> {
    const subscriber = this.get(id);
    if (!subscriber) return 0;

    if (subscriber.walletAddress && solanaClient.isValidPublicKey(subscriber.walletAddress)) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        const balance = Number(onChainBalance) / 1e6;
        
        // Update cached balance
        const db = database.get();
        db.prepare('UPDATE subscribers SET balance = ? WHERE id = ?').run(balance, id);
        
        return balance;
      } catch (err) {
        // Fall back to cached balance
      }
    }

    return subscriber.balance;
  }

  /**
   * Charge for an alert
   */
  charge(id: string, amount: number): boolean {
    const db = database.get();
    
    // Atomic check and deduct
    const subscriber = this.get(id);
    if (!subscriber || subscriber.balance < amount) return false;

    db.prepare(`
      UPDATE subscribers 
      SET balance = balance - ?, alerts_received = alerts_received + 1 
      WHERE id = ? AND balance >= ?
    `).run(amount, id, amount);

    return true;
  }

  /**
   * Increment alerts received counter (for trial mode)
   */
  incrementAlertsReceived(id: string): boolean {
    const db = database.get();
    const result = db.prepare('UPDATE subscribers SET alerts_received = alerts_received + 1 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Deactivate subscription
   */
  unsubscribe(id: string): boolean {
    const db = database.get();
    const result = db.prepare('UPDATE subscribers SET active = 0 WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Stats
   */
  stats() {
    const db = database.get();
    
    const total = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };
    const active = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE active = 1').get() as { count: number };
    const onChain = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE on_chain = 1').get() as { count: number };
    
    // Channel counts - more complex query
    const channelCounts: Record<string, number> = {};
    const rows = db.prepare('SELECT channels FROM subscribers WHERE active = 1').all() as { channels: string }[];
    for (const row of rows) {
      const channels = JSON.parse(row.channels) as string[];
      for (const channel of channels) {
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      }
    }

    return {
      totalSubscribers: total.count,
      activeSubscribers: active.count,
      onChainSubscribers: onChain.count,
      byChannel: channelCounts
    };
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();
