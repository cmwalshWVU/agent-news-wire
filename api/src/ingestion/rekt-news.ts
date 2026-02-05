import { AlertInput } from '../types/index.js';

// Rekt News API/scrape endpoint
const REKT_API_URL = 'https://rekt.news/api/posts';
const REKT_BASE_URL = 'https://rekt.news';

// Alternative: DeFiLlama hacks endpoint (more reliable)
const DEFILLAMA_HACKS_URL = 'https://api.llama.fi/hacks';

interface RektPost {
  title: string;
  slug: string;
  excerpt?: string;
  date: string;
  tags?: string[];
  loss?: number;
}

interface DeFiLlamaHack {
  id: string;
  name: string;
  date: number; // Unix timestamp in seconds
  amount: number;
  chain: string[];
  classification: string;
  technique?: string;
  link?: string;
  source?: string;
  description?: string;
}

/**
 * Extract protocol/project names from text
 */
function extractEntities(text: string, chains: string | string[] = []): string[] {
  // Normalize chains to array
  const chainArray = Array.isArray(chains) ? chains : (chains ? [chains] : []);
  const entities: string[] = [...chainArray];
  
  // Common DeFi protocols
  const knownProtocols = [
    'Aave', 'Compound', 'Uniswap', 'Curve', 'Balancer', 'SushiSwap',
    'PancakeSwap', 'Yearn', 'Lido', 'Rocket Pool', 'Convex',
    'MakerDAO', 'dYdX', 'GMX', 'Euler', 'Radiant', 'Sentiment',
    'Mango', 'Solend', 'Marinade', 'Raydium', 'Orca', 'Jupiter',
    'Wormhole', 'Multichain', 'Ronin', 'Harmony', 'Nomad'
  ];
  
  for (const protocol of knownProtocols) {
    if (text.toLowerCase().includes(protocol.toLowerCase())) {
      entities.push(protocol);
    }
  }
  
  return [...new Set(entities)];
}

/**
 * Calculate impact score based on loss amount
 */
function calculateImpact(amount: number): number {
  if (amount >= 100_000_000) return 10; // $100M+
  if (amount >= 50_000_000) return 9;   // $50M+
  if (amount >= 10_000_000) return 8;   // $10M+
  if (amount >= 5_000_000) return 7;    // $5M+
  if (amount >= 1_000_000) return 6;    // $1M+
  if (amount >= 500_000) return 5;      // $500K+
  if (amount >= 100_000) return 4;      // $100K+
  return 3;
}

/**
 * Format loss amount for display
 */
function formatLoss(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

/**
 * Determine priority based on recency and amount
 */
function determinePriority(amount: number, dateStr: string): 'high' | 'medium' | 'low' {
  const date = new Date(dateStr);
  const now = new Date();
  const hoursSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  // Recent large hacks are critical
  if (hoursSince < 24 && amount >= 10_000_000) return 'high';
  if (hoursSince < 24 && amount >= 1_000_000) return 'high';
  if (hoursSince < 72 && amount >= 10_000_000) return 'high';
  if (amount >= 50_000_000) return 'high';
  if (amount >= 5_000_000) return 'medium';
  return 'low';
}

/**
 * Fetch hacks from DeFiLlama API (primary source)
 */
export async function fetchDeFiLlamaHacks(): Promise<AlertInput[]> {
  try {
    const response = await fetch(DEFILLAMA_HACKS_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`DeFiLlama hacks fetch failed: ${response.status}`);
    }

    const hacks: DeFiLlamaHack[] = await response.json();
    
    // Filter to recent hacks (last 30 days for broader coverage)
    const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recentHacks = hacks.filter(h => h.date >= thirtyDaysAgo);

    // Sort by date descending (most recent first)
    recentHacks.sort((a, b) => b.date - a.date);

    const alerts: AlertInput[] = recentHacks.map(hack => {
      const lossFormatted = formatLoss(hack.amount);
      const impactScore = calculateImpact(hack.amount);
      const dateStr = new Date(hack.date * 1000).toISOString();
      const priority = determinePriority(hack.amount, dateStr);
      // Normalize chains to array
      const chainArray = Array.isArray(hack.chain) ? hack.chain : (hack.chain ? [hack.chain] : ['Unknown']);
      const entities = extractEntities(hack.name, chainArray);
      const chainStr = chainArray.join(', ');
      
      return {
        channel: 'defi/hacks',
        priority,
        headline: `${hack.name} Exploited for ${lossFormatted}`.slice(0, 200),
        summary: hack.description || 
          `${hack.name} suffered a ${hack.classification || 'exploit'} attack${hack.technique ? ` via ${hack.technique}` : ''}, resulting in ${lossFormatted} in losses. Chains affected: ${chainStr}.`,
        entities,
        tickers: [],
        tokens: [],
        sourceUrl: hack.source || hack.link || `https://defillama.com/hacks`,
        sourceType: 'security_incident',
        sentiment: 'bearish',
        impactScore,
        publishedAt: dateStr,
        rawData: {
          amount: hack.amount,
          chains: chainArray,
          classification: hack.classification,
          technique: hack.technique,
          source: 'defillama'
        }
      };
    });

    return alerts;
  } catch (error) {
    console.error('[RektNews] DeFiLlama hacks fetch error:', error);
    return [];
  }
}

/**
 * Fetch from Rekt News API (backup/additional source)
 */
