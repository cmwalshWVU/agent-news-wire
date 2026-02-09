import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const COINDESK_RSS = 'https://www.coindesk.com/arc/outboundfeeds/rss/';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
  'dc:creator'?: string;
}

/**
 * Extract tickers from text (e.g., BTC, ETH, SOL)
 */
function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|MATIC|AVAX|DOT|LINK|UNI|AAVE|CRV|MKR|SNX|COMP|SUSHI|YFI)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

/**
 * Extract entities from text
 */
function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'Solana', 'Coinbase', 'Binance', 'BlackRock',
    'SEC', 'CFTC', 'Federal Reserve', 'Fed', 'Fidelity', 'Grayscale',
    'MicroStrategy', 'Tesla', 'PayPal', 'Visa', 'Mastercard', 'JPMorgan',
    'Goldman Sachs', 'Circle', 'Tether', 'Ripple', 'Kraken', 'FTX'
  ];
  
  const lower = text.toLowerCase();
  for (const entity of knownEntities) {
    if (lower.includes(entity.toLowerCase())) {
      entities.push(entity);
    }
  }
  
  return [...new Set(entities)];
}

/**
 * Estimate impact score based on content
 */
function estimateImpact(text: string): number {
  let score = 5;
  const lower = text.toLowerCase();
  
  // Major news indicators
  if (lower.includes('breaking') || lower.includes('just in')) score += 2;
  if (lower.includes('sec') || lower.includes('regulatory')) score += 1;
  if (lower.includes('etf') || lower.includes('approved')) score += 2;
  if (lower.includes('billion') || lower.includes('million')) score += 1;
  if (lower.includes('blackrock') || lower.includes('fidelity')) score += 1;
  if (lower.includes('hack') || lower.includes('exploit')) score += 2;
  
  return Math.min(10, score);
}

/**
 * Determine sentiment
 */
function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['surge', 'rally', 'soar', 'gain', 'rise', 'bullish', 'approve', 'adopt', 'launch', 'partnership'];
  const bearishWords = ['crash', 'drop', 'plunge', 'fall', 'hack', 'exploit', 'sue', 'charges', 'fraud', 'ban'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

/**
 * Fetch and parse CoinDesk RSS feed
 */
export async function fetchCoinDeskNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(COINDESK_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`CoinDesk RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xml);
    let items: RSSItem[] = [];
    
    if (result.rss?.channel?.item) {
      items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];
    }

    const alerts: AlertInput[] = [];

    for (const item of items.slice(0, 20)) {
      const title = item.title || '';
      const description = item.description?.replace(/<[^>]*>/g, '') || '';
      const link = item.link || '';
      const pubDate = item.pubDate;
      const fullText = `${title} ${description}`;

      const alert: AlertInput = {
        channel: 'news/coindesk',
        priority: estimateImpact(fullText) >= 7 ? 'high' : 'medium',
        headline: title.slice(0, 200),
        summary: description.slice(0, 1000) || title,
        entities: extractEntities(fullText),
        tickers: extractTickers(fullText),
        tokens: [],
        sourceUrl: link,
        sourceType: 'news_article',
        sentiment: determineSentiment(fullText),
        impactScore: estimateImpact(fullText),
        publishedAt: pubDate,
        rawData: { source: 'coindesk' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[CoinDesk] Fetch error:', error);
    return [];
  }
}

export async function testCoinDeskFetcher() {
  console.log('[CoinDesk] Testing fetcher...');
  const alerts = await fetchCoinDeskNews();
  console.log(`[CoinDesk] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
