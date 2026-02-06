/**
 * Agent News Wire API Client
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

// Types
export interface Alert {
  alertId: string;
  channel: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  headline: string;
  summary: string;
  entities: string[];
  tickers: string[];
  tokens: string[];
  sourceUrl: string;
  sourceType: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactScore: number;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Subscriber {
  id: string;
  channels: string[];
  balance: number;
  alertsReceived: number;
  active: boolean;
  createdAt: string;
  onChain: boolean;
  walletAddress?: string;
}

export interface Stats {
  alerts: {
    totalAlerts: number;
    byChannel: Record<string, number>;
  };
  subscriptions: {
    totalSubscribers: number;
    activeSubscribers: number;
    onChainSubscribers: number;
  };
  pricing: {
    trialMode: boolean;
    pricePerAlert: number;
    pricePerQuery: number;
    publisherStake: number;
    note: string;
  };
  onChain: {
    totalSubscribers: number;
    totalAlertsDelivered: number;
    totalRevenue: number;
    pricePerAlert: number;
    network: string;
  };
}

export interface PDAInfo {
  walletAddress: string;
  subscriberPDA: string;
  vaultPDA: string;
  existsOnChain: boolean;
  subscriber: {
    channels: number;
    balance: number;
    alertsReceived: number;
    active: boolean;
  } | null;
}

export interface CreateTxResponse {
  success: boolean;
  transaction: string;
  subscriberPDA: string;
  message: string;
  channels: string[];
  channelBitmap: number;
}

// API Functions
export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_URL}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchChannels(): Promise<{ channels: Channel[] }> {
  const res = await fetch(`${API_URL}/api/channels`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  return res.json();
}

export async function fetchAlerts(channel?: string, limit = 50): Promise<{ alerts: Alert[] }> {
  const params = new URLSearchParams();
  if (channel) params.set('channel', channel);
  params.set('limit', limit.toString());
  
  const res = await fetch(`${API_URL}/api/alerts?${params}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function createSubscription(channels: string[], walletAddress?: string): Promise<{
  success: boolean;
  subscriber: Subscriber;
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels, walletAddress }),
  });
  if (!res.ok) throw new Error('Failed to create subscription');
  return res.json();
}

export async function getSubscription(id: string): Promise<Subscriber> {
  const res = await fetch(`${API_URL}/api/subscription/${id}`);
  if (!res.ok) throw new Error('Failed to fetch subscription');
  return res.json();
}

export async function getBalance(id: string): Promise<{
  subscriberId: string;
  balance: number;
  alertsReceived: number;
  alertsRemaining: number | 'unlimited';
  pricePerAlert: number;
  trialMode: boolean;
  runway: string;
}> {
  const res = await fetch(`${API_URL}/api/balance/${id}`);
  if (!res.ok) throw new Error('Failed to fetch balance');
  return res.json();
}

export async function getPDAInfo(walletAddress: string): Promise<PDAInfo> {
  const res = await fetch(`${API_URL}/api/subscription/pda/${walletAddress}`);
  if (!res.ok) throw new Error('Failed to fetch PDA info');
  return res.json();
}

export async function buildCreateTx(walletAddress: string, channels: string[]): Promise<CreateTxResponse> {
  const res = await fetch(`${API_URL}/api/subscription/create-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, channels }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to build transaction');
  }
  return res.json();
}

export async function buildDepositTx(walletAddress: string, amount: number): Promise<{
  success: boolean;
  transaction: string;
  subscriberVault: string;
  amount: number;
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/subscription/deposit-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, amount }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to build deposit transaction');
  }
  return res.json();
}

// WebSocket
export function createAlertWebSocket(
  subscriberId: string,
  onAlert: (alert: Alert) => void,
  onError?: (error: string) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): WebSocket {
  const ws = new WebSocket(`${WS_URL}/api/stream?subscriberId=${subscriberId}`);
  
  ws.onopen = () => {
    console.log('[WS] Connected');
    onConnect?.();
  };
  
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'alert') {
        // Backend sends alert data as 'alert' or 'data'
        onAlert(msg.alert || msg.data);
      } else if (msg.type === 'error') {
        onError?.(msg.message);
      }
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };
  
  ws.onerror = (error) => {
    console.error('[WS] Error:', error);
    onError?.('WebSocket error');
  };
  
  ws.onclose = () => {
    console.log('[WS] Disconnected');
    onDisconnect?.();
  };
  
  return ws;
}
