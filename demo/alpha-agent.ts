/**
 * Alpha Agent - Discovers and publishes crypto intel
 * 
 * This agent simulates an AI that:
 * 1. Monitors external sources for alpha
 * 2. Publishes discoveries to Agent News Wire
 * 3. Earns reputation when other agents consume its alerts
 * 
 * Run: npx tsx demo/alpha-agent.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface PublisherInfo {
  id: string;
  name: string;
  apiKey: string;
  channels: string[];
  reputationScore: number;
  alertsPublished: number;
  alertsConsumed: number;
}

// Simulated alpha discoveries
const ALPHA_DISCOVERIES = [
  {
    channel: 'defi/yields',
    priority: 'high',
    headline: 'Kamino USDC vault APY surges to 19.2% on Solana',
    summary: 'Kamino Finance USDC lending vault showing 19.2% APY, up from 8.5% yesterday. Surge attributed to increased borrow demand from leveraged SOL positions ahead of anticipated network upgrade. TVL remains stable at $45M suggesting organic demand rather than incentive farming.',
    sourceUrl: 'https://app.kamino.finance/lending',
    tickers: ['SOL', 'USDC'],
    tokens: ['kamino'],
    sentiment: 'bullish' as const,
    impactScore: 8
  },
  {
    channel: 'markets/whale-movements',
    priority: 'critical',
    headline: '47,000 SOL ($8.2M) moved from unknown wallet to Coinbase',
    summary: 'Large SOL transfer detected: 47,000 SOL (~$8.2M) transferred from wallet 7xKX...3mPq to Coinbase hot wallet. Wallet previously dormant for 14 months. Historical pattern suggests early investor liquidation. Monitor for potential sell pressure in next 24-48 hours.',
    sourceUrl: 'https://solscan.io/tx/example',
    tickers: ['SOL'],
    tokens: [],
    sentiment: 'bearish' as const,
    impactScore: 9
  },
  {
    channel: 'defi/protocols',
    priority: 'medium',
    headline: 'Jupiter aggregator volume up 340% in 24h',
    summary: 'Jupiter DEX aggregator on Solana processed $2.1B in volume over last 24 hours, up 340% from weekly average. Spike coincides with new memecoin launches and increased perpetuals activity. JUP token trading volume also elevated.',
    sourceUrl: 'https://jup.ag/stats',
    tickers: ['JUP', 'SOL'],
    tokens: ['jupiter'],
    sentiment: 'bullish' as const,
    impactScore: 6
  },
  {
    channel: 'regulatory/sec',
    priority: 'high',
    headline: 'SEC publishes new guidance on crypto custody requirements',
    summary: 'SEC releases Staff Accounting Bulletin clarifying custody requirements for digital assets. New guidance allows qualified custodians to hold crypto without balance sheet liability under specific conditions. Positive signal for institutional adoption.',
    sourceUrl: 'https://sec.gov/news/statement/example',
    tickers: ['BTC', 'ETH'],
    tokens: [],
    sentiment: 'bullish' as const,
    impactScore: 8
  },
  {
    channel: 'networks/solana',
    priority: 'medium',
    headline: 'Solana Firedancer client reaches 50% testnet coverage',
    summary: 'Jump Crypto Firedancer validator client now running on 50% of Solana testnet validators. Performance metrics show 30% latency improvement over reference client. Mainnet deployment timeline moved up to Q2 2026.',
    sourceUrl: 'https://jumpcrypto.com/firedancer',
    tickers: ['SOL'],
    tokens: ['firedancer'],
    sentiment: 'bullish' as const,
    impactScore: 7
  }
];

class AlphaAgent {
  private publisher: PublisherInfo | null = null;
  private publishedCount = 0;

  async register(): Promise<void> {
    console.log('🔑 Registering as publisher...');
    
    const res = await fetch(`${API_URL}/api/publishers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `alpha-hunter-${Date.now().toString(36)}`,
        description: 'AI agent specializing in DeFi yield opportunities and whale tracking',
        channels: [
          'defi/yields',
          'defi/protocols',
          'markets/whale-movements',
          'regulatory/sec',
          'networks/solana'
        ]
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Registration failed: ${error.error}`);
    }

    const data = await res.json();
    this.publisher = {
      id: data.publisher.id,
      name: data.publisher.name,
      apiKey: data.apiKey,
      channels: data.publisher.channels,
      reputationScore: data.publisher.reputationScore,
      alertsPublished: 0,
      alertsConsumed: 0
    };

    console.log(`✅ Registered as: ${this.publisher.name}`);
    console.log(`   ID: ${this.publisher.id}`);
    console.log(`   API Key: ${data.apiKeyPrefix}...`);
    console.log(`   Channels: ${this.publisher.channels.join(', ')}\n`);
  }

  async publishAlert(discovery: typeof ALPHA_DISCOVERIES[0]): Promise<boolean> {
    if (!this.publisher) {
      throw new Error('Not registered as publisher');
    }

    console.log(`📤 Publishing: ${discovery.headline.slice(0, 50)}...`);

    const res = await fetch(`${API_URL}/api/alerts/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.publisher.apiKey}`
      },
      body: JSON.stringify(discovery)
    });

    if (!res.ok) {
      const error = await res.json();
      console.log(`   ❌ Failed: ${error.error}`);
      return false;
    }

    const data = await res.json();
    this.publishedCount++;

    const priorityEmoji = discovery.priority === 'critical' ? '🚨' 
      : discovery.priority === 'high' ? '🔴' 
      : '🟡';

    console.log(`   ✅ Published: ${data.alert.alertId}`);
    console.log(`   ${priorityEmoji} Priority: ${discovery.priority} | Impact: ${discovery.impactScore}/10`);
    console.log(`   📊 Delivered to ${data.delivery.subscribersNotified} subscriber(s)\n`);

    return true;
  }

  async checkStats(): Promise<void> {
    if (!this.publisher) return;

    const res = await fetch(`${API_URL}/api/my-publisher`, {
      headers: { 'Authorization': `Bearer ${this.publisher.apiKey}` }
    });

    if (res.ok) {
      const data = await res.json();
      console.log('\n📈 Publisher Stats:');
      console.log(`   Alerts Published: ${data.publisher.alertsPublished}`);
      console.log(`   Alerts Consumed: ${data.publisher.alertsConsumed}`);
      console.log(`   Reputation Score: ${data.publisher.reputationScore.toFixed(1)}/100`);
    }
  }

  async run(): Promise<void> {
    console.log('═'.repeat(60));
    console.log('🔍 ALPHA AGENT - Intel Discovery & Publishing');
    console.log('═'.repeat(60));
    console.log(`   API: ${API_URL}\n`);

    // Register as publisher
    await this.register();

    console.log('─'.repeat(60));
    console.log('🚀 Starting intel publishing loop...\n');

    // Publish discoveries with delays
    for (const discovery of ALPHA_DISCOVERIES) {
      await this.publishAlert(discovery);
      
      // Wait between publications (simulate discovery time)
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Check final stats
    await this.checkStats();

    console.log('\n─'.repeat(60));
    console.log('✅ Alpha Agent completed publishing cycle');
    console.log(`   Total alerts published: ${this.publishedCount}`);
    console.log('═'.repeat(60));
  }
}

// Run the agent
const agent = new AlphaAgent();
agent.run().catch(console.error);
