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
 * Persistent alert store using SQLite
 * Stores alerts with deduplication
 */
export class AlertStore {
  private maxAlerts = 10000; // Max alerts to keep in database

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
  isDuplicate(input: AlertInput): boolean {
    const db = database.get();
    const hash = this.hashAlert(input);
    const row = db.prepare('SELECT 1 FROM alert_hashes WHERE hash = ?').get(hash);
    return !!row;
  }

  /**
   * Add a new alert
   */
  add(input: AlertInput): Alert | null {
    const db = database.get();
    const hash = this.hashAlert(input);
    
    // Check for duplicate
    if (this.isDuplicate(input)) {
      return null;
    }

    // Use original publication time if available, otherwise use now
    const timestamp = input.publishedAt 
      ? new Date(input.publishedAt).toISOString()
      : new Date().toISOString();

    // Remove publishedAt from input before creating alert
    const { publishedAt, ...alertData } = input;

    const alert: Alert = {
      ...alertData,
      alertId: `wire-${Date.now()}-${uuid().slice(0, 8)}`,
      timestamp
    };

    // Insert alert
    const insertAlert = db.prepare(`
      INSERT INTO alerts (
        alert_id, channel, priority, timestamp, headline, summary,
        entities, tickers, tokens, source_url, source_type,
        sentiment, impact_score, raw_data, publisher_id, publisher_name, hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAlert.run(
      alert.alertId,
      alert.channel,
      alert.priority,
      alert.timestamp,
      alert.headline,
      alert.summary,
      JSON.stringify(alert.entities),
      JSON.stringify(alert.tickers),
      JSON.stringify(alert.tokens),
      alert.sourceUrl,
      alert.sourceType,
      alert.sentiment || null,
      alert.impactScore || null,
      alert.rawData ? JSON.stringify(alert.rawData) : null,
      alert.publisherId || null,
      alert.publisherName || null,
      hash
    );

    // Insert hash for deduplication
    db.prepare('INSERT INTO alert_hashes (hash, alert_id, created_at) VALUES (?, ?, ?)').run(
      hash,
      alert.alertId,
      new Date().toISOString()
    );

    // Cleanup old alerts if over limit
    this.cleanup();

    return alert;
  }

  /**
   * Get alerts by channel
   */
  getByChannel(channel: Channel, limit = 50): Alert[] {
    const db = database.get();
    const rows = db.prepare(`
      SELECT * FROM alerts 
      WHERE channel = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(channel, limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get recent alerts across all channels
   */
  getRecent(limit = 50): Alert[] {
    const db = database.get();
    const rows = db.prepare(`
      SELECT * FROM alerts 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get alert by ID
   */
  get(alertId: string): Alert | undefined {
    const db = database.get();
    const row = db.prepare('SELECT * FROM alerts WHERE alert_id = ?').get(alertId) as AlertRow | undefined;
    return row ? this.rowToAlert(row) : undefined;
  }

  /**
   * Search alerts by keyword
   */
  search(query: string, limit = 50): Alert[] {
    const db = database.get();
    const searchTerm = `%${query}%`;
    const rows = db.prepare(`
      SELECT * FROM alerts 
      WHERE headline LIKE ? OR summary LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(searchTerm, searchTerm, limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Get alerts by publisher
   */
  getByPublisher(publisherId: string, limit = 50): Alert[] {
    const db = database.get();
    const rows = db.prepare(`
      SELECT * FROM alerts 
      WHERE publisher_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(publisherId, limit) as AlertRow[];
    
    return rows.map(row => this.rowToAlert(row));
  }

  /**
   * Cleanup old alerts to keep database size manageable
   */
  private cleanup() {
    const db = database.get();
    const count = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    
    if (count.count > this.maxAlerts) {
      const toDelete = count.count - this.maxAlerts;
      
      // Delete oldest alerts
      db.prepare(`
        DELETE FROM alerts WHERE alert_id IN (
          SELECT alert_id FROM alerts ORDER BY timestamp ASC LIMIT ?
        )
      `).run(toDelete);

      // Cleanup orphaned hashes (older than 7 days)
      db.prepare(`
        DELETE FROM alert_hashes 
        WHERE created_at < datetime('now', '-7 days')
      `).run();

      console.log(`[AlertStore] Cleaned up ${toDelete} old alerts`);
    }
  }

  /**
   * Stats
   */
  stats() {
    const db = database.get();
    
    const total = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    const hashes = db.prepare('SELECT COUNT(*) as count FROM alert_hashes').get() as { count: number };
    
    // Channel counts
    const channelRows = db.prepare(`
      SELECT channel, COUNT(*) as count FROM alerts GROUP BY channel
    `).all() as { channel: string; count: number }[];
    
    const byChannel: Record<string, number> = {};
    for (const row of channelRows) {
      byChannel[row.channel] = row.count;
    }

    return {
      totalAlerts: total.count,
      uniqueHashes: hashes.count,
      byChannel
    };
  }
}

// Singleton instance
export const alertStore = new AlertStore();
