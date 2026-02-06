import { v4 as uuid } from 'uuid';
import { Alert, AlertInput, Channel } from '../types/index.js';
import { database } from './database.js';

interface AlertRow {
  alert_id: string;
  channel: string;
  priority: string;
  timestamp: string;
  headline: string;
  summary: string;
  entities: string;
  tickers: string;
  tokens: string;
  source_url: string;
  source_type: string;
  sentiment: string | null;
  impact_score: number | null;
  raw_data: string | null;
  publisher_id: string | null;
  publisher_name: string | null;
  hash: string;
}

/**
 * Persistent alert store using Knex (SQLite/PostgreSQL)
 * Stores alerts with deduplication
 */
export class AlertStore {
  private maxAlerts = 10000;

  /**
   * Convert database row to Alert object
   */
  private rowToAlert(row: AlertRow): Alert {
    return {
      alertId: row.alert_id,
      channel: row.channel as Channel,
      priority: row.priority as Alert['priority'],
      timestamp: row.timestamp,
      headline: row.headline,
      summary: row.summary,
      entities: JSON.parse(row.entities),
      tickers: JSON.parse(row.tickers),
      tokens: JSON.parse(row.tokens),
      sourceUrl: row.source_url,
      sourceType: row.source_type as Alert['sourceType'],
      sentiment: row.sentiment as Alert['sentiment'] | undefined,
      impactScore: row.impact_score || undefined,
      rawData: row.raw_data ? JSON.parse(row.raw_data) : undefined,
      publisherId: row.publisher_id || undefined,
      publisherName: row.publisher_name || undefined
    };
  }

  /**
   * Create a hash for deduplication
   */
  private hashAlert(input: AlertInput): string {
    return `${input.sourceUrl}:${input.headline}`;
  }

  /**
   * Check if we've already processed this alert
   */
  async isDuplicate(input: AlertInput): Promise<boolean> {
    const db = await database.get();
    const hash = this.hashAlert(input);
    const row = await db('alert_hashes').where('hash', hash).first();
    return !!row;
  }

  /**
   * Add a new alert
   */
  async add(input: AlertInput): Promise<Alert | null> {
    const db = await database.get();
    const hash = this.hashAlert(input);
    
    // Check for duplicate
    if (await this.isDuplicate(input)) {
      return null;
    }

    // Use original publication time if available
    const timestamp = input.publishedAt 
      ? new Date(input.publishedAt).toISOString()
      : new Date().toISOString();

    const { publishedAt, ...alertData } = input;

    const alert: Alert = {
      ...alertData,
      alertId: `wire-${Date.now()}-${uuid().slice(0, 8)}`,
      timestamp
    };

    try {
      // Insert alert
      await db('alerts').insert({
        alert_id: alert.alertId,
        channel: alert.channel,
        priority: alert.priority,
        timestamp: alert.timestamp,
        headline: alert.headline?.slice(0, 500),
        summary: alert.summary,
        entities: JSON.stringify(alert.entities),
        tickers: JSON.stringify(alert.tickers),
        tokens: JSON.stringify(alert.tokens),
        source_url: alert.sourceUrl?.slice(0, 500),
        source_type: alert.sourceType,
        sentiment: alert.sentiment || null,
        impact_score: alert.impactScore ? Math.round(alert.impactScore) : null,
        raw_data: alert.rawData ? JSON.stringify(alert.rawData) : null,
        publisher_id: alert.publisherId || null,
        publisher_name: alert.publisherName || null,
        content_hash: hash.slice(0, 255)
      });

      // Insert hash for deduplication
      await db('alert_hashes').insert({
        hash,
        created_at: new Date().toISOString()
      }).onConflict('hash').ignore();
    } catch (err: any) {
      // Duplicate key error - alert already exists
      if (err.code === '23505') {
        return null;
      }
      throw err;
    }

    // Cleanup old alerts if over limit
    await this.cleanup();

    return alert;
  }

  /**
   * Get alerts by channel
   */
  async getByChannel(channel: Channel, limit = 50): Promise<Alert[]> {
    const db = await database.get();
    const rows = await db('alerts')
      .where('channel', channel)
      .orderBy('timestamp', 'desc')
      .limit(limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get recent alerts across all channels
   */
  async getRecent(limit = 50): Promise<Alert[]> {
    const db = await database.get();
    const rows = await db('alerts')
      .orderBy('timestamp', 'desc')
      .limit(limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get alert by ID
   */
  async get(alertId: string): Promise<Alert | undefined> {
    const db = await database.get();
    const row = await db('alerts')
      .where('alert_id', alertId)
      .first() as AlertRow | undefined;
    
    return row ? this.rowToAlert(row) : undefined;
  }

  /**
   * Search alerts by keyword
   */
  async search(query: string, limit = 50): Promise<Alert[]> {
    const db = await database.get();
    const searchTerm = `%${query}%`;
    
    const rows = await db('alerts')
      .where('headline', 'like', searchTerm)
      .orWhere('summary', 'like', searchTerm)
      .orderBy('timestamp', 'desc')
      .limit(limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get alerts by publisher
   */
  async getByPublisher(publisherId: string, limit = 50): Promise<Alert[]> {
    const db = await database.get();
    const rows = await db('alerts')
      .where('publisher_id', publisherId)
      .orderBy('timestamp', 'desc')
      .limit(limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Cleanup old alerts
   */
  private async cleanup() {
    const db = await database.get();
    const [{ count }] = await db('alerts').count('* as count');
    
    if (Number(count) > this.maxAlerts) {
      const toDelete = Number(count) - this.maxAlerts;
      
      // Get oldest alert IDs to delete
      const oldestAlerts = await db('alerts')
        .select('alert_id')
        .orderBy('timestamp', 'asc')
        .limit(toDelete);
      
      const idsToDelete = oldestAlerts.map(a => a.alert_id);
      
      await db('alerts').whereIn('alert_id', idsToDelete).del();

      // Cleanup old hashes (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await db('alert_hashes').where('created_at', '<', sevenDaysAgo).del();

      console.log(`[AlertStore] Cleaned up ${toDelete} old alerts`);
    }
  }

  /**
   * Stats
   */
  async stats() {
    const db = await database.get();
    
    const [total] = await db('alerts').count('* as count');
    const [hashes] = await db('alert_hashes').count('* as count');
    
    // Channel counts
    const channelRows = await db('alerts')
      .select('channel')
      .count('* as count')
      .groupBy('channel') as { channel: string; count: number }[];
    
    const byChannel: Record<string, number> = {};
    for (const row of channelRows) {
      byChannel[row.channel] = Number(row.count);
    }

    return {
      totalAlerts: Number(total.count),
      uniqueHashes: Number(hashes.count),
      byChannel
    };
  }
}

// Singleton instance
export const alertStore = new AlertStore();
