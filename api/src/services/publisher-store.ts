import { v4 as uuid } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { Publisher, PublisherRegisterRequest, PublisherStatus, Channel } from '../types/index.js';
import { database } from './database.js';

interface PublisherRow {
  id: string;
  name: string;
  description: string | null;
  wallet_address: string | null;
  api_key: string;
  api_key_prefix: string;
  channels: string;
  status: string;
  created_at: string;
  alerts_published: number;
  alerts_consumed: number;
  reputation_score: number;
  staked_amount: number;
  on_chain: boolean | number;
  publisher_pda: string | null;
}

/**
 * Persistent publisher store using Knex (SQLite/PostgreSQL)
 * Manages publisher registration, authentication, and reputation
 */
export class PublisherStore {
  private apiKeyCache: Map<string, string> = new Map(); // hash -> publisherId
  private nameCache: Map<string, string> = new Map(); // name -> publisherId
  private walletCache: Map<string, string> = new Map(); // wallet -> publisherId
  private initialized = false;

  /**
   * Initialize caches from database
   */
  async init() {
    if (this.initialized) return;
    
    const db = await database.get();
    const rows = await db('publishers')
      .select('id', 'name', 'api_key', 'wallet_address');

    for (const row of rows) {
      this.apiKeyCache.set(row.api_key, row.id);
      this.nameCache.set(row.name.toLowerCase(), row.id);
      if (row.wallet_address) {
        this.walletCache.set(row.wallet_address, row.id);
      }
    }
    
    console.log(`[PublisherStore] Loaded ${rows.length} publishers`);
    this.initialized = true;
  }

