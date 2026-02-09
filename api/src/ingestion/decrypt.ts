import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const DECRYPT_RSS = 'https://decrypt.co/feed';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
}

function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|MATIC|AVAX|DOT|LINK|UNI|AAVE|BNB|ARB|OP|APT|SUI)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'Solana', 'OpenAI', 'Microsoft', 'Google', 'Apple',
    'Coinbase', 'Binance', 'Kraken', 'Uniswap', 'OpenSea', 'Blur',
    'Yuga Labs', 'Bored Ape', 'CryptoPunks', 'Pudgy Penguins',
    'SEC', 'Elon Musk', 'Sam Altman', 'Vitalik', 'CZ'
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
  
  if (lower.includes('breaking') || lower.includes('exclusive')) score += 2;
  if (lower.includes('nft') || lower.includes('gaming') || lower.includes('metaverse')) score += 1;
  if (lower.includes('ai') || lower.includes('artificial intelligence')) score += 1;
  if (lower.includes('hack') || lower.includes('exploit')) score += 2;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['launch', 'release', 'announce', 'partnership', 'milestone', 'record'];
  const bearishWords = ['hack', 'scam', 'fraud', 'crash', 'layoff', 'shutdown'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

export async function fetchDecryptNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(DECRYPT_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Decrypt RSS fetch failed: ${response.status}`);
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
        channel: 'news/general',
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
        rawData: { source: 'decrypt' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Decrypt] Fetch error:', error);
    return [];
  }
}

export async function testDecryptFetcher() {
  console.log('[Decrypt] Testing fetcher...');
  const alerts = await fetchDecryptNews();
  console.log(`[Decrypt] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
