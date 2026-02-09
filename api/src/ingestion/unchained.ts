import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const UNCHAINED_RSS = 'https://unchainedcrypto.com/feed/';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  'dc:creator'?: string;
}

function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|MATIC|AVAX|DOT|LINK|UNI|AAVE|BNB)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const knownEntities = [
    'Bitcoin', 'Ethereum', 'Coinbase', 'Binance', 'SEC', 'CFTC',
    'BlackRock', 'Fidelity', 'Grayscale', 'MicroStrategy',
    'Vitalik Buterin', 'Brian Armstrong', 'CZ', 'Gary Gensler'
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
  
  if (lower.includes('interview') || lower.includes('exclusive')) score += 2;
  if (lower.includes('breaking') || lower.includes('analysis')) score += 1;
  if (lower.includes('sec') || lower.includes('regulatory')) score += 1;
  if (lower.includes('podcast') || lower.includes('episode')) score += 1;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['bullish', 'growth', 'adoption', 'milestone', 'breakthrough'];
  const bearishWords = ['bearish', 'crash', 'risk', 'warning', 'concern', 'lawsuit'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

export async function fetchUnchainedNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(UNCHAINED_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Unchained RSS fetch failed: ${response.status}`);
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
        rawData: { source: 'unchained' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Unchained] Fetch error:', error);
    return [];
  }
}

export async function testUnchainedFetcher() {
  console.log('[Unchained] Testing fetcher...');
  const alerts = await fetchUnchainedNews();
  console.log(`[Unchained] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
