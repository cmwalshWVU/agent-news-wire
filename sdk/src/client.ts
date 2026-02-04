import WebSocket from 'ws';
import { Alert, Channel, CHANNEL_NAMES } from './types.js';

export interface ANWClientConfig {
  apiUrl: string;
  wsUrl?: string;
}

export interface Subscription {
  id: string;
  channels: Channel[];
  balance: number;
  createdAt: string;
}

export interface AlertHandler {
  (alert: Alert): void | Promise<void>;
}

export interface WarningHandler {
  (code: string, message: string): void;
}

/**
 * Agent News Wire Client SDK
 * 
 * @example
 * ```typescript
 * const client = new ANWClient({ apiUrl: 'http://localhost:3000' });
 * 
 * // Subscribe to channels
 * const sub = await client.subscribe([Channel.REGULATORY_SEC, Channel.MARKETS_WHALE_MOVEMENTS]);
 * 
 * // Deposit funds
 * await client.deposit(sub.id, 10);
 * 
 * // Connect to real-time stream
 * client.onAlert((alert) => {
 *   console.log('New alert:', alert.headline);
 * });
 * 
 * await client.connect(sub.id);
 * ```
 */
export class ANWClient {
  private config: ANWClientConfig;
  private ws: WebSocket | null = null;
  private alertHandlers: AlertHandler[] = [];
  private warningHandlers: WarningHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscriberId: string | null = null;

  constructor(config: ANWClientConfig) {
    this.config = {
      ...config,
      wsUrl: config.wsUrl || config.apiUrl.replace(/^http/, 'ws'),
    };
  }

  /**
   * Create a new subscription
   */
  async subscribe(channels: Channel[]): Promise<Subscription> {
    const channelNames = channels.map(c => CHANNEL_NAMES[c]);
    
    const response = await fetch(`${this.config.apiUrl}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: channelNames }),
    });

    if (!response.ok) {
      throw new Error(`Subscribe failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.subscriber.id,
      channels,
      balance: data.subscriber.balance,
      createdAt: data.subscriber.createdAt,
    };
  }

  /**
   * Deposit USDC to subscription balance
   */
  async deposit(subscriberId: string, amount: number): Promise<number> {
    const response = await fetch(`${this.config.apiUrl}/api/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberId, amount }),
    });

    if (!response.ok) {
      throw new Error(`Deposit failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.balance;
  }

  /**
   * Check subscription balance
   */
  async getBalance(subscriberId: string): Promise<{
    balance: number;
    alertsReceived: number;
    alertsRemaining: number;
    runway: 'healthy' | 'low' | 'critical';
  }> {
    const response = await fetch(`${this.config.apiUrl}/api/balance/${subscriberId}`);
    
    if (!response.ok) {
      throw new Error(`Get balance failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get historical alerts
   */
  async getAlerts(options: {
    channel?: Channel;
    limit?: number;
    subscriberId?: string;
  } = {}): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (options.channel !== undefined) {
      params.set('channel', CHANNEL_NAMES[options.channel]);
    }
    if (options.limit) {
      params.set('limit', options.limit.toString());
    }
    if (options.subscriberId) {
      params.set('subscriberId', options.subscriberId);
    }

    const response = await fetch(`${this.config.apiUrl}/api/alerts?${params}`);
    
    if (!response.ok) {
      throw new Error(`Get alerts failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.alerts;
  }

  /**
   * Get available channels
   */
  async getChannels(): Promise<Array<{ id: string; name: string; description: string }>> {
    const response = await fetch(`${this.config.apiUrl}/api/channels`);
    
    if (!response.ok) {
      throw new Error(`Get channels failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.channels;
  }

  /**
   * Register alert handler
   */
  onAlert(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Register warning handler
   */
  onWarning(handler: WarningHandler): void {
    this.warningHandlers.push(handler);
  }

  /**
   * Connect to real-time WebSocket stream
   */
  async connect(subscriberId: string): Promise<void> {
    this.subscriberId = subscriberId;
    
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.wsUrl}/api/stream?subscriberId=${subscriberId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[ANW] Connected to stream');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'alert') {
            for (const handler of this.alertHandlers) {
              await handler(message.alert);
            }
          } else if (message.type === 'warning') {
            for (const handler of this.warningHandlers) {
              handler(message.code, message.message);
            }
          }
        } catch (error) {
          console.error('[ANW] Message parse error:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[ANW] Disconnected from stream');
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[ANW] WebSocket error:', error);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from WebSocket stream
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriberId = null;
  }

  /**
   * Update channel subscriptions
   */
  async updateChannels(subscriberId: string, channels: Channel[]): Promise<void> {
    const channelNames = channels.map(c => CHANNEL_NAMES[c]);
    
    const response = await fetch(`${this.config.apiUrl}/api/subscription/${subscriberId}/channels`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: channelNames }),
    });

    if (!response.ok) {
      throw new Error(`Update channels failed: ${response.statusText}`);
    }

    // Also update via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update_channels',
        channels: channelNames,
      }));
    }
  }

  private attemptReconnect(): void {
    if (!this.subscriberId || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[ANW] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.subscriberId) {
        this.connect(this.subscriberId).catch(console.error);
      }
    }, delay);
  }
}
