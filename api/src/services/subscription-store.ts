import { v4 as uuid } from 'uuid';
import { PublicKey } from '@solana/web3.js';
import { Subscriber, SubscribeRequest, Channel } from '../types/index.js';
import { solanaClient } from './solana-client.js';

/**
 * Hybrid subscription store.
 * 
 * MVP Mode: In-memory tracking for fast lookups
 * On-Chain Mode: When walletAddress provided, syncs with Solana PDAs
 * 
 * The in-memory store serves as a cache/index while on-chain
 * is the source of truth for balances and charges.
 */
export class SubscriptionStore {
  private subscribers: Map<string, Subscriber> = new Map();
  private byChannel: Map<Channel, Set<string>> = new Map();
  private byWallet: Map<string, string> = new Map(); // wallet -> subscriberId

  /**
   * Create a new subscription
   * If walletAddress provided, will also create on-chain (when wired)
   */
  async subscribe(request: SubscribeRequest): Promise<Subscriber> {
    // Check if wallet already has subscription
    if (request.walletAddress) {
      const existingId = this.byWallet.get(request.walletAddress);
      if (existingId) {
        const existing = this.subscribers.get(existingId);
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
          // Subscriber exists on-chain, fetch their data
          const onChainData = await solanaClient.getSubscriber(ownerPubkey);
          if (onChainData) {
            subscriber.balance = Number(onChainData.balance) / 1e6; // Convert from lamports
            subscriber.alertsReceived = Number(onChainData.alertsReceived);
            subscriber.active = onChainData.active;
            subscriber.onChain = true;
            console.log(`[SubscriptionStore] Synced on-chain subscriber: ${request.walletAddress}`);
          }
        } else {
          // Mark as needing on-chain creation
          subscriber.onChain = false;
          console.log(`[SubscriptionStore] New subscriber (not yet on-chain): ${request.walletAddress}`);
        }
      } catch (err) {
        console.error('[SubscriptionStore] Error checking on-chain state:', err);
      }
    }

    this.subscribers.set(subscriber.id, subscriber);

    // Index by wallet
    if (request.walletAddress) {
      this.byWallet.set(request.walletAddress, subscriber.id);
    }

    // Index by channel
    for (const channel of request.channels) {
      const subs = this.byChannel.get(channel) || new Set();
      subs.add(subscriber.id);
      this.byChannel.set(channel, subs);
    }

    return subscriber;
  }

  /**
   * Synchronous subscribe for backward compatibility
   */
  subscribeSync(request: SubscribeRequest): Subscriber {
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

    this.subscribers.set(subscriber.id, subscriber);

    if (request.walletAddress) {
      this.byWallet.set(request.walletAddress, subscriber.id);
    }

    for (const channel of request.channels) {
      const subs = this.byChannel.get(channel) || new Set();
      subs.add(subscriber.id);
      this.byChannel.set(channel, subs);
    }

    return subscriber;
  }

  /**
   * Get subscriber by ID
   */
  get(id: string): Subscriber | undefined {
    return this.subscribers.get(id);
  }

  /**
   * Get subscriber by wallet address
   */
  getByWallet(walletAddress: string): Subscriber | undefined {
    const id = this.byWallet.get(walletAddress);
    return id ? this.subscribers.get(id) : undefined;
  }

  /**
   * Get all subscribers for a channel
   */
  getByChannel(channel: Channel): Subscriber[] {
    const ids = this.byChannel.get(channel) || new Set();
    return Array.from(ids)
      .map(id => this.subscribers.get(id))
      .filter((s): s is Subscriber => s !== undefined && s.active);
  }

  /**
   * Update subscriber channels
   */
  updateChannels(id: string, channels: Channel[]): Subscriber | null {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return null;

    // Remove from old channel indexes
    for (const oldChannel of subscriber.channels) {
      const subs = this.byChannel.get(oldChannel);
      if (subs) subs.delete(id);
    }

    // Update subscriber
    subscriber.channels = channels;

    // Add to new channel indexes
    for (const channel of channels) {
      const subs = this.byChannel.get(channel) || new Set();
      subs.add(id);
      this.byChannel.set(channel, subs);
    }

    return subscriber;
  }

  /**
   * Deposit balance
   * If wallet subscriber, queries on-chain balance
   */
  async deposit(id: string, amount: number): Promise<Subscriber | null> {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return null;

    // For on-chain subscribers, refresh balance from chain
    if (subscriber.walletAddress && subscriber.onChain) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        subscriber.balance = Number(onChainBalance) / 1e6;
        console.log(`[SubscriptionStore] Refreshed on-chain balance: ${subscriber.balance} USDC`);
      } catch (err) {
        console.error('[SubscriptionStore] Error fetching on-chain balance:', err);
      }
    } else {
      // Mock deposit for non-wallet subscribers
      subscriber.balance += amount;
    }

    return subscriber;
  }

  /**
   * Synchronous deposit for backward compatibility (mock only)
   */
  depositSync(id: string, amount: number): Subscriber | null {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return null;
    subscriber.balance += amount;
    return subscriber;
  }

  /**
   * Get balance (refreshes from on-chain if applicable)
   */
  async getBalance(id: string): Promise<number> {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return 0;

    if (subscriber.walletAddress && solanaClient.isValidPublicKey(subscriber.walletAddress)) {
      try {
        const ownerPubkey = new PublicKey(subscriber.walletAddress);
        const onChainBalance = await solanaClient.getSubscriberBalance(ownerPubkey);
        subscriber.balance = Number(onChainBalance) / 1e6;
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
    const subscriber = this.subscribers.get(id);
    if (!subscriber || subscriber.balance < amount) return false;
    subscriber.balance -= amount;
    subscriber.alertsReceived++;
    return true;
  }

  /**
   * Deactivate subscription
   */
  unsubscribe(id: string): boolean {
    const subscriber = this.subscribers.get(id);
    if (!subscriber) return false;
    subscriber.active = false;
    return true;
  }

  /**
   * Stats
   */
  stats() {
    const channelCounts: Record<string, number> = {};
    for (const [channel, subs] of this.byChannel) {
      channelCounts[channel] = subs.size;
    }
    
    const allSubs = Array.from(this.subscribers.values());
    
    return {
      totalSubscribers: this.subscribers.size,
      activeSubscribers: allSubs.filter(s => s.active).length,
      onChainSubscribers: allSubs.filter(s => s.onChain).length,
      byChannel: channelCounts
    };
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();
