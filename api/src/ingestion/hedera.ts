import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const HEDERA_RSS_URL = 'https://hedera.com/blog/feed/';

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
  const entities: Set<string> = new Set(['Hedera', 'HBAR Foundation']);
  
  const knownEntities = [
    'Hashgraph', 'HBAR', 'Hiero', 'Hedera Consensus Service', 'HCS',
    'Google', 'IBM', 'LG', 'Boeing', 'Dell', 'Deutsche Telekom',
    'Standard Bank', 'Shinhan Bank', 'ServiceNow',
    'Atma.io', 'Dropp', 'HashPort', 'Stader',
    'NFT', 'DeFi', 'Enterprise', 'Tokenization'
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
  if (titleLower.includes('enterprise')) score += 1;
  if (titleLower.includes('governing council')) score += 2;
  if (titleLower.includes('google')) score += 2;
  if (titleLower.includes('tokenization')) score += 1;
  if (titleLower.includes('mainnet')) score += 1;
  if (titleLower.includes('upgrade')) score += 1;
  if (titleLower.includes('hiero')) score += 1;
  if (titleLower.includes('sdk')) score += 1;
  
  return Math.min(10, score);
}

/**
 * Fetch and parse Hedera blog RSS feed
 */
export async function fetchHederaNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(HEDERA_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Hedera RSS fetch failed: ${response.status}`);
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
      const impactScore = estimateImpact(title);

      const alert: AlertInput = {
        channel: 'networks/hedera',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: title.slice(0, 200),
        summary: description.slice(0, 1000),
        entities,
        tickers: ['HBAR'],
        tokens: ['HBAR'],
        sourceUrl: link,
        sourceType: 'news',
        sentiment: 'neutral',
        impactScore,
        publishedAt: item.pubDate,
        rawData: { 
          source: 'hedera-blog',
          categories,
          author: item['dc:creator'],
          pubDate: item.pubDate
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Hedera] Fetch error:', error);
    return [];
  }
}

/**
 * Test the Hedera fetcher
 */
export async function testHederaFetcher() {
  console.log('[Hedera] Testing Hedera RSS fetcher...');
  const alerts = await fetchHederaNews();
  console.log(`[Hedera] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Entities: ${alert.entities.join(', ')}`);
  }
  return alerts;
}
