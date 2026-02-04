import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const SEC_RSS_URL = 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom';

// Keywords that indicate crypto/blockchain relevance
const CRYPTO_KEYWORDS = [
  'blockchain', 'cryptocurrency', 'crypto', 'bitcoin', 'ethereum', 'digital asset',
  'tokenization', 'tokenized', 'stablecoin', 'defi', 'decentralized', 'smart contract',
  'distributed ledger', 'dlt', 'virtual currency', 'cbdc', 'digital currency',
  'web3', 'nft', 'solana', 'ripple', 'xrp', 'coinbase', 'binance', 'kraken',
  'custody', 'digital securities', 'security token'
];

// Form types we care about
const RELEVANT_FORMS = [
  '10-K', '10-Q', 'S-1', 'S-3', 'N-1A', 'N-2', '8-K', 
  'DEF 14A', '4', 'SC 13D', 'SC 13G', '13F-HR'
];

interface SECEntry {
  title: string;
  link: string;
  summary: string;
  updated: string;
}

/**
 * Check if content is crypto-related
 */
function isCryptoRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Extract form type from title
 */
function extractFormType(title: string): string | null {
  for (const form of RELEVANT_FORMS) {
    if (title.includes(form)) return form;
  }
  return null;
}

/**
 * Extract company name from SEC title
 * Format: "4 - Smith, John" or "10-K - Coinbase Global, Inc."
 */
function extractCompany(title: string): string {
  const parts = title.split(' - ');
  if (parts.length >= 2) {
    return parts.slice(1).join(' - ').trim();
  }
  return title;
}

/**
 * Estimate impact score based on form type and content
 */
function estimateImpact(formType: string | null, content: string): number {
  let score = 5; // Base score

  // Form type impact
  const formScores: Record<string, number> = {
    'S-1': 8, // IPO filing
    'N-1A': 8, // Fund registration (ETF potential)
    '8-K': 7, // Material event
    '10-K': 6, // Annual report
    'SC 13D': 7, // Activist stake
    '10-Q': 5, // Quarterly
  };
  
  if (formType && formScores[formType]) {
    score = formScores[formType];
  }

  // Boost for specific keywords
  const lower = content.toLowerCase();
  if (lower.includes('etf')) score += 1;
  if (lower.includes('acquisition')) score += 1;
  if (lower.includes('partnership')) score += 0.5;
  if (lower.includes('enforcement')) score += 1;
  if (lower.includes('investigation')) score += 1;

  return Math.min(10, score);
}

/**
 * Fetch and parse SEC EDGAR RSS feed
 */
export async function fetchSECFilings(): Promise<AlertInput[]> {
  try {
    const response = await fetch(SEC_RSS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (contact@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`SEC RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });

    const result = parser.parse(xml);
    const entries: SECEntry[] = result.feed?.entry || [];

    const alerts: AlertInput[] = [];

    for (const entry of entries) {
      const title = entry.title || '';
      const summary = entry.summary || '';
      const link = typeof entry.link === 'object' ? entry.link['@_href'] : entry.link;
      const fullText = `${title} ${summary}`;

      // Only process crypto-related filings
      if (!isCryptoRelated(fullText)) {
        continue;
      }

      const formType = extractFormType(title);
      const company = extractCompany(title);
      const impactScore = estimateImpact(formType, fullText);

      const alert: AlertInput = {
        channel: 'regulatory/sec',
        priority: impactScore >= 7 ? 'high' : impactScore >= 5 ? 'medium' : 'low',
        headline: `SEC Filing: ${formType || 'Document'} - ${company}`.slice(0, 200),
        summary: summary.slice(0, 1000) || `New ${formType || 'filing'} submitted to SEC`,
        entities: [company, 'SEC'].filter(Boolean),
        tickers: [], // Would need additional lookup
        tokens: [],
        sourceUrl: link,
        sourceType: 'regulatory_filing',
        sentiment: 'neutral',
        impactScore,
        rawData: { formType, originalTitle: title }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[SEC] Fetch error:', error);
    return [];
  }
}

/**
 * Test the SEC fetcher
 */
export async function testSECFetcher() {
  console.log('[SEC] Testing SEC EDGAR fetcher...');
  const alerts = await fetchSECFilings();
  console.log(`[SEC] Found ${alerts.length} crypto-related filings`);
  for (const alert of alerts.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Impact: ${alert.impactScore}, Priority: ${alert.priority}`);
  }
  return alerts;
}
