import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const ALGORAND_RSS_URL = 'https://medium.com/feed/algorand';

interface RSSItem {
  title: string;
  link: string;
  'content:encoded'?: string;
  pubDate: string;
  'dc:creator'?: string;
  category?: string | string[];
  guid?: string;
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
 * Extract first paragraph from HTML content for summary
 */
function extractSummary(html: string): string {
  if (!html) return '';
  
  // Try to get first meaningful paragraph
  const paragraphMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i);
  if (paragraphMatch) {
    return stripHtml(paragraphMatch[1]).slice(0, 1000);
  }
  
  // Fallback to stripping all HTML
  return stripHtml(html).slice(0, 1000);
}

/**
 * Extract entities from title and content
 */
function extractEntities(title: string, categories: string[]): string[] {
  const entities: Set<string> = new Set(['Algorand', 'Algorand Foundation']);
  
  const knownEntities = [
    'AlgoKit', 'Conduit', 'PyTeal', 'Beaker', 'AlgoFi',
    'Tinyman', 'Pact', 'Folks Finance', 'Humble DeFi',
    'FIFA', 'Napster', 'Circle', 'USDC',
    'State Proofs', 'AVM', 'Teal',
    'Silvio Micali', 'MIT'
  ];
  
  const titleLower = title.toLowerCase();
  for (const entity of knownEntities) {
    if (titleLower.includes(entity.toLowerCase())) {
      entities.add(entity);
    }
  }
  
  // Add relevant categories
  for (const cat of categories) {
    if (cat && cat.length > 2 && !['algorand', 'blockchain', 'crypto'].includes(cat.toLowerCase())) {
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
  if (titleLower.includes('partnership')) score += 1;
  if (titleLower.includes('upgrade')) score += 1;
  if (titleLower.includes('protocol')) score += 1;
  if (titleLower.includes('performance')) score += 1;
  if (titleLower.includes('state proofs')) score += 2;
  if (titleLower.includes('algokit')) score += 1;
  if (titleLower.includes('governance')) score += 1;
  if (titleLower.includes('tps')) score += 1;
  if (titleLower.includes('mainnet')) score += 1;
  
  return Math.min(10, score);
}

/**
 * Fetch and parse Algorand Medium RSS feed
 */
export async function fetchAlgorandNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(ALGORAND_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Algorand RSS fetch failed: ${response.status}`);
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
      const summary = extractSummary(item['content:encoded'] || '');
      const categories = Array.isArray(item.category) 
        ? item.category 
        : item.category 
          ? [item.category] 
          : [];

      const entities = extractEntities(title, categories);
      const impactScore = estimateImpact(title, categories);

      const alert: AlertInput = {
        channel: 'networks/algorand',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: title.slice(0, 200),
        summary: summary || title,
        entities,
        tickers: ['ALGO'],
        tokens: ['ALGO'],
        sourceUrl: link,
        sourceType: 'news',
        sentiment: 'neutral',
        impactScore,
        publishedAt: item.pubDate,
        rawData: { 
          source: 'algorand-medium',
          categories,
          author: item['dc:creator'],
          guid: item.guid,
          pubDate: item.pubDate
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[Algorand] Fetch error:', error);
    return [];
  }
}

/**
 * Test the Algorand fetcher
 */
export async function testAlgorandFetcher() {
  console.log('[Algorand] Testing Algorand RSS fetcher...');
  const alerts = await fetchAlgorandNews();
  console.log(`[Algorand] Found ${alerts.length} articles`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Entities: ${alert.entities.join(', ')}`);
  }
  return alerts;
}
