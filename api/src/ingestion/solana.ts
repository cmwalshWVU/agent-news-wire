import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const SOLANA_RSS_URL = 'https://solana.com/news/rss.xml';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate: string;
  guid?: string;
  enclosure?: {
    '@_url'?: string;
    '@_type'?: string;
  };
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  if (!html) return '';
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
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract entities from title
 */
function extractEntities(title: string): string[] {
  const entities: Set<string> = new Set(['Solana', 'Solana Foundation']);
  
  const knownEntities = [
    'Jupiter', 'Raydium', 'Marinade', 'Jito', 'Drift', 'Kamino',
    'Phantom', 'Backpack', 'Solflare', 'Magic Eden', 'Tensor',
    'Pyth', 'Wormhole', 'Helium', 'Render',
    'Visa', 'Shopify', 'Circle', 'PayPal', 'Stripe',
    'WisdomTree', 'Franklin Templeton', 'VanEck',
    'Firedancer', 'Agave', 'Token Extensions',
    'Ondo', 'Maple', 'Parcl'
  ];
  
  const titleLower = title.toLowerCase();
  for (const entity of knownEntities) {
    if (titleLower.includes(entity.toLowerCase())) {
      entities.add(entity);
    }
  }
  
  return Array.from(entities).slice(0, 10);
}

/**
 * Estimate impact score based on content
 */
function estimateImpact(title: string): number {
  let score = 5;
  const titleLower = title.toLowerCase();
  
  // High impact keywords
  if (titleLower.includes('launch')) score += 2;
  if (titleLower.includes('partnership')) score += 1;
  if (titleLower.includes('integration')) score += 1;
  if (titleLower.includes('tokenization')) score += 1;
  if (titleLower.includes('etf')) score += 2;
  if (titleLower.includes('firedancer')) score += 2;
  if (titleLower.includes('visa')) score += 2;
  if (titleLower.includes('paypal')) score += 2;
  if (titleLower.includes('institutional')) score += 1;
  if (titleLower.includes('upgrade')) score += 1;
  if (titleLower.includes('depin')) score += 1;
  if (titleLower.includes('wisdomtree')) score += 1;
  if (titleLower.includes('ondo')) score += 1;
  
  return Math.min(10, score);
}

/**
 * Fetch and parse Solana news RSS feed
 */
export async function fetchSolanaNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(SOLANA_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Solana RSS fetch failed: ${response.status}`);
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
      const title = stripHtml(item.title || '');
      const link = item.link || '';
      // Solana RSS often has minimal descriptions, use title as summary if needed
      const description = stripHtml(item.description || title);

      const entities = extractEntities(title);
      const impactScore = estimateImpact(title);

      const alert: AlertInput = {
        channel: 'networks/solana',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: title.slice(0, 200),
        summary: description.slice(0, 1000),
        entities,
        tickers: ['SOL'],
        tokens: ['SOL'],
        sourceUrl: link,
        sourceType: 'news',
        sentiment: 'neutral',
        impactScore,
        publishedAt: item.pubDate,
        rawData: { 
          source: 'solana-news',
          guid: item.guid,
          imageUrl: item.enclosure?.['@_url'],
          pubDate: item.pubDate
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Solana] Fetch error:', error);
    return [];
  }
}

/**
 * Test the Solana fetcher
 */
export async function testSolanaFetcher() {
  console.log('[Solana] Testing Solana RSS fetcher...');
  const alerts = await fetchSolanaNews();
  console.log(`[Solana] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Entities: ${alert.entities.join(', ')}`);
  }
  return alerts;
}
