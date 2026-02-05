import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

// CFTC RSS Feeds
const CFTC_GENERAL_RSS = 'https://www.cftc.gov/RSS/RSSGP/rssgp.xml';
const CFTC_ENFORCEMENT_RSS = 'https://www.cftc.gov/RSS/RSSENF/rssenf.xml';

// Keywords that indicate crypto/blockchain relevance
const CRYPTO_KEYWORDS = [
  'cryptocurrency', 'crypto', 'bitcoin', 'ethereum', 'digital asset',
  'virtual currency', 'blockchain', 'defi', 'decentralized finance',
  'stablecoin', 'tether', 'usdc', 'usdt', 'binance', 'coinbase', 
  'ftx', 'derivatives', 'futures', 'swap', 'digital commodity',
  'token', 'exchange', 'trading platform', 'custody'
];

// Action types to identify enforcement vs announcements
const ENFORCEMENT_KEYWORDS = [
  'enforcement', 'charges', 'fraud', 'penalty', 'settlement', 'fine',
  'violation', 'manipulation', 'spoofing', 'wash trading', 'order',
  'consent order', 'complaint', 'injunction', 'cease and desist'
];

interface CFTCEntry {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  'dc:date'?: string;
}

/**
 * Check if content is crypto-related
 */
function isCryptoRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Check if this is an enforcement action
 */
function isEnforcement(text: string): boolean {
  const lower = text.toLowerCase();
  return ENFORCEMENT_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Extract entities from text
 */
function extractEntities(text: string): string[] {
  const entities = ['CFTC'];
  
  // Common crypto companies/exchanges
  const knownEntities = [
    'Binance', 'Coinbase', 'FTX', 'Kraken', 'Bitfinex', 'BitMEX',
    'Tether', 'Circle', 'Ripple', 'Gemini', 'OKX', 'Bybit',
    'dYdX', 'Uniswap', 'Curve', 'Aave', 'Compound'
  ];
  
  for (const entity of knownEntities) {
    if (text.toLowerCase().includes(entity.toLowerCase())) {
      entities.push(entity);
    }
  }
  
  return [...new Set(entities)];
}

/**
 * Estimate impact score based on content
 */
function estimateImpact(text: string, isEnforcementAction: boolean): number {
  let score = 5;
  const lower = text.toLowerCase();
  
  // Enforcement actions are high impact
  if (isEnforcementAction) score += 2;
  
  // Large penalties
  if (lower.includes('million') || lower.includes('billion')) score += 1;
  
  // Major exchanges
  if (lower.includes('binance') || lower.includes('coinbase')) score += 1;
  
  // Fraud charges
  if (lower.includes('fraud') || lower.includes('manipulation')) score += 1;
  
  // New rules/guidance
  if (lower.includes('proposed rule') || lower.includes('final rule')) score += 1;
  if (lower.includes('guidance') || lower.includes('advisory')) score += 0.5;
  
  return Math.min(10, score);
}

/**
 * Determine sentiment based on content
 */
function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  // Enforcement = bearish for crypto
  if (lower.includes('charges') || lower.includes('fraud') || 
      lower.includes('penalty') || lower.includes('violation')) {
    return 'bearish';
  }
  
  // Clarity/guidance = often bullish
  if (lower.includes('approves') || lower.includes('clears') ||
      lower.includes('guidance') && !lower.includes('enforcement')) {
    return 'bullish';
  }
  
  return 'neutral';
}

/**
 * Fetch and parse a single CFTC RSS feed
 */
