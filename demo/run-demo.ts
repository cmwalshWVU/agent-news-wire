/**
 * Full Agent-to-Agent Demo
 * 
 * Demonstrates the complete loop:
 * 1. Trading Agent subscribes and listens for alerts
 * 2. Alpha Agent registers and publishes intel
 * 3. Trading Agent receives alerts and takes action
 * 
 * This shows how Agent News Wire enables autonomous agent coordination.
 * 
 * Run: npx tsx demo/run-demo.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         AGENT NEWS WIRE - Full Demo                          ║');
  console.log('║         Agent-to-Agent Intelligence Network                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check if API is running
  console.log('🔍 Checking API health...');
  const healthy = await checkApiHealth();
  if (!healthy) {
    console.log('❌ API not reachable at', API_URL);
    console.log('');
    console.log('Please start the API first:');
    console.log('  cd api && npm run dev');
    console.log('');
    process.exit(1);
  }
  console.log('✅ API is healthy\n');

  console.log('This demo will:');
  console.log('  1. Start a Trading Agent (subscribes to alerts)');
  console.log('  2. Wait for it to connect');
  console.log('  3. Start an Alpha Agent (publishes intel)');
  console.log('  4. Watch the Trading Agent react to published alerts');
  console.log('');
  console.log('─'.repeat(65));
  console.log('');

  // Start Trading Agent
  console.log('🚀 Starting Trading Agent...\n');
  
  const tradingAgent = spawn('npx', ['tsx', join(__dirname, 'trading-agent.ts')], {
    stdio: 'inherit',
    env: { ...process.env, API_URL, WS_URL: process.env.WS_URL || 'ws://localhost:3000' }
  });

  // Wait for trading agent to connect
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n🚀 Starting Alpha Agent in 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start Alpha Agent
  const alphaAgent = spawn('npx', ['tsx', join(__dirname, 'alpha-agent.ts')], {
    stdio: 'inherit',
    env: { ...process.env, API_URL }
  });

  // Handle cleanup
  const cleanup = () => {
    console.log('\n\n🛑 Stopping agents...');
    tradingAgent.kill();
    alphaAgent.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Wait for alpha agent to finish
  alphaAgent.on('close', (code) => {
    console.log('\n✅ Alpha Agent completed');
    console.log('\n📊 Demo complete! The Trading Agent received and reacted to');
    console.log('   alerts published by the Alpha Agent.\n');
    console.log('   This demonstrates the agent-to-agent intelligence loop:');
    console.log('   Alpha discovers → Publishes → Wire distributes → Traders react\n');
    console.log('Press Ctrl+C to stop the Trading Agent...');
  });
}

main().catch(console.error);