export async function fetchRektNewsPosts(): Promise<AlertInput[]> {
  try {
    // Note: Rekt doesn't have a public API, so we'll use web fetch
    // This is a best-effort scrape that may need adjustment
    const response = await fetch(REKT_BASE_URL, {
      headers: {
        'User-Agent': 'AgentNewsWire/1.0'
      }
    });

    if (!response.ok) {
      console.log('[RektNews] Rekt.news fetch returned non-200, using DeFiLlama only');
      return [];
    }

    const html = await response.text();
    
    // Extract article links and titles from HTML
    // Pattern: <a href="/post-slug/" class="...">Title</a>
    const articlePattern = /<a[^>]*href="\/([a-z0-9-]+)\/"[^>]*class="[^"]*post[^"]*"[^>]*>([^<]+)<\/a>/gi;
    const matches = [...html.matchAll(articlePattern)];
    
    const alerts: AlertInput[] = [];
    
    for (const match of matches.slice(0, 10)) {
      const slug = match[1];
      const title = match[2].trim();
      
      // Skip non-hack posts
      if (!title || slug.includes('about') || slug.includes('contact')) {
        continue;
      }

      // Extract loss amount from title if present (e.g., "$50M")
      const lossMatch = title.match(/\$([0-9.]+)\s*(M|B|K)?/i);
      let amount = 0;
      if (lossMatch) {
        const num = parseFloat(lossMatch[1]);
        const suffix = (lossMatch[2] || '').toUpperCase();
        if (suffix === 'B') amount = num * 1_000_000_000;
        else if (suffix === 'M') amount = num * 1_000_000;
        else if (suffix === 'K') amount = num * 1_000;
        else amount = num;
      }

      const impactScore = amount > 0 ? calculateImpact(amount) : 5;
      
      alerts.push({
        channel: 'defi/hacks',
        priority: amount >= 10_000_000 ? 'high' : 'medium',
        headline: `Rekt: ${title}`.slice(0, 200),
        summary: `New incident report from Rekt News: ${title}`,
        entities: extractEntities(title),
        tickers: [],
        tokens: [],
        sourceUrl: `${REKT_BASE_URL}/${slug}/`,
        sourceType: 'security_incident',
        sentiment: 'bearish',
        impactScore,
        rawData: {
          source: 'rekt.news',
          slug,
          extractedAmount: amount
        }
      });
    }

    return alerts;
  } catch (error) {
    console.error('[RektNews] Rekt.news fetch error:', error);
    return [];
  }
}

/**
 * Combined fetch from all hack sources
 */
export async function fetchHackAlerts(): Promise<AlertInput[]> {
  const [defiLlamaAlerts, rektAlerts] = await Promise.all([
    fetchDeFiLlamaHacks(),
    fetchRektNewsPosts()
  ]);

  // Dedupe by checking similar headlines/URLs
  const seen = new Set<string>();
  const combined: AlertInput[] = [];
  
  // DeFiLlama first (more structured data)
  for (const alert of defiLlamaAlerts) {
    const key = alert.headline.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(alert);
    }
  }
  
  // Then Rekt (additional coverage)
  for (const alert of rektAlerts) {
    const key = alert.headline.toLowerCase().slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(alert);
    }
  }

  return combined;
}

/**
 * Generate mock hack alerts for testing/demo
 */
export function generateMockHackAlerts(): AlertInput[] {
  const mockAlerts: AlertInput[] = [
    {
      channel: 'defi/hacks',
      priority: 'high',
      headline: 'DeFi Protocol X Exploited for $12.5M via Flash Loan Attack',
      summary: 'A flash loan attack exploited a price oracle vulnerability in Protocol X, resulting in $12.5M drained from liquidity pools. The team has paused contracts and is investigating.',
      entities: ['Protocol X', 'Ethereum'],
      tickers: [],
      tokens: ['ETH', 'USDC'],
      sourceUrl: 'https://defillama.com/hacks',
      sourceType: 'security_incident',
      sentiment: 'bearish',
      impactScore: 8,
      rawData: { amount: 12_500_000, mock: true }
    },
    {
      channel: 'defi/hacks',
      priority: 'medium',
      headline: 'Bridge Protocol Suffers $2.3M Exploit on Arbitrum',
      summary: 'A cross-chain bridge was exploited due to a signature verification bug. White hat negotiations are underway.',
      entities: ['Arbitrum'],
      tickers: [],
      tokens: ['ARB', 'ETH'],
      sourceUrl: 'https://rekt.news',
      sourceType: 'security_incident',
      sentiment: 'bearish',
      impactScore: 6,
      rawData: { amount: 2_300_000, mock: true }
    }
  ];

  // Randomly return 0-1 alerts
  const count = Math.random() > 0.8 ? 1 : 0;
  return mockAlerts.slice(0, count);
}

/**
 * Test the hack fetchers
 */
export async function testHackFetchers() {
  console.log('[RektNews] Testing hack fetchers...');
  
  console.log('[RektNews] Fetching from DeFiLlama...');
  const defiLlama = await fetchDeFiLlamaHacks();
  console.log(`[RektNews] DeFiLlama: ${defiLlama.length} recent hacks`);
  
  console.log('[RektNews] Fetching from Rekt.news...');
  const rekt = await fetchRektNewsPosts();
  console.log(`[RektNews] Rekt.news: ${rekt.length} posts`);
  
  const combined = await fetchHackAlerts();
  console.log(`[RektNews] Combined: ${combined.length} unique alerts`);
  
  for (const alert of combined.slice(0, 5)) {
    console.log(`  - ${alert.headline}`);
    console.log(`    Impact: ${alert.impactScore}, Priority: ${alert.priority}`);
  }
  
  return combined;
}