async function fetchCFTCFeed(url: string, isEnforcementFeed: boolean): Promise<AlertInput[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (contact@agentnewswire.io)'
      }
    });

    if (!response.ok) {
      throw new Error(`CFTC RSS fetch failed: ${response.status} for ${url}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xml);
    
    // Handle both RSS 2.0 and Atom formats
    let entries: CFTCEntry[] = [];
    if (result.rss?.channel?.item) {
      entries = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];
    } else if (result.feed?.entry) {
      entries = Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];
    }

    const alerts: AlertInput[] = [];

    for (const entry of entries) {
      const title = entry.title || '';
      const description = entry.description || '';
      const link = typeof entry.link === 'object' ? entry.link['@_href'] : entry.link;
      const pubDate = entry.pubDate || entry['dc:date'];
      const fullText = `${title} ${description}`;

      // Only process crypto-related releases
      if (!isCryptoRelated(fullText)) {
        continue;
      }

      const enforcementAction = isEnforcementFeed || isEnforcement(fullText);
      const impactScore = estimateImpact(fullText, enforcementAction);
      const entities = extractEntities(fullText);
      const sentiment = determineSentiment(fullText);

      const alert: AlertInput = {
        channel: 'regulatory/cftc',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: `CFTC: ${title}`.slice(0, 200),
        summary: description.slice(0, 1000) || title,
        entities,
        tickers: [],
        tokens: [],
        sourceUrl: link,
        sourceType: enforcementAction ? 'enforcement_action' : 'press_release',
        sentiment,
        impactScore,
        publishedAt: pubDate,
        rawData: { 
          isEnforcement: enforcementAction,
          originalTitle: title,
          feedType: isEnforcementFeed ? 'enforcement' : 'general'
        }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error(`[CFTC] Fetch error for ${url}:`, error);
    return [];
  }
}

/**
 * Fetch and parse all CFTC press releases RSS feeds
 */
export async function fetchCFTCReleases(): Promise<AlertInput[]> {
  const [generalAlerts, enforcementAlerts] = await Promise.all([
    fetchCFTCFeed(CFTC_GENERAL_RSS, false),
    fetchCFTCFeed(CFTC_ENFORCEMENT_RSS, true)
  ]);

  // Combine and dedupe by URL
  const seen = new Set<string>();
  const combined: AlertInput[] = [];
  
  for (const alert of [...enforcementAlerts, ...generalAlerts]) {
    if (!seen.has(alert.sourceUrl)) {
      seen.add(alert.sourceUrl);
      combined.push(alert);
    }
  }

  return combined;
}

/**
 * Generate mock CFTC alerts for testing/demo
 */
export function generateMockCFTCAlerts(): AlertInput[] {
  const mockAlerts: AlertInput[] = [
    {
      channel: 'regulatory/cftc',
      priority: 'high',
      headline: 'CFTC Charges Crypto Exchange with Operating Unlicensed Derivatives Platform',
      summary: 'The Commodity Futures Trading Commission today announced charges against a major cryptocurrency exchange for offering leveraged trading products to U.S. customers without proper registration.',
      entities: ['CFTC'],
      tickers: [],
      tokens: [],
      sourceUrl: 'https://www.cftc.gov/PressRoom/PressReleases/example1',
      sourceType: 'enforcement_action',
      sentiment: 'bearish',
      impactScore: 8,
      rawData: { isEnforcement: true, mock: true }
    },
    {
      channel: 'regulatory/cftc',
      priority: 'medium',
      headline: 'CFTC Issues Guidance on Digital Asset Derivatives Classification',
      summary: 'New advisory clarifies how certain tokenized assets will be treated under the Commodity Exchange Act, providing regulatory clarity for market participants.',
      entities: ['CFTC'],
      tickers: [],
      tokens: [],
      sourceUrl: 'https://www.cftc.gov/PressRoom/PressReleases/example2',
      sourceType: 'press_release',
      sentiment: 'bullish',
      impactScore: 6,
      rawData: { isEnforcement: false, mock: true }
    }
  ];

  // Randomly return 0-1 alerts to simulate real feed behavior
  const count = Math.random() > 0.7 ? 1 : 0;
  return mockAlerts.slice(0, count);
}

/**
 * Test the CFTC fetcher
 */
export async function testCFTCFetcher() {
  console.log('[CFTC] Testing CFTC fetcher...');
  const alerts = await fetchCFTCReleases();
  console.log(`[CFTC] Found ${alerts.length} crypto-related releases`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Impact: ${alert.impactScore}, Priority: ${alert.priority}, Sentiment: ${alert.sentiment}`);
  }
  return alerts;
}
