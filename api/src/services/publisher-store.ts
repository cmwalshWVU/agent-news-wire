import { v4 as uuid } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { Publisher, PublisherRegisterRequest, PublisherStatus, Channel } from '../types/index.js';

/**
 * Publisher store for agent-based alert publishing.
 * 
 * Manages publisher registration, authentication, and reputation.
 * MVP: In-memory storage
 * Production: Database + on-chain PDAs
 */
export class PublisherStore {
  private publishers: Map<string, Publisher> = new Map();
  private byApiKeyHash: Map<string, string> = new Map(); // hash -> publisherId
  private byName: Map<string, string> = new Map(); // name -> publisherId
  private byWallet: Map<string, string> = new Map(); // wallet -> publisherId

  /**
   * Generate a secure API key
   */
  private generateApiKey(): { key: string; hash: string; prefix: string } {
    const key = `anw_${randomBytes(32).toString('hex')}`;
    const hash = createHash('sha256').update(key).digest('hex');
    const prefix = key.slice(0, 12);
    return { key, hash, prefix };
  }

  /**
   * Hash an API key for lookup
   */
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Register a new publisher
   * Returns the publisher object WITH the raw API key (only time it's shown)
   */
  register(request: PublisherRegisterRequest): { publisher: Publisher; apiKey: string } {
    // Check for duplicate name
    if (this.byName.has(request.name.toLowerCase())) {
      throw new Error('Publisher name already taken');
    }

    // Check for duplicate wallet
    if (request.walletAddress && this.byWallet.has(request.walletAddress)) {
      throw new Error('Wallet already registered as a publisher');
    }

    const { key, hash, prefix } = this.generateApiKey();

    const publisher: Publisher = {
      id: uuid(),
      name: request.name,
      description: request.description,
      walletAddress: request.walletAddress,
      apiKey: hash, // Store only the hash
      apiKeyPrefix: prefix,
      channels: request.channels,
      status: 'active',
      createdAt: new Date().toISOString(),
      alertsPublished: 0,
      alertsConsumed: 0,
      reputationScore: 50,
      stake: 0,
      onChain: false
    };

    this.publishers.set(publisher.id, publisher);
    this.byApiKeyHash.set(hash, publisher.id);
    this.byName.set(request.name.toLowerCase(), publisher.id);
    if (request.walletAddress) {
      this.byWallet.set(request.walletAddress, publisher.id);
    }

    console.log(`[PublisherStore] Registered new publisher: ${publisher.name} (${publisher.id})`);

    return { publisher, apiKey: key };
  }

  /**
   * Authenticate by API key
   * Returns the publisher if valid, null otherwise
   */
  authenticate(apiKey: string): Publisher | null {
    if (!apiKey || !apiKey.startsWith('anw_')) {
      return null;
    }

    const hash = this.hashApiKey(apiKey);
    const publisherId = this.byApiKeyHash.get(hash);
    
    if (!publisherId) {
      return null;
    }

    const publisher = this.publishers.get(publisherId);
    
    if (!publisher || publisher.status !== 'active') {
      return null;
    }

    return publisher;
  }

  /**
   * Get publisher by ID
   */
  get(id: string): Publisher | undefined {
    return this.publishers.get(id);
  }

  /**
   * Get publisher by name
   */
  getByName(name: string): Publisher | undefined {
    const id = this.byName.get(name.toLowerCase());
    return id ? this.publishers.get(id) : undefined;
  }

  /**
   * Check if publisher can post to a channel
   */
  canPublishTo(publisherId: string, channel: Channel): boolean {
    const publisher = this.publishers.get(publisherId);
    if (!publisher || publisher.status !== 'active') {
      return false;
    }
    return publisher.channels.includes(channel);
  }

  /**
   * Increment alerts published counter
   */
  incrementPublished(publisherId: string): void {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      publisher.alertsPublished++;
    }
  }

  /**
   * Increment alerts consumed counter (called when an alert is delivered)
   */
  incrementConsumed(publisherId: string): void {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      publisher.alertsConsumed++;
      // Increase reputation slightly for consumed alerts
      publisher.reputationScore = Math.min(100, publisher.reputationScore + 0.1);
    }
  }

  /**
   * Adjust reputation (positive or negative)
   */
  adjustReputation(publisherId: string, delta: number): void {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      publisher.reputationScore = Math.max(0, Math.min(100, publisher.reputationScore + delta));
      
      // Auto-suspend if reputation drops too low
      if (publisher.reputationScore < 10) {
        publisher.status = 'suspended';
        console.log(`[PublisherStore] Suspended publisher due to low reputation: ${publisher.name}`);
      }
    }
  }

  /**
   * Update publisher status
   */
  setStatus(publisherId: string, status: PublisherStatus): boolean {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) return false;
    publisher.status = status;
    return true;
  }

  /**
   * Add stake (USDC)
   */
  addStake(publisherId: string, amount: number): boolean {
    const publisher = this.publishers.get(publisherId);
    if (!publisher) return false;
    publisher.stake += amount;
    return true;
  }

  /**
   * Get leaderboard (top publishers by consumption)
   */
  getLeaderboard(limit = 20): Array<{
    id: string;
    name: string;
    alertsPublished: number;
    alertsConsumed: number;
    reputationScore: number;
    rank: number;
  }> {
    return Array.from(this.publishers.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => b.alertsConsumed - a.alertsConsumed)
      .slice(0, limit)
      .map((p, index) => ({
        id: p.id,
        name: p.name,
        alertsPublished: p.alertsPublished,
        alertsConsumed: p.alertsConsumed,
        reputationScore: Math.round(p.reputationScore * 10) / 10,
        rank: index + 1
      }));
  }

  /**
   * Stats
   */
  stats() {
    const all = Array.from(this.publishers.values());
    return {
      totalPublishers: this.publishers.size,
      activePublishers: all.filter(p => p.status === 'active').length,
      totalAlertsPublished: all.reduce((sum, p) => sum + p.alertsPublished, 0),
      totalAlertsConsumed: all.reduce((sum, p) => sum + p.alertsConsumed, 0),
      totalStaked: all.reduce((sum, p) => sum + p.stake, 0)
    };
  }

  /**
   * List all publishers (public info only)
   */
  list(limit = 50, includeInactive = false): Array<Omit<Publisher, 'apiKey'>> {
    return Array.from(this.publishers.values())
      .filter(p => includeInactive || p.status === 'active')
      .slice(0, limit)
      .map(({ apiKey, ...rest }) => rest);
  }
}

// Singleton instance
export const publisherStore = new PublisherStore();
