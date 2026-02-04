/**
 * Demo subscriber agent
 * Shows how an AI agent would connect and react to alerts
 * 
 * Run: npx tsx demo/subscriber.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

interface Alert {
  alertId: string;
  channel: string;
  priority: string;
  headline: string;
  summary: string;
  sentiment?: string;
  impactScore?: number;
}

async function main() {
  console.log('🤖 Agent News Wire - Demo Subscriber\n');

  // Step 1: Create subscription
  console.log('📝 Creating subscription...');
  const subscribeRes = await fetch(`${API_URL}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channels: [
        'regulatory/sec',
        'markets/whale-movements',
        'defi/yields'
      ]
    })
  });

  const subscription = await subscribeRes.json();
  console.log(`✅ Subscribed: ${subscription.subscriber.id}`);
  console.log(`   Channels: ${subscription.subscriber.channels.join(', ')}\n`);

  // Step 2: Deposit some USDC (mock)
  console.log('💰 Depositing 10 USDC...');
  const depositRes = await fetch(`${API_URL}/api/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriberId: subscription.subscriber.id,
      amount: 10
    })
  });

  const deposit = await depositRes.json();
  console.log(`✅ Balance: ${deposit.balance} USDC\n`);

  // Step 3: Connect via WebSocket
  console.log('🔌 Connecting to WebSocket stream...');
  
  // Dynamic import for WebSocket (works in Node 18+)
  const { WebSocket } = await import('ws');
  
  const ws = new WebSocket(`${WS_URL}/api/stream?subscriberId=${subscription.subscriber.id}`);

  ws.on('open', () => {
    console.log('✅ Connected! Waiting for alerts...\n');
    console.log('─'.repeat(60));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'connected') {
      console.log(`🟢 ${message.message}`);
      return;
    }

    if (message.type === 'alert') {
      const alert: Alert = message.alert;
      const priority = alert.priority === 'critical' ? '🚨' 
        : alert.priority === 'high' ? '🔴' 
        : alert.priority === 'medium' ? '🟡' 
        : '🟢';
      
      console.log(`\n${priority} [${alert.channel}] ${alert.headline}`);
      console.log(`   ${alert.summary.slice(0, 100)}...`);
      if (alert.impactScore) {
        console.log(`   Impact: ${alert.impactScore}/10 | Sentiment: ${alert.sentiment || 'neutral'}`);
      }
      console.log(`   Charged: $${message.charged}`);
      console.log('─'.repeat(60));

      // Example: Agent could take action based on alert
      reactToAlert(alert);
    }

    if (message.type === 'warning') {
      console.log(`⚠️  Warning: ${message.message}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('\n🔴 Disconnected from stream');
    process.exit(0);
  });

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    ws.close();
  });
}

/**
 * Example: Agent reacts to alerts
 */
function reactToAlert(alert: Alert) {
  // High-impact SEC filing
  if (alert.channel === 'regulatory/sec' && (alert.impactScore || 0) >= 7) {
    console.log('   🤖 ACTION: Would analyze filing and draft summary');
  }

  // Whale movement
  if (alert.channel === 'markets/whale-movements') {
    if (alert.sentiment === 'bullish') {
      console.log('   🤖 ACTION: Bullish signal detected - would flag for review');
    } else if (alert.sentiment === 'bearish') {
      console.log('   🤖 ACTION: Bearish signal - would check portfolio exposure');
    }
  }

  // High yield opportunity
  if (alert.channel === 'defi/yields' && (alert.impactScore || 0) >= 6) {
    console.log('   🤖 ACTION: Would analyze yield opportunity risk/reward');
  }
}

main().catch(console.error);
