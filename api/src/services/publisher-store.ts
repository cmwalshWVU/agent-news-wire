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
  stake: number;
  on_chain: number;
  publisher_pda: string | null;
}

/**
 * Persistent publisher store using SQLite
 * Manages publisher registration, authentication, and reputation
 */
export class PublisherStore {
  // In-memory caches for fast lookups
  private byApiKeyHash: Map<string, string> = new Map(); // hash -> publisherId
  private byName: Map<string, string> = new Map(); // name -> publisherId
  private byWallet: Map<string, string> = new Map(); // wallet -> publisherId

  constructor() {
    this.loadCaches();
  }

  /**
   * Load caches from database
   */
  private loadCaches() {
    const db = database.get();
    const rows = db.prepare('SELECT id, name, api_key, wallet_address FROM publishers').all() as {
      id: string;
      name: string;
      api_key: string;
      wallet_address: string | null;
    }[];

    for (const row of rows) {
      this.byApiKeyHash.set(row.api_key, row.id);
      this.byName.set(row.name.toLowerCase(), row.id);
      if (row.wallet_address) {
        this.byWallet.set(row.wallet_address, row.id);
      }
    }
    console.log(`[PublisherStore] Loaded ${rows.length} publishers from database`);
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
      stake: row.stake,
      onChain: row.on_chain === 1,
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
   * Returns the publisher object WITH the raw API key (only time it's shown)
   */
  register(request: PublisherRegisterRequest): { publisher: Publisher; apiKey: string } {
    const db = database.get();

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
    const stmt = db.prepare(`
      INSERT INTO publishers (
        id, name, description, wallet_address, api_key, api_key_prefix,
        channels, status, created_at, alerts_published, alerts_consumed,
        reputation_score, stake, on_chain, publisher_pda
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      publisher.id,
      publisher.name,
      publisher.description || null,
      publisher.walletAddress || null,
      publisher.apiKey,
      publisher.apiKeyPrefix,
      JSON.stringify(publisher.channels),
      publisher.status,
      publisher.createdAt,
      publisher.alertsPublished,
      publisher.alertsConsumed,
      publisher.reputationScore,
      publisher.stake,
      publisher.onChain ? 1 : 0,
      publisher.publisherPDA || null
    );

    // Update caches
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

    const publisher = this.get(publisherId);
    
    if (!publisher || publisher.status !== 'active') {
      return null;
    }

    return publisher;
  }

  /**
   * Get publisher by ID
   */
  get(id: string): Publisher | undefined {
    const db = database.get();
    const row = db.prepare('SELECT * FROM publishers WHERE id = ?').get(id) as PublisherRow | undefined;
    return row ? this.rowToPublisher(row) : undefined;
  }

  /**
   * Get publisher by name
   */
  getByName(name: string): Publisher | undefined {
    const id = this.byName.get(name.toLowerCase());
    return id ? this.get(id) : undefined;
  }

  /**
   * Check if publisher can post to a channel
   */
  canPublishTo(publisherId: string, channel: Channel): boolean {
    const publisher = this.get(publisherId);
    if (!publisher || publisher.status !== 'active') {
      return false;
    }
    return publisher.channels.includes(channel);
  }

  /**
   * Increment alerts published counter
   */
  incrementPublished(publisherId: string): void {
    const db = database.get();
    db.prepare('UPDATE publishers SET alerts_published = alerts_published + 1 WHERE id = ?').run(publisherId);
  }

  /**
   * Increment alerts consumed counter
   */
  incrementConsumed(publisherId: string): void {
    const db = database.get();
    db.prepare(`
      UPDATE publishers 
      SET alerts_consumed = alerts_consumed + 1,
          reputation_score = MIN(100, reputation_score + 0.1)
      WHERE id = ?
    `).run(publisherId);
  }

  /**
   * Adjust reputation
   */
  adjustReputation(publisherId: string, delta: number): void {
    const db = database.get();
    
    // Update reputation and potentially suspend
    db.prepare(`
      UPDATE publishers 
      SET reputation_score = MAX(0, MIN(100, reputation_score + ?)),
          status = CASE WHEN MAX(0, MIN(100, reputation_score + ?)) < 10 THEN 'suspended' ELSE status END
      WHERE id = ?
    `).run(delta, delta, publisherId);

    const publisher = this.get(publisherId);
    if (publisher && publisher.reputationScore < 10) {
      console.log(`[PublisherStore] Suspended publisher due to low reputation: ${publisher.name}`);
    }
  }

  /**
   * Update publisher status
   */
  setStatus(publisherId: string, status: PublisherStatus): boolean {
    const db = database.get();
    const result = db.prepare('UPDATE publishers SET status = ? WHERE id = ?').run(status, publisherId);
    return result.changes > 0;
  }

  /**
   * Add stake
   */
  addStake(publisherId: string, amount: number): boolean {
    const db = database.get();
    const result = db.prepare('UPDATE publishers SET stake = stake + ? WHERE id = ?').run(amount, publisherId);
    return result.changes > 0;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit = 20): Array<{
    id: string;
    name: string;
    alertsPublished: number;
    alertsConsumed: number;
    reputationScore: number;
    rank: number;
  }> {
    const db = database.get();
    const rows = db.prepare(`
      SELECT id, name, alerts_published, alerts_consumed, reputation_score
      FROM publishers
      WHERE status = 'active'
      ORDER BY alerts_consumed DESC
      LIMIT ?
    `).all(limit) as {
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
  stats() {
    const db = database.get();
    
    const total = db.prepare('SELECT COUNT(*) as count FROM publishers').get() as { count: number };
    const active = db.prepare("SELECT COUNT(*) as count FROM publishers WHERE status = 'active'").get() as { count: number };
    const agg = db.prepare(`
      SELECT 
        COALESCE(SUM(alerts_published), 0) as published,
        COALESCE(SUM(alerts_consumed), 0) as consumed,
        COALESCE(SUM(stake), 0) as staked
      FROM publishers
    `).get() as { published: number; consumed: number; staked: number };

    return {
      totalPublishers: total.count,
      activePublishers: active.count,
      totalAlertsPublished: agg.published,
      totalAlertsConsumed: agg.consumed,
      totalStaked: agg.staked
    };
  }

  /**
   * List all publishers (public info only)
   */
  list(limit = 50, includeInactive = false): Array<Omit<Publisher, 'apiKey'>> {
    const db = database.get();
    const query = includeInactive
      ? 'SELECT * FROM publishers LIMIT ?'
      : "SELECT * FROM publishers WHERE status = 'active' LIMIT ?";
    
    const rows = db.prepare(query).all(limit) as PublisherRow[];
    
    return rows.map(row => {
      const publisher = this.rowToPublisher(row);
      const { apiKey, ...rest } = publisher;
      return rest;
    });
  }
}

// Singleton instance
export const publisherStore = new PublisherStore();
