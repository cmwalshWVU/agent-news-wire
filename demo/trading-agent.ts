/**
 * Trading Agent - Subscribes to alerts and takes action
 * 
 * This agent simulates an AI trading bot that:
 * 1. Subscribes to relevant news channels
 * 2. Receives real-time alerts via WebSocket
 * 3. Analyzes alerts and decides on actions
 * 4. Executes trades (simulated) based on intelligence
 * 
 * Run: npx tsx demo/trading-agent.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

interface Alert {
  alertId: string;
  channel: string;
  priority: string;
  headline: string;
  summary: string;
  tickers: string[];
  tokens: string[];
  sentiment?: string;
  impactScore?: number;
  sourceType?: string;
  publisherId?: string;
  publisherName?: string;
}

interface Position {
  asset: string;
  amount: number;
  entryPrice: number;
}

class TradingAgent {
  private subscriberId: string | null = null;
  private ws: any = null;
  private alertsReceived = 0;
  private actionsTriggered = 0;
  
  // Simulated portfolio
  private portfolio: Position[] = [
    { asset: 'SOL', amount: 100, entryPrice: 175 },
    { asset: 'USDC', amount: 5000, entryPrice: 1 },
    { asset: 'JUP', amount: 2000, entryPrice: 0.85 }
  ];

  async subscribe(): Promise<void> {
    console.log('📝 Creating subscription...');
    
    const res = await fetch(`${API_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      throw new Error('Subscription failed');
    }

    const data = await res.json();
    this.subscriberId = data.subscriber.id;

    console.log(`✅ Subscribed: ${this.subscriberId}`);
    console.log(`   Channels: ${data.subscriber.channels.join(', ')}\n`);
  }

  async connectStream(): Promise<void> {
    console.log('🔌 Connecting to alert stream...');
    
    const { WebSocket } = await import('ws');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}/api/stream?subscriberId=${this.subscriberId}`);

      this.ws.on('open', () => {
        console.log('✅ Connected to real-time stream!\n');
        console.log('─'.repeat(60));
        console.log('👂 Listening for alerts... (Ctrl+C to stop)\n');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(JSON.parse(data.toString()));
      });

      this.ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('\n🔴 Disconnected from stream');
      });
    });
  }

  private handleMessage(message: any): void {
    if (message.type === 'connected') {
      console.log(`🟢 ${message.message}`);
      return;
    }

    if (message.type === 'alert') {
      this.alertsReceived++;
      this.processAlert(message.data || message.alert);
      return;
    }

    if (message.type === 'warning') {
      console.log(`⚠️  ${message.message}`);
      return;
    }
  }

  private processAlert(alert: Alert): void {
    const priorityEmoji = alert.priority === 'critical' ? '🚨' 
      : alert.priority === 'high' ? '🔴' 
      : alert.priority === 'medium' ? '🟡' 
      : '🟢';

    const sourceLabel = alert.sourceType === 'agent' 
      ? `🤖 ${alert.publisherName || 'Agent'}` 
      : '📰 Wire';

    console.log(`\n${priorityEmoji} NEW ALERT [${alert.channel}]`);
    console.log(`   ${alert.headline}`);
    console.log(`   Source: ${sourceLabel}`);
    if (alert.impactScore) {
      console.log(`   Impact: ${alert.impactScore}/10 | Sentiment: ${alert.sentiment || 'neutral'}`);
    }
    if (alert.tickers.length > 0) {
      console.log(`   Tickers: ${alert.tickers.join(', ')}`);
    }

    // Analyze and potentially act
    const action = this.analyzeAndDecide(alert);
    if (action) {
      this.actionsTriggered++;
      this.executeAction(action, alert);
    }

    console.log('─'.repeat(60));
  }

  private analyzeAndDecide(alert: Alert): TradeAction | null {
    const impact = alert.impactScore || 5;
    const sentiment = alert.sentiment;

    // Rule 1: High-impact whale movements
    if (alert.channel === 'markets/whale-movements' && impact >= 8) {
      if (sentiment === 'bearish' && this.hasPosition('SOL')) {
        return {
          type: 'REDUCE_EXPOSURE',
          asset: 'SOL',
          reason: 'Large whale transfer to exchange - potential sell pressure',
          urgency: 'high'
        };
      }
    }

    // Rule 2: High yield opportunities
    if (alert.channel === 'defi/yields' && impact >= 7) {
      if (sentiment === 'bullish' && this.hasPosition('USDC')) {
        return {
          type: 'DEPLOY_CAPITAL',
          asset: 'USDC',
          reason: 'High yield opportunity detected',
          urgency: 'medium'
        };
      }
    }

    // Rule 3: Regulatory news
    if (alert.channel === 'regulatory/sec' && impact >= 7) {
      if (sentiment === 'bullish') {
        return {
          type: 'INCREASE_EXPOSURE',
          asset: 'BTC',
          reason: 'Positive regulatory signal - institutional adoption catalyst',
          urgency: 'low'
        };
      } else if (sentiment === 'bearish') {
        return {
          type: 'HEDGE',
          asset: 'PORTFOLIO',
          reason: 'Regulatory headwind - reduce risk exposure',
          urgency: 'high'
        };
      }
    }

    // Rule 4: Network upgrades
    if (alert.channel === 'networks/solana' && impact >= 6 && sentiment === 'bullish') {
      if (!alert.headline.toLowerCase().includes('issue') && 
          !alert.headline.toLowerCase().includes('outage')) {
        return {
          type: 'ACCUMULATE',
          asset: 'SOL',
          reason: 'Positive network development',
          urgency: 'low'
        };
      }
    }

    // Rule 5: Protocol volume spikes
    if (alert.channel === 'defi/protocols' && 
        alert.tickers.includes('JUP') && 
        this.hasPosition('JUP')) {
      return {
        type: 'MONITOR',
        asset: 'JUP',
        reason: 'Protocol activity spike - evaluate position',
        urgency: 'low'
      };
    }

    return null;
  }

  private hasPosition(asset: string): boolean {
    return this.portfolio.some(p => p.asset === asset && p.amount > 0);
  }

  private executeAction(action: TradeAction, alert: Alert): void {
    const urgencyEmoji = action.urgency === 'high' ? '⚡' 
      : action.urgency === 'medium' ? '📋' 
      : '📝';

    console.log(`\n   ${urgencyEmoji} ACTION: ${action.type}`);
    console.log(`   Asset: ${action.asset}`);
    console.log(`   Reason: ${action.reason}`);

    // Simulate trade execution based on action type
    switch (action.type) {
      case 'REDUCE_EXPOSURE':
        console.log(`   📉 Would sell 25% of ${action.asset} position`);
        console.log(`   🎯 Set stop-loss 5% below current price`);
        break;

      case 'DEPLOY_CAPITAL':
        console.log(`   💰 Would deploy 20% of USDC to yield protocol`);
        console.log(`   🔒 Max allocation: $1,000 until APY verified stable`);
        break;

      case 'INCREASE_EXPOSURE':
        console.log(`   📈 Would DCA into ${action.asset} over next 24h`);
        console.log(`   💵 Allocation: 10% of available capital`);
        break;

      case 'HEDGE':
        console.log(`   🛡️ Would open hedge position`);
        console.log(`   📊 Target: 20% portfolio hedge via perps`);
        break;

      case 'ACCUMULATE':
        console.log(`   🛒 Would add to ${action.asset} position`);
        console.log(`   ⏰ Execute via limit orders 2% below current`);
        break;

      case 'MONITOR':
        console.log(`   👀 Adding to watchlist - no immediate action`);
        console.log(`   🔔 Alert if 24h volume exceeds 2x average`);
        break;
    }
  }

  printPortfolio(): void {
    console.log('\n💼 PORTFOLIO STATUS:');
    console.log('─'.repeat(40));
    for (const pos of this.portfolio) {
      console.log(`   ${pos.asset}: ${pos.amount} @ $${pos.entryPrice}`);
    }
    console.log('─'.repeat(40));
  }

  printStats(): void {
    console.log('\n📊 SESSION STATS:');
    console.log(`   Alerts Received: ${this.alertsReceived}`);
    console.log(`   Actions Triggered: ${this.actionsTriggered}`);
    console.log(`   Action Rate: ${this.alertsReceived > 0 ? ((this.actionsTriggered / this.alertsReceived) * 100).toFixed(1) : 0}%`);
  }

  async run(): Promise<void> {
    console.log('═'.repeat(60));
    console.log('🤖 TRADING AGENT - Alert-Driven Execution');
    console.log('═'.repeat(60));
    console.log(`   API: ${API_URL}`);
    console.log(`   WebSocket: ${WS_URL}\n`);

    this.printPortfolio();
    console.log('');

    await this.subscribe();
    await this.connectStream();

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Shutting down...');
      this.printStats();
      if (this.ws) {
        this.ws.close();
      }
      process.exit(0);
    });
  }
}

interface TradeAction {
  type: 'REDUCE_EXPOSURE' | 'DEPLOY_CAPITAL' | 'INCREASE_EXPOSURE' | 'HEDGE' | 'ACCUMULATE' | 'MONITOR';
  asset: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

// Run the agent
const agent = new TradingAgent();
agent.run().catch(console.error);
