import { v4 as uuid } from 'uuid';
import { Alert, AlertInput, Channel } from '../types/index.js';

/**
 * In-memory alert store. 
 * MVP: keeps last N alerts per channel.
 * Production: would use a database.
 */
export class AlertStore {
  private alerts: Map<string, Alert> = new Map();
  private byChannel: Map<Channel, Alert[]> = new Map();
  private seenHashes: Set<string> = new Set();
  private maxPerChannel = 1000;

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
    return this.seenHashes.has(this.hashAlert(input));
  }

  /**
   * Add a new alert
   */
  add(input: AlertInput): Alert | null {
    const hash = this.hashAlert(input);
    if (this.seenHashes.has(hash)) {
      return null; // Duplicate
    }

    // Use original publication time if available, otherwise use now
    const timestamp = input.publishedAt 
      ? new Date(input.publishedAt).toISOString()
      : new Date().toISOString();

    // Remove publishedAt from input before spreading (it's not part of Alert type)
    const { publishedAt, ...alertData } = input;

    const alert: Alert = {
      ...alertData,
      alertId: `wire-${Date.now()}-${uuid().slice(0, 8)}`,
      timestamp
    };

    this.alerts.set(alert.alertId, alert);
    this.seenHashes.add(hash);

    // Add to channel index
    const channelAlerts = this.byChannel.get(alert.channel) || [];
    channelAlerts.unshift(alert);
    
    // Trim if over limit
    if (channelAlerts.length > this.maxPerChannel) {
      const removed = channelAlerts.pop();
      if (removed) {
        this.alerts.delete(removed.alertId);
      }
    }
    
    this.byChannel.set(alert.channel, channelAlerts);

    return alert;
  }

  /**
   * Get alerts by channel
   */
  getByChannel(channel: Channel, limit = 50): Alert[] {
    return (this.byChannel.get(channel) || []).slice(0, limit);
  }

  /**
   * Get recent alerts across all channels
   */
  getRecent(limit = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get alert by ID
   */
  get(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Stats
   */
  stats() {
    const channelCounts: Record<string, number> = {};
    for (const [channel, alerts] of this.byChannel) {
      channelCounts[channel] = alerts.length;
    }
    return {
      totalAlerts: this.alerts.size,
      uniqueHashes: this.seenHashes.size,
      byChannel: channelCounts
    };
  }
}

// Singleton instance
export const alertStore = new AlertStore();
