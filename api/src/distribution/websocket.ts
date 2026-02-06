import WebSocket from 'ws';
import { Alert, Channel } from '../types/index.js';
import { subscriptionStore, alertStore } from '../services/index.js';
import { getEffectiveConfig, TRIAL_MODE } from '../config/trial.js';

interface WebSocketClient {
  ws: WebSocket;
  subscriberId: string;
  channels: Set<Channel>;
  connectedAt: Date;
}

/**
 * WebSocket distribution server
 */
export class AlertDistributor {
  private clients: Map<string, WebSocketClient> = new Map();
  private alertsSent = 0;
  private revenueGenerated = 0;

  /**
   * Register a new WebSocket connection
   */
  addClient(ws: WebSocket, subscriberId: string, channels: Channel[]) {
    const client: WebSocketClient = {
      ws,
      subscriberId,
      channels: new Set(channels),
      connectedAt: new Date()
    };

    this.clients.set(subscriberId, client);
    console.log(`[WS] Client connected: ${subscriberId}`);
    console.log(`[WS] Subscribed to ${channels.length} channels: ${channels.join(', ')}`);

    // Send welcome message
    const config = getEffectiveConfig();
    this.sendToClient(client, {
      type: 'connected',
      subscriberId,
      channels,
      trialMode: TRIAL_MODE,
      pricePerAlert: config.pricePerAlert,
      message: 'Connected to Agent News Wire'
    });

    // Handle disconnect
    ws.on('close', () => {
      this.clients.delete(subscriberId);
      console.log(`[WS] Client disconnected: ${subscriberId}`);
    });

    ws.on('error', (error: Error) => {
      console.error(`[WS] Client error (${subscriberId}):`, error);
      this.clients.delete(subscriberId);
    });

    // Backfill recent alerts (async)
    this.sendRecentAlerts(client);
  }

  /**
   * Send recent alerts to a newly connected client (backfill)
   */
  private async sendRecentAlerts(client: WebSocketClient, limit = 10) {
    const recentAlerts = await alertStore.getRecent(100);
    let sent = 0;

    for (const alert of recentAlerts) {
      if (sent >= limit) break;
      
      if (!client.channels.has(alert.channel)) continue;

      this.sendToClient(client, {
        type: 'alert',
        alert,
        charged: 0,
        backfill: true
      });
      sent++;
    }

    if (sent > 0) {
      // Increment alertsReceived for backfill alerts
      for (let i = 0; i < sent; i++) {
        await subscriptionStore.incrementAlertsReceived(client.subscriberId);
      }
      console.log(`[WS] Sent ${sent} backfill alerts to ${client.subscriberId}`);
    }
  }

  /**
   * Update client's channel subscriptions
   */
  updateClientChannels(subscriberId: string, channels: Channel[]) {
    const client = this.clients.get(subscriberId);
    if (client) {
      client.channels = new Set(channels);
      this.sendToClient(client, {
        type: 'subscription_updated',
        channels
      });
    }
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(client: WebSocketClient, data: object) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Distribute an alert to all subscribed clients
   */
  async distribute(alert: Alert) {
    console.log(`[WS] distribute() called with alert: ${alert.alertId} (channel: ${alert.channel})`);
    console.log(`[WS] Connected clients: ${this.clients.size}`);
    
    const recipients: string[] = [];
    const config = getEffectiveConfig();
    const pricePerAlert = config.pricePerAlert;

    if (this.clients.size === 0) {
      console.log(`[WS] No connected clients - alert not delivered`);
      return recipients;
    }

    console.log(`[WS] Distributing alert ${alert.alertId} (channel: ${alert.channel}) to ${this.clients.size} connected client(s)`);

    for (const [subscriberId, client] of this.clients) {
      if (!client.channels.has(alert.channel)) {
        console.log(`[WS] Client ${subscriberId} not subscribed to ${alert.channel}`);
        continue;
      }

      if (pricePerAlert > 0) {
        const charged = await subscriptionStore.charge(subscriberId, pricePerAlert);
        if (!charged) {
          this.sendToClient(client, {
            type: 'warning',
            code: 'LOW_BALANCE',
            message: 'Insufficient balance. Please deposit USDC to continue receiving alerts.'
          });
          continue;
        }
      } else {
        await subscriptionStore.incrementAlertsReceived(subscriberId);
      }

      this.sendToClient(client, {
        type: 'alert',
        alert,
        charged: pricePerAlert
      });

      console.log(`[WS] ✅ Delivered alert to ${subscriberId}`);
      recipients.push(subscriberId);
      this.alertsSent++;
      this.revenueGenerated += pricePerAlert;
    }

    if (recipients.length > 0) {
      console.log(`[WS] Distributed alert ${alert.alertId} to ${recipients.length} clients`);
    }

    return recipients;
  }

  /**
   * Broadcast to all clients
   */
  broadcast(message: object) {
    for (const client of this.clients.values()) {
      this.sendToClient(client, message);
    }
  }

  /**
   * Get stats
   */
  stats() {
    return {
      connectedClients: this.clients.size,
      alertsSent: this.alertsSent,
      revenueGenerated: this.revenueGenerated.toFixed(4),
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        subscriberId: id,
        channels: Array.from(client.channels),
        connectedSince: client.connectedAt.toISOString()
      }))
    };
  }
}

// Singleton instance
export const distributor = new AlertDistributor();
