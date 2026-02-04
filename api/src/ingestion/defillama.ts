import { AlertInput } from '../types/index.js';

const DEFILLAMA_YIELDS_URL = 'https://yields.llama.fi/pools';
const DEFILLAMA_TVL_URL = 'https://api.llama.fi/protocols';

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  apyMean30d: number;
  stablecoin: boolean;
}

interface DefiLlamaProtocol {
  name: string;
  symbol: string;
  tvl: number;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  chains: string[];
  category: string;
}

// Track previous state for change detection
let previousYields: Map<string, number> = new Map();
let previousTVL: Map<string, number> = new Map();

/**
 * Fetch yield opportunities and detect significant changes
 */
export async function fetchYieldAlerts(): Promise<AlertInput[]> {
  try {
    const response = await fetch(DEFILLAMA_YIELDS_URL);
    if (!response.ok) {
      throw new Error(`DeFiLlama yields fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const pools: DefiLlamaPool[] = data.data || [];

    const alerts: AlertInput[] = [];

    // Focus on high-value, significant yield pools
    const significantPools = pools.filter(p => 
      p.tvlUsd > 1_000_000 && // >$1M TVL
      p.apy > 5 // >5% APY
    );

    for (const pool of significantPools) {
      const key = `${pool.project}-${pool.symbol}`;
      const prevApy = previousYields.get(key);

      // Detect significant APY changes (>50% relative change)
      if (prevApy !== undefined) {
        const change = ((pool.apy - prevApy) / prevApy) * 100;
        
        if (Math.abs(change) > 50) {
          const direction = change > 0 ? 'spiked' : 'dropped';
          const sentiment = change > 0 ? 'bullish' : 'bearish';
          
          alerts.push({
            channel: 'defi/yields',
            priority: Math.abs(change) > 100 ? 'high' : 'medium',
            headline: `${pool.project} ${pool.symbol} yield ${direction} ${Math.abs(change).toFixed(0)}%`,
            summary: `APY changed from ${prevApy.toFixed(2)}% to ${pool.apy.toFixed(2)}% on ${pool.chain}. TVL: $${(pool.tvlUsd / 1_000_000).toFixed(1)}M`,
            entities: [pool.project],
            tickers: [],
            tokens: [pool.symbol],
            sourceUrl: `https://defillama.com/yields/pool/${pool.pool}`,
            sourceType: 'defi_data',
            sentiment,
            impactScore: Math.min(10, 5 + Math.abs(change) / 20),
            rawData: { pool, previousApy: prevApy, change }
          });
        }
      }

      // Check for exceptional new opportunities
      if (prevApy === undefined && pool.apy > 20 && pool.tvlUsd > 10_000_000) {
        alerts.push({
          channel: 'defi/yields',
          priority: 'medium',
          headline: `High yield opportunity: ${pool.project} ${pool.symbol} at ${pool.apy.toFixed(1)}% APY`,
          summary: `${pool.project} offering ${pool.apy.toFixed(2)}% APY on ${pool.symbol} (${pool.chain}). TVL: $${(pool.tvlUsd / 1_000_000).toFixed(1)}M. ${pool.stablecoin ? 'Stablecoin pool.' : ''}`,
          entities: [pool.project],
          tickers: [],
          tokens: [pool.symbol],
          sourceUrl: `https://defillama.com/yields/pool/${pool.pool}`,
          sourceType: 'defi_data',
          sentiment: 'bullish',
          impactScore: 6,
          rawData: { pool }
        });
      }

      previousYields.set(key, pool.apy);
    }

    return alerts;
  } catch (error) {
    console.error('[DeFiLlama] Yields fetch error:', error);
    return [];
  }
}

/**
 * Fetch TVL changes for protocols
 */
export async function fetchTVLAlerts(): Promise<AlertInput[]> {
  try {
    const response = await fetch(DEFILLAMA_TVL_URL);
    if (!response.ok) {
      throw new Error(`DeFiLlama TVL fetch failed: ${response.status}`);
    }

    const protocols: DefiLlamaProtocol[] = await response.json();
    const alerts: AlertInput[] = [];

    // Focus on significant protocols
    const significantProtocols = protocols.filter(p => p.tvl > 100_000_000); // >$100M

    for (const protocol of significantProtocols) {
      // Alert on dramatic 1-day changes
      if (Math.abs(protocol.change_1d) > 10) {
        const direction = protocol.change_1d > 0 ? 'surged' : 'dropped';
        const sentiment = protocol.change_1d > 0 ? 'bullish' : 'bearish';
        
        alerts.push({
          channel: 'defi/protocols',
          priority: Math.abs(protocol.change_1d) > 25 ? 'high' : 'medium',
          headline: `${protocol.name} TVL ${direction} ${Math.abs(protocol.change_1d).toFixed(1)}% in 24h`,
          summary: `${protocol.name} TVL is now $${(protocol.tvl / 1_000_000_000).toFixed(2)}B. Chains: ${protocol.chains.slice(0, 5).join(', ')}`,
          entities: [protocol.name],
          tickers: protocol.symbol ? [protocol.symbol] : [],
          tokens: [],
          sourceUrl: `https://defillama.com/protocol/${protocol.name.toLowerCase().replace(/\s+/g, '-')}`,
          sourceType: 'defi_data',
          sentiment,
          impactScore: Math.min(10, 5 + Math.abs(protocol.change_1d) / 5),
          rawData: { protocol }
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('[DeFiLlama] TVL fetch error:', error);
    return [];
  }
}

/**
 * Test DeFiLlama fetchers
 */
export async function testDeFiLlamaFetchers() {
  console.log('[DeFiLlama] Testing fetchers...');
  
  const yieldAlerts = await fetchYieldAlerts();
  console.log(`[DeFiLlama] Found ${yieldAlerts.length} yield alerts`);
  
  const tvlAlerts = await fetchTVLAlerts();
  console.log(`[DeFiLlama] Found ${tvlAlerts.length} TVL alerts`);
  
  return [...yieldAlerts, ...tvlAlerts];
}