  /**
   * Convert database row to Publisher object
   */
  private rowToPublisher(row: PublisherRow): Publisher {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      walletAddress: row.wallet_address || undefined,
      apiKey: row.api_key,
      apiKeyPrefix: row.api_key_prefix,
      channels: JSON.parse(row.channels) as Channel[],
      status: row.status as PublisherStatus,
      createdAt: row.created_at,
      alertsPublished: row.alerts_published,
      alertsConsumed: row.alerts_consumed,
      reputationScore: row.reputation_score,
      stake: row.staked_amount,
      onChain: Boolean(row.on_chain),
      publisherPDA: row.publisher_pda || undefined
    };
  }

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
   */
  async register(request: PublisherRegisterRequest): Promise<{ publisher: Publisher; apiKey: string }> {
    await this.init();
    const db = await database.get();

    // Check for duplicate name
    if (this.nameCache.has(request.name.toLowerCase())) {
      throw new Error('Publisher name already taken');
    }

    // Check for duplicate wallet
    if (request.walletAddress && this.walletCache.has(request.walletAddress)) {
      throw new Error('Wallet already registered as a publisher');
    }

    const { key, hash, prefix } = this.generateApiKey();

    const publisher: Publisher = {
      id: uuid(),
      name: request.name,
      description: request.description,
      walletAddress: request.walletAddress,
      apiKey: hash,
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

    // Insert into database
    await db('publishers').insert({
      id: publisher.id,
      name: publisher.name,
      description: publisher.description || null,
      wallet_address: publisher.walletAddress || null,
      api_key: publisher.apiKey,
      api_key_prefix: publisher.apiKeyPrefix,
      channels: JSON.stringify(publisher.channels),
      status: publisher.status,
      created_at: publisher.createdAt,
      alerts_published: publisher.alertsPublished,
      alerts_consumed: publisher.alertsConsumed,
      reputation_score: publisher.reputationScore,
      staked_amount: publisher.stake,
      on_chain: publisher.onChain,
      publisher_pda: publisher.publisherPDA || null
    });

    // Update caches
    this.apiKeyCache.set(hash, publisher.id);
    this.nameCache.set(request.name.toLowerCase(), publisher.id);
    if (request.walletAddress) {
      this.walletCache.set(request.walletAddress, publisher.id);
    }

    console.log(`[PublisherStore] Registered: ${publisher.name} (${publisher.id})`);

    return { publisher, apiKey: key };
  }

  /**
   * Authenticate by API key
   */
  async authenticate(apiKey: string): Promise<Publisher | null> {
    await this.init();
    
    if (!apiKey || !apiKey.startsWith('anw_')) {
      return null;
    }

    const hash = this.hashApiKey(apiKey);
    const publisherId = this.apiKeyCache.get(hash);
    
    if (!publisherId) {
      return null;
    }

    const publisher = await this.get(publisherId);
    
    if (!publisher || publisher.status !== 'active') {
      return null;
    }

    return publisher;
  }

  /**
   * Get publisher by ID
   */
  async get(id: string): Promise<Publisher | undefined> {
    const db = await database.get();
    const row = await db('publishers')
      .where('id', id)
      .first() as PublisherRow | undefined;
    
    return row ? this.rowToPublisher(row) : undefined;
  }

  /**
   * Get publisher by name
   */
  async getByName(name: string): Promise<Publisher | undefined> {
    await this.init();
    const id = this.nameCache.get(name.toLowerCase());
    return id ? this.get(id) : undefined;
  }

  /**
   * Check if publisher can post to a channel
   */
  async canPublishTo(publisherId: string, channel: Channel): Promise<boolean> {
    const publisher = await this.get(publisherId);
    if (!publisher || publisher.status !== 'active') {
      return false;
    }
    return publisher.channels.includes(channel);
  }

  /**
   * Increment alerts published counter
   */
  async incrementPublished(publisherId: string): Promise<void> {
    const db = await database.get();
    await db('publishers')
      .where('id', publisherId)
      .increment('alerts_published', 1);
  }

  /**
   * Increment alerts consumed counter
   */
  async incrementConsumed(publisherId: string): Promise<void> {
    const db = await database.get();
    await db('publishers')
      .where('id', publisherId)
      .increment('alerts_consumed', 1)
      .update({
        reputation_score: db.raw('LEAST(100, reputation_score + 0.1)')
      });
  }

  /**
   * Adjust reputation
   */
  async adjustReputation(publisherId: string, delta: number): Promise<void> {
    const db = await database.get();
    
    await db('publishers')
      .where('id', publisherId)
      .update({
        reputation_score: db.raw('GREATEST(0, LEAST(100, reputation_score + ?))', [delta])
      });

    // Check if should be suspended
    const publisher = await this.get(publisherId);
    if (publisher && publisher.reputationScore < 10) {
      await this.setStatus(publisherId, 'suspended');
      console.log(`[PublisherStore] Suspended due to low reputation: ${publisher.name}`);
    }
  }

  /**
   * Update publisher status
   */
  async setStatus(publisherId: string, status: PublisherStatus): Promise<boolean> {
    const db = await database.get();
    const result = await db('publishers')
      .where('id', publisherId)
      .update({ status });
    
    return result > 0;
  }

  /**
   * Add stake
   */
  async addStake(publisherId: string, amount: number): Promise<boolean> {
    const db = await database.get();
    const result = await db('publishers')
      .where('id', publisherId)
      .increment('staked_amount', amount);
    
    return result > 0;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 20): Promise<Array<{
    id: string;
    name: string;
    alertsPublished: number;
    alertsConsumed: number;
    reputationScore: number;
    rank: number;
  }>> {
    const db = await database.get();
    const rows = await db('publishers')
      .select('id', 'name', 'alerts_published', 'alerts_consumed', 'reputation_score')
      .where('status', 'active')
      .orderBy('alerts_consumed', 'desc')
      .limit(limit) as {
        id: string;
        name: string;
        alerts_published: number;
        alerts_consumed: number;
        reputation_score: number;
      }[];

    return rows.map((row, index) => ({
      id: row.id,
      name: row.name,
      alertsPublished: row.alerts_published,
      alertsConsumed: row.alerts_consumed,
      reputationScore: Math.round(row.reputation_score * 10) / 10,
      rank: index + 1
    }));
  }

  /**
   * Stats
   */
  async stats() {
    const db = await database.get();
    
    const [total] = await db('publishers').count('* as count');
    const [active] = await db('publishers').where('status', 'active').count('* as count');
    
    const [agg] = await db('publishers')
      .sum('alerts_published as published')
      .sum('alerts_consumed as consumed')
      .sum('staked_amount as staked');

    return {
      totalPublishers: Number(total.count),
      activePublishers: Number(active.count),
      totalAlertsPublished: Number(agg.published) || 0,
      totalAlertsConsumed: Number(agg.consumed) || 0,
      totalStaked: Number(agg.staked) || 0
    };
  }

  /**
   * List all publishers (public info only)
   */
  async list(limit = 50, includeInactive = false): Promise<Array<Omit<Publisher, 'apiKey'>>> {
    const db = await database.get();
    
    let query = db('publishers').limit(limit);
    if (!includeInactive) {
      query = query.where('status', 'active');
    }
    
    const rows = await query as PublisherRow[];
    
    return rows.map(row => {
      const publisher = this.rowToPublisher(row);
      const { apiKey, ...rest } = publisher;
      return rest;
    });
  }
}

// Singleton instance
export const publisherStore = new PublisherStore();
