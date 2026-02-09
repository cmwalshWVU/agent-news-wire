import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const CRYPTOPOTATO_RSS = 'https://cryptopotato.com/feed/';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
}

function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|SHIB|MATIC|AVAX|DOT|LINK|UNI|AAVE|BNB|LTC|PEPE)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'Solana', 'Ripple', 'Dogecoin', 'Shiba Inu',
    'Coinbase', 'Binance', 'Kraken', 'Robinhood',
    'SEC', 'Grayscale', 'MicroStrategy', 'Tesla',
    'Elon Musk', 'Michael Saylor', 'CZ', 'Vitalik'
  ];
  
  const lower = text.toLowerCase();
  for (const entity of knownEntities) {
    if (lower.includes(entity.toLowerCase())) {
      entities.push(entity);
    }
  }
  
  return [...new Set(entities)];
}

function estimateImpact(text: string): number {
  let score = 5;
  const lower = text.toLowerCase();
  
  if (lower.includes('price prediction') || lower.includes('analysis')) score += 1;
  if (lower.includes('breaking') || lower.includes('urgent')) score += 2;
  if (lower.includes('whale') || lower.includes('billion')) score += 1;
  if (lower.includes('crash') || lower.includes('surge')) score += 1;
  if (lower.includes('etf') || lower.includes('sec')) score += 1;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['surge', 'rally', 'soar', 'pump', 'moon', 'bullish', 'buy', 'accumulate'];
  const bearishWords = ['crash', 'dump', 'plunge', 'bearish', 'sell', 'drop', 'warning'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

export async function fetchCryptoPotatoNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(CRYPTOPOTATO_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`CryptoPotato RSS fetch failed: ${response.status}`);
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
        channel: 'news/markets',
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
        rawData: { source: 'cryptopotato' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[CryptoPotato] Fetch error:', error);
    return [];
  }
}

export async function testCryptoPotatoFetcher() {
  console.log('[CryptoPotato] Testing fetcher...');
  const alerts = await fetchCryptoPotatoNews();
  console.log(`[CryptoPotato] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
