import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const DEFIANT_RSS = 'https://thedefiant.io/feed/';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  'dc:creator'?: string;
  'content:encoded'?: string;
}

function extractTickers(text: string): string[] {
  const tickerPattern = /\b(BTC|ETH|SOL|XRP|ADA|DOGE|MATIC|AVAX|DOT|LINK|UNI|AAVE|CRV|MKR|SNX|COMP|SUSHI|YFI|ARB|OP)\b/gi;
  const matches = text.match(tickerPattern) || [];
  return [...new Set(matches.map(t => t.toUpperCase()))];
}

function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const knownEntities = [
    'Uniswap', 'Aave', 'Compound', 'MakerDAO', 'Curve', 'Lido', 'Rocket Pool',
    'dYdX', 'GMX', 'Synthetix', 'Yearn', 'Convex', 'Balancer', 'SushiSwap',
    'Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'Solana',
    'Jupiter', 'Kamino', 'Marinade', 'Jito', 'Drift', 'Raydium'
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
  
  if (lower.includes('exploit') || lower.includes('hack')) score += 3;
  if (lower.includes('tvl') || lower.includes('billion')) score += 1;
  if (lower.includes('airdrop') || lower.includes('token launch')) score += 2;
  if (lower.includes('governance') || lower.includes('vote')) score += 1;
  if (lower.includes('upgrade') || lower.includes('v2') || lower.includes('v3')) score += 1;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  const bullishWords = ['surge', 'rally', 'launch', 'airdrop', 'upgrade', 'growth', 'record', 'milestone'];
  const bearishWords = ['hack', 'exploit', 'drain', 'crash', 'vulnerability', 'rug', 'scam'];
  
  const bullishCount = bullishWords.filter(w => lower.includes(w)).length;
  const bearishCount = bearishWords.filter(w => lower.includes(w)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}

export async function fetchDefiantNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(DEFIANT_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`The Defiant RSS fetch failed: ${response.status}`);
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
        channel: 'news/defi',
        priority: estimateImpact(fullText) >= 7 ? 'high' : 'medium',
        headline: `[DeFi] ${title}`.slice(0, 200),
        summary: description.slice(0, 1000) || title,
        entities: extractEntities(fullText),
        tickers: extractTickers(fullText),
        tokens: [],
        sourceUrl: link,
        sourceType: 'news_article',
        sentiment: determineSentiment(fullText),
        impactScore: estimateImpact(fullText),
        publishedAt: pubDate,
        rawData: { source: 'thedefiant' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[TheDefiant] Fetch error:', error);
    return [];
  }
}

export async function testDefiantFetcher() {
  console.log('[TheDefiant] Testing fetcher...');
  const alerts = await fetchDefiantNews();
  console.log(`[TheDefiant] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
