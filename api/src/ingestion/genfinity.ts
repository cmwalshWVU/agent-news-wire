import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const GENFINITY_RSS_URL = 'https://genfinity.io/feed/';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  'dc:creator': string;
  category: string | string[];
}

// Map categories to channels
const CATEGORY_CHANNEL_MAP: Record<string, string> = {
  // Regulatory
  'sec': 'regulatory/sec',
  'cftc': 'regulatory/cftc',
  'regulation': 'regulatory/global',
  'legal': 'regulatory/global',
  'enforcement': 'regulatory/sec',
  
  // Institutional
  'blackrock': 'institutional/asset-managers',
  'fidelity': 'institutional/asset-managers',
  'etf': 'institutional/asset-managers',
  'jpmorgan': 'institutional/banks',
  'bank': 'institutional/banks',
  'institutional': 'institutional/banks',
  
  // DeFi
  'defi': 'defi/protocols',
  'hack': 'defi/hacks',
  'exploit': 'defi/hacks',
  
  // RWA
  'tokenization': 'rwa/tokenization',
  'rwa': 'rwa/tokenization',
  'real world asset': 'rwa/tokenization',
  
  // Networks
  'solana': 'networks/solana',
  'sol': 'networks/solana',
  'ethereum': 'networks/ethereum',
  'eth': 'networks/ethereum',
  'canton': 'networks/canton',
  'hedera': 'networks/hedera',
  'hbar': 'networks/hedera',
  'hashgraph': 'networks/hedera',
  'xrp': 'networks/ripple',
  'ripple': 'networks/ripple',
  'xrpl': 'networks/ripple',
  'avalanche': 'networks/avalanche',
  'avax': 'networks/avalanche',
  'bitcoin': 'networks/bitcoin',
  'btc': 'networks/bitcoin',
  'lightning': 'networks/bitcoin',
  'algorand': 'networks/ethereum',
  'chainlink': 'networks/ethereum',
  'link': 'networks/ethereum',
};

/**
 * Detect channel from categories
 */
function detectChannel(categories: string[]): string {
  const lowerCats = categories.map(c => c.toLowerCase());
  
  for (const cat of lowerCats) {
    for (const [keyword, channel] of Object.entries(CATEGORY_CHANNEL_MAP)) {
      if (cat.includes(keyword)) {
        return channel;
      }
    }
  }
  
  // Default to institutional news for Genfinity content
  return 'institutional/banks';
}

/**
 * Extract entities from title and categories
 */
function extractEntities(title: string, categories: string[]): string[] {
  const entities: Set<string> = new Set();
  
  // Known entities to look for
  const knownEntities = [
    'BlackRock', 'Fidelity', 'JPMorgan', 'Goldman Sachs', 'Morgan Stanley',
    'Coinbase', 'Binance', 'Kraken', 'SEC', 'CFTC', 'Federal Reserve',
    'Ripple', 'Hedera', 'Solana', 'Ethereum', 'Bitcoin', 'XRP',
    'Chainlink', 'Algorand', 'Canton', 'DTCC', 'Swift', 'Circle',
    'MicroStrategy', 'Tesla', 'PayPal', 'Visa', 'Mastercard'
  ];
  
  const titleLower = title.toLowerCase();
  for (const entity of knownEntities) {
    if (titleLower.includes(entity.toLowerCase())) {
      entities.add(entity);
    }
  }
  
  // Add relevant categories as entities
  for (const cat of categories) {
    if (cat.length > 2 && !['news', 'crypto', 'blockchain', 'web3'].includes(cat.toLowerCase())) {
      entities.add(cat);
    }
  }
  
  return Array.from(entities).slice(0, 10);
}

/**
 * Extract tickers from content
 */
function extractTickers(text: string): string[] {
  const tickers: Set<string> = new Set();
  
  // Match $TICKER patterns
  const tickerMatches = text.match(/\$[A-Z]{2,6}/g) || [];
  for (const match of tickerMatches) {
    tickers.add(match.replace('$', ''));
  }
  
  // Known crypto tickers in text
  const knownTickers = ['BTC', 'ETH', 'XRP', 'SOL', 'HBAR', 'ALGO', 'LINK', 'USDC', 'USDT'];
  const textUpper = text.toUpperCase();
  for (const ticker of knownTickers) {
    if (textUpper.includes(ticker)) {
      tickers.add(ticker);
    }
  }
  
  return Array.from(tickers);
}

/**
 * Estimate impact based on content
 */
function estimateImpact(title: string, categories: string[]): number {
  let score = 5;
  const titleLower = title.toLowerCase();
  
  // High impact keywords
  if (titleLower.includes('breaking')) score += 2;
  if (titleLower.includes('exclusive')) score += 1;
  if (titleLower.includes('etf')) score += 1;
  if (titleLower.includes('sec')) score += 1;
  if (titleLower.includes('approval')) score += 1;
  if (titleLower.includes('launch')) score += 1;
  if (titleLower.includes('partnership')) score += 1;
  if (titleLower.includes('billion')) score += 1;
  if (titleLower.includes('million')) score += 0.5;
  
  return Math.min(10, score);
}

/**
 * Strip HTML from description
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch and parse Genfinity RSS feed
 */
export async function fetchGenfinityNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(GENFINITY_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Genfinity RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xml);
    const items: RSSItem[] = result.rss?.channel?.item || [];

    const alerts: AlertInput[] = [];

    for (const item of items) {
      const title = item.title || '';
      const link = item.link || '';
      const description = stripHtml(item.description || '');
      const categories = Array.isArray(item.category) 
        ? item.category 
        : item.category 
          ? [item.category] 
          : [];

      const channel = detectChannel(categories);
      const entities = extractEntities(title, categories);
      const tickers = extractTickers(title + ' ' + description);
      const impactScore = estimateImpact(title, categories);

      const alert: AlertInput = {
        channel: channel as any,
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: title.slice(0, 200),
        summary: description.slice(0, 1000),
        entities,
        tickers,
        tokens: tickers.filter(t => ['BTC', 'ETH', 'XRP', 'SOL', 'HBAR', 'ALGO', 'LINK'].includes(t)),
        sourceUrl: link,
        sourceType: 'news',
        sentiment: 'neutral',
        impactScore,
        publishedAt: item.pubDate, // Use original publication date
        rawData: { 
          source: 'genfinity',
          categories,
          author: item['dc:creator'],
          pubDate: item.pubDate
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Genfinity] Fetch error:', error);
    return [];
  }
}

/**
 * Test the Genfinity fetcher
 */
export async function testGenfinityFetcher() {
  console.log('[Genfinity] Testing Genfinity RSS fetcher...');
  const alerts = await fetchGenfinityNews();
  console.log(`[Genfinity] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - [${alert.channel}] ${alert.headline}`);
    console.log(`    Entities: ${alert.entities.join(', ')}`);
  }
  return alerts;
}
