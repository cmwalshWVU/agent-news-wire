import { AlertInput } from '../types/index.js';

// Whale Alert API (requires API key for production)
const WHALE_ALERT_API = 'https://api.whale-alert.io/v1/transactions';

// For MVP, we'll use a mock/free tier approach
// In production, you'd use the paid API

interface WhaleTransaction {
  blockchain: string;
  symbol: string;
  transaction_type: string;
  hash: string;
  from: { address: string; owner: string; owner_type: string };
  to: { address: string; owner: string; owner_type: string };
  amount: number;
  amount_usd: number;
  timestamp: number;
}

// Notable wallet labels we care about
const NOTABLE_ENTITIES = [
  'binance', 'coinbase', 'kraken', 'ftx', 'bitfinex', 'okex', 'huobi',
  'blackrock', 'fidelity', 'grayscale', 'microstrategy',
  'tether', 'circle', 'paxos',
  'foundation', 'treasury', 'unknown'
];

/**
 * Determine alert priority based on amount
 */
function getPriority(amountUsd: number): 'low' | 'medium' | 'high' | 'critical' {
  if (amountUsd >= 100_000_000) return 'critical';
  if (amountUsd >= 50_000_000) return 'high';
  if (amountUsd >= 10_000_000) return 'medium';
  return 'low';
}

/**
 * Get sentiment based on transaction type
 */
function getSentiment(tx: WhaleTransaction): 'bullish' | 'bearish' | 'neutral' {
  const fromExchange = tx.from.owner_type === 'exchange';
  const toExchange = tx.to.owner_type === 'exchange';

  if (fromExchange && !toExchange) return 'bullish'; // Withdrawing from exchange
  if (!fromExchange && toExchange) return 'bearish'; // Depositing to exchange
  return 'neutral';
}

/**
 * Format large numbers
 */
function formatAmount(amount: number, symbol: string): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B ${symbol}`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ${symbol}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K ${symbol}`;
  return `${amount.toFixed(2)} ${symbol}`;
}

/**
 * Fetch whale transactions (mock for MVP without API key)
 */
export async function fetchWhaleAlerts(apiKey?: string): Promise<AlertInput[]> {
  // If no API key, return empty (would use mock data in demo)
  if (!apiKey) {
    console.log('[WhaleAlert] No API key configured, skipping');
    return [];
  }

  try {
    const url = `${WHALE_ALERT_API}?api_key=${apiKey}&min_value=1000000&start=${Math.floor(Date.now() / 1000) - 600}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Whale Alert fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const transactions: WhaleTransaction[] = data.transactions || [];

    const alerts: AlertInput[] = [];

    for (const tx of transactions) {
      // Skip small transactions
      if (tx.amount_usd < 5_000_000) continue;

      const priority = getPriority(tx.amount_usd);
      const sentiment = getSentiment(tx);
      
      const fromLabel = tx.from.owner || 'unknown wallet';
      const toLabel = tx.to.owner || 'unknown wallet';
      const amountStr = formatAmount(tx.amount, tx.symbol);
      const usdStr = `$${(tx.amount_usd / 1_000_000).toFixed(1)}M`;

      alerts.push({
        channel: 'markets/whale-movements',
        priority,
        headline: `🐋 ${amountStr} (${usdStr}) moved: ${fromLabel} → ${toLabel}`,
        summary: `${tx.blockchain.toUpperCase()} whale transfer: ${amountStr} worth ${usdStr} moved from ${fromLabel} to ${toLabel}. ${sentiment === 'bullish' ? 'Exchange outflow (bullish signal).' : sentiment === 'bearish' ? 'Exchange inflow (potential sell pressure).' : ''}`,
        entities: [fromLabel, toLabel].filter(e => e !== 'unknown wallet'),
        tickers: [],
        tokens: [tx.symbol],
        sourceUrl: `https://whale-alert.io/transaction/${tx.blockchain}/${tx.hash}`,
        sourceType: 'on_chain',
        sentiment,
        impactScore: priority === 'critical' ? 9 : priority === 'high' ? 7 : priority === 'medium' ? 5 : 3,
        rawData: { tx }
      });
    }

    return alerts;
  } catch (error) {
    console.error('[WhaleAlert] Fetch error:', error);
    return [];
  }
}

/**
 * Generate mock whale alerts for demo purposes
 */
export function generateMockWhaleAlerts(): AlertInput[] {
  const mockTransactions = [
    {
      symbol: 'BTC',
      amount: 2500,
      amount_usd: 240_000_000,
      from: 'Coinbase',
      to: 'unknown wallet',
      blockchain: 'bitcoin'
    },
    {
      symbol: 'ETH',
      amount: 50000,
      amount_usd: 165_000_000,
      from: 'unknown wallet',
      to: 'Binance',
      blockchain: 'ethereum'
    },
    {
      symbol: 'XRP',
      amount: 500_000_000,
      amount_usd: 350_000_000,
      from: 'Ripple',
      to: 'Bitstamp',
      blockchain: 'ripple'
    },
    {
      symbol: 'HBAR',
      amount: 2_000_000_000,
      amount_usd: 180_000_000,
      from: 'Hedera Treasury',
      to: 'Coinbase',
      blockchain: 'hedera'
    },
    {
      symbol: 'USDC',
      amount: 100_000_000,
      amount_usd: 100_000_000,
      from: 'Circle',
      to: 'Kraken',
      blockchain: 'ethereum'
    }
  ];

  return mockTransactions.map(tx => {
    const isExchangeOutflow = ['Coinbase', 'Binance', 'Kraken', 'Bitstamp'].includes(tx.from);
    const sentiment = isExchangeOutflow ? 'bullish' : 'bearish';
    
    return {
      channel: 'markets/whale-movements' as const,
      priority: 'high' as const,
      headline: `🐋 ${formatAmount(tx.amount, tx.symbol)} ($${(tx.amount_usd / 1_000_000).toFixed(0)}M) moved: ${tx.from} → ${tx.to}`,
      summary: `${tx.blockchain.toUpperCase()} whale transfer detected.`,
      entities: [tx.from, tx.to],
      tickers: [],
      tokens: [tx.symbol],
      sourceUrl: `https://whale-alert.io/transaction/${tx.blockchain}/mock`,
      sourceType: 'on_chain' as const,
      sentiment,
      impactScore: 7,
      rawData: { mock: true, tx }
    };
  });
}
