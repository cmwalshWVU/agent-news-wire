import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const KRAKEN_RSS = 'https://blog.kraken.com/feed';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
}

function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|MATIC|AVAX|DOT|LINK|UNI|AAVE|USDT|USDC)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

function extractEntities(text: string): string[] {
  const entities: string[] = ['Kraken'];
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'Solana', 'Polkadot', 'Cosmos',
    'SEC', 'FinCEN', 'CFTC'
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
  
  if (lower.includes('new listing') || lower.includes('trading')) score += 2;
  if (lower.includes('staking') || lower.includes('earn')) score += 1;
  if (lower.includes('security') || lower.includes('compliance')) score += 1;
  if (lower.includes('product') || lower.includes('feature')) score += 1;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['launch', 'new', 'listing', 'expand', 'grow', 'milestone'];
  const bearishWords = ['suspend', 'delist', 'restrict', 'pause', 'discontinue'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

export async function fetchKrakenNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(KRAKEN_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Kraken RSS fetch failed: ${response.status}`);
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

    for (const item of items.slice(0, 15)) {
      const title = item.title || '';
      const description = item.description?.replace(/<[^>]*>/g, '') || '';
      const link = item.link || '';
      const pubDate = item.pubDate;
      const fullText = `${title} ${description}`;

      const alert: AlertInput = {
        channel: 'exchanges/kraken',
        priority: estimateImpact(fullText) >= 7 ? 'high' : 'medium',
        headline: `Kraken: ${title}`.slice(0, 200),
        summary: description.slice(0, 1000) || title,
        entities: extractEntities(fullText),
        tickers: extractTickers(fullText),
        tokens: [],
        sourceUrl: link,
        sourceType: 'blog_post',
        sentiment: determineSentiment(fullText),
        impactScore: estimateImpact(fullText),
        publishedAt: pubDate,
        rawData: { source: 'kraken' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Kraken] Fetch error:', error);
    return [];
  }
}

export async function testKrakenFetcher() {
  console.log('[Kraken] Testing fetcher...');
  const alerts = await fetchKrakenNews();
  console.log(`[Kraken] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
