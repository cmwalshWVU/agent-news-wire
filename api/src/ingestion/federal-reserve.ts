import { XMLParser } from 'fast-xml-parser';
import { AlertInput } from '../types/index.js';

const FED_RSS = 'https://www.federalreserve.gov/feeds/press_all.xml';

// Keywords to filter for crypto/financial relevance
const RELEVANT_KEYWORDS = [
  'digital', 'crypto', 'stablecoin', 'cbdc', 'blockchain', 'token',
  'payment', 'fintech', 'bank', 'interest rate', 'monetary policy',
  'inflation', 'liquidity', 'financial stability', 'reserve'
];

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  category?: string;
}

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => lower.includes(kw));
}

function extractEntities(text: string): string[] {
  const entities: string[] = ['Federal Reserve'];
  const knownEntities = [
    'FOMC', 'Powell', 'Treasury', 'FDIC', 'OCC',
    'JPMorgan', 'Bank of America', 'Wells Fargo', 'Citibank',
    'Silvergate', 'Signature Bank', 'Silicon Valley Bank'
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
  let score = 6; // Fed news is inherently important
  const lower = text.toLowerCase();
  
  // Major announcements
  if (lower.includes('rate') || lower.includes('fomc')) score += 2;
  if (lower.includes('cbdc') || lower.includes('digital currency')) score += 2;
  if (lower.includes('crypto') || lower.includes('stablecoin')) score += 2;
  if (lower.includes('bank') && (lower.includes('fail') || lower.includes('close'))) score += 2;
  if (lower.includes('guidance') || lower.includes('regulation')) score += 1;
  
  return Math.min(10, score);
}

function determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  
  // Fed hawkish = bearish for risk assets
  if (lower.includes('raise') || lower.includes('tighten') || lower.includes('inflation concern')) {
    return 'bearish';
  }
  
  // Fed dovish = bullish
  if (lower.includes('cut') || lower.includes('pause') || lower.includes('ease') || lower.includes('support')) {
    return 'bullish';
  }
  
  return 'neutral';
}

export async function fetchFedNews(): Promise<AlertInput[]> {
  try {
    const response = await fetch(FED_RSS, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0 (https://agent-news-wire.genfinity.io)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Federal Reserve RSS fetch failed: ${response.status}`);
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

    for (const item of items.slice(0, 30)) {
      const title = item.title || '';
      const description = item.description?.replace(/<[^>]*>/g, '') || '';
      const link = item.link || '';
      const pubDate = item.pubDate;
      const fullText = `${title} ${description}`;

      // Only process relevant releases
      if (!isRelevant(fullText)) {
        continue;
      }

      const alert: AlertInput = {
        channel: 'regulatory/fed',
        priority: estimateImpact(fullText) >= 8 ? 'high' : 'medium',
        headline: `Fed: ${title}`.slice(0, 200),
        summary: description.slice(0, 1000) || title,
        entities: extractEntities(fullText),
        tickers: [],
        tokens: [],
        sourceUrl: link,
        sourceType: 'press_release',
        sentiment: determineSentiment(fullText),
        impactScore: estimateImpact(fullText),
        publishedAt: pubDate,
        rawData: { source: 'federal-reserve' }
      };

      alerts.push(alert);
    }

    return alerts;
  } catch (error) {
    console.error('[FederalReserve] Fetch error:', error);
    return [];
  }
}

export async function testFedFetcher() {
  console.log('[FederalReserve] Testing fetcher...');
  const alerts = await fetchFedNews();
  console.log(`[FederalReserve] Found ${alerts.length} relevant releases`);
  for (const alert of alerts.slice(0, 3)) {
    console.log(`  - ${alert.headline}`);
  }
  return alerts;
}
