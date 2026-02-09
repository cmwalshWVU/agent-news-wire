import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const CHAINLINK_RSS_URL = 'https://blog.chain.link/feed/';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  'dc:creator'?: string;
  'content:encoded'?: string;
  category?: string | string[];
}

/**
 * Strip HTML tags from content
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
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract entities from title and content
 */
function extractEntities(title: string, categories: string[]): string[] {
  const entities: Set<string> = new Set(['Chainlink']);
  
  const knownEntities = [
    'CCIP', 'VRF', 'Data Feeds', 'Functions', 'Automation',
    'Swift', 'DTCC', 'ANZ', 'BNY Mellon', 'Fidelity',
    'Aave', 'Compound', 'Synthetix', 'dYdX',
    'Arbitrum', 'Optimism', 'Polygon', 'Avalanche', 'Base',
    'Ethereum', 'Solana', 'Bitcoin'
  ];
  
  const titleLower = title.toLowerCase();
  for (const entity of knownEntities) {
    if (titleLower.includes(entity.toLowerCase())) {
      entities.add(entity);
    }
  }
  
  // Add categories as entities
  for (const cat of categories) {
    if (cat && cat.length > 2) {
      entities.add(cat);
    }
  }
  
  return Array.from(entities).slice(0, 10);
}

/**
 * Estimate impact score based on content
 */
function estimateImpact(title: string, categories: string[]): number {
  let score = 5;
  const titleLower = title.toLowerCase();
  
  // High impact keywords
  if (titleLower.includes('launch')) score += 2;
  if (titleLower.includes('ccip')) score += 1;
  if (titleLower.includes('partnership')) score += 1;
  if (titleLower.includes('integration')) score += 1;
  if (titleLower.includes('swift')) score += 2;
  if (titleLower.includes('dtcc')) score += 2;
  if (titleLower.includes('cross-chain')) score += 1;
  if (titleLower.includes('tokenization')) score += 1;
  if (titleLower.includes('mainnet')) score += 1;
  
  // Category boosts
  const catStr = categories.join(' ').toLowerCase();
  if (catStr.includes('real-world assets')) score += 1;
  if (catStr.includes('enterprise')) score += 1;
  
  return Math.min(10, score);
}

/**
 * Fetch and parse Chainlink blog RSS feed
 */
export async function fetchChainlinkNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(CHAINLINK_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Chainlink RSS fetch failed: ${response.status}`);
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

      const entities = extractEntities(title, categories);
      const impactScore = estimateImpact(title, categories);

      const alert: AlertInput = {
        channel: 'networks/chainlink',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: title.slice(0, 200),
        summary: description.slice(0, 1000),
        entities,
        tickers: ['LINK'],
        tokens: ['LINK'],
        sourceUrl: link,
        sourceType: 'news',
        sentiment: 'neutral',
        impactScore,
        publishedAt: item.pubDate,
        rawData: { 
          source: 'chainlink-blog',
          categories,
          author: item['dc:creator'],
          pubDate: item.pubDate
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Chainlink] Fetch error:', error);
    return [];
  }
}

/**
 * Test the Chainlink fetcher
 */
export async function testChainlinkFetcher() {
  console.log('[Chainlink] Testing Chainlink RSS fetcher...');
  const alerts = await fetchChainlinkNews();
  console.log(`[Chainlink] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Entities: ${alert.entities.join(', ')}`);
  }
  return alerts;
}
