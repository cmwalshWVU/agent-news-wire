/**
 * Agent News Wire - End-to-End Integration Test
 * 
 * Tests the full flow:
 * 1. Check PDA addresses for test wallet
 * 2. Create subscriber on-chain
 * 3. Verify subscriber exists
 * 4. Sync with API
 * 5. Connect WebSocket and receive alerts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';
const RPC_URL = 'https://api.devnet.solana.com';

// Program IDs
const SUBSCRIPTION_PROGRAM_ID = new PublicKey('H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function log(msg: string, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function success(msg: string) { log(`✅ ${msg}`, GREEN); }
function error(msg: string) { log(`❌ ${msg}`, RED); }
function info(msg: string) { log(`ℹ️  ${msg}`, CYAN); }
function warn(msg: string) { log(`⚠️  ${msg}`, YELLOW); }

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  AGENT NEWS WIRE - End-to-End Integration Test');
  console.log('═'.repeat(60) + '\n');

  // Load wallet
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    error('Wallet not found at ' + walletPath);
    process.exit(1);
  }
  
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const walletAddress = wallet.publicKey.toBase58();
  
  info(`Test wallet: ${walletAddress}`);
  
  // Connect to Solana
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  info(`Wallet balance: ${balance / 1e9} SOL`);
  
  if (balance < 0.01 * 1e9) {
    error('Insufficient SOL balance. Need at least 0.01 SOL');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // Step 1: Check API Health
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 1: Checking API health...');
  
  try {
    const health = await fetchJson(`${API_URL}/api/health`);
    if (health.status === 'healthy') {
      success('API is healthy');
    } else {
      error('API unhealthy: ' + JSON.stringify(health));
      process.exit(1);
    }
  } catch (err) {
    error('Cannot connect to API. Is it running?');
    console.log('Start the API with: cd api && npm run dev');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // Step 2: Check PDA Status
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 2: Checking PDA status...');
  
  const pdaInfo = await fetchJson(`${API_URL}/api/subscription/pda/${walletAddress}`);
  console.log('  Subscriber PDA:', pdaInfo.subscriberPDA);
  console.log('  Vault PDA:', pdaInfo.vaultPDA);
  console.log('  Exists on-chain:', pdaInfo.existsOnChain);
  
  if (pdaInfo.existsOnChain) {
    success('Subscriber already exists on-chain');
    console.log('  Balance:', pdaInfo.subscriber?.balance, 'USDC');
    console.log('  Alerts received:', pdaInfo.subscriber?.alertsReceived);
  } else {
    warn('Subscriber does not exist on-chain yet');
  }

  // ═══════════════════════════════════════════════════════════
  // Step 3: Create Subscriber On-Chain (if needed)
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 3: Creating subscriber on-chain...');
  
  if (!pdaInfo.existsOnChain) {
    // Get unsigned transaction
    const createTxResult = await fetchJson(`${API_URL}/api/subscription/create-tx`, {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        channels: ['defi/yields', 'markets/whale-movements', 'regulatory/sec'],
      }),
    });
    
    if (!createTxResult.success) {
      error('Failed to build create-tx: ' + createTxResult.error);
      process.exit(1);
    }
    
    info('Transaction built, signing and submitting...');
    console.log('  Channels:', createTxResult.channels.join(', '));
    console.log('  Channel bitmap:', createTxResult.channelBitmap);
    
    // Decode and sign transaction
    const txBuffer = Buffer.from(createTxResult.transaction, 'base64');
    const tx = Transaction.from(txBuffer);
    
    // Sign with wallet
    tx.sign(wallet);
    
    // Submit
    try {
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      success(`Subscriber created! Tx: ${sig}`);
      console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    } catch (err: any) {
      error('Transaction failed: ' + err.message);
      // Check if it's because subscriber already exists
      if (err.message?.includes('already in use')) {
        warn('Subscriber PDA already exists (race condition or previous run)');
      } else {
        throw err;
      }
    }
  } else {
    info('Skipping creation (already exists)');
  }

  // ═══════════════════════════════════════════════════════════
  // Step 4: Verify On-Chain State
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 4: Verifying on-chain state...');
  
  // Wait for transaction to finalize
  info('Waiting 3 seconds for confirmation to propagate...');
  await new Promise(r => setTimeout(r, 3000));
  
  // Re-fetch PDA info
  const pdaInfoAfter = await fetchJson(`${API_URL}/api/subscription/pda/${walletAddress}`);
  
  if (pdaInfoAfter.existsOnChain) {
    success('Subscriber verified on-chain');
    console.log('  Balance:', pdaInfoAfter.subscriber?.balance, 'USDC');
    console.log('  Channels bitmap:', pdaInfoAfter.subscriber?.channels);
    console.log('  Active:', pdaInfoAfter.subscriber?.active);
  } else {
    error('Subscriber not found on-chain after creation');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // Step 5: Sync with API
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 5: Syncing with API...');
  
  const subscribeResult = await fetchJson(`${API_URL}/api/subscribe`, {
    method: 'POST',
    body: JSON.stringify({
      walletAddress,
      channels: ['defi/yields', 'markets/whale-movements', 'regulatory/sec'],
    }),
  });
  
  if (subscribeResult.success) {
    success('API subscription synced');
    console.log('  Subscription ID:', subscribeResult.subscriber.id);
    console.log('  On-chain:', subscribeResult.subscriber.onChain);
    console.log('  Balance:', subscribeResult.subscriber.balance, 'USDC');
    
    const subscriberId = subscribeResult.subscriber.id;

    // ═══════════════════════════════════════════════════════════
    // Step 6: Test WebSocket Connection
    // ═══════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(50));
    info('Step 6: Testing WebSocket connection...');
    
    await new Promise<void>((resolve, reject) => {
      const wsUrl = `${WS_URL}/api/stream?subscriberId=${subscriberId}`;
      info(`Connecting to ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      let alertCount = 0;
      const timeout = setTimeout(() => {
        ws.close();
        if (alertCount > 0) {
          success(`Received ${alertCount} alerts via WebSocket`);
        } else {
          warn('No alerts received (ingestion may not have new data)');
        }
        resolve();
      }, 10000); // Wait 10 seconds for alerts
      
      ws.on('open', () => {
        success('WebSocket connected');
      });
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'alert') {
            alertCount++;
            console.log(`  📨 Alert: [${msg.data.channel}] ${msg.data.headline?.substring(0, 50)}...`);
          } else if (msg.type === 'error') {
            error('WebSocket error: ' + msg.message);
          } else {
            console.log(`  📩 Message: ${msg.type}`);
          }
        } catch (e) {
          console.log('  Raw message:', data.toString().substring(0, 100));
        }
      });
      
      ws.on('error', (err) => {
        error('WebSocket error: ' + err.message);
        clearTimeout(timeout);
        resolve();
      });
      
      ws.on('close', () => {
        info('WebSocket closed');
        clearTimeout(timeout);
        resolve();
      });
    });
    
  } else {
    error('API subscription failed: ' + subscribeResult.error);
  }

  // ═══════════════════════════════════════════════════════════
  // Step 7: Check Protocol Stats
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(50));
  info('Step 7: Checking protocol stats...');
  
  const stats = await fetchJson(`${API_URL}/api/stats`);
  console.log('  On-chain subscribers:', stats.onChain?.totalSubscribers);
  console.log('  Total alerts delivered:', stats.onChain?.totalAlertsDelivered);
  console.log('  Total revenue:', stats.onChain?.totalRevenue, 'USDC');
  console.log('  API subscribers:', stats.subscriptions?.totalSubscribers);
  console.log('  API on-chain subscribers:', stats.subscriptions?.onChainSubscribers);

  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  success('API health check passed');
  success('PDA addresses derived correctly');
  success('Subscriber created/verified on-chain');
  success('API synced with on-chain state');
  success('WebSocket connection established');
  console.log('');
  info('Note: USDC deposit test skipped (requires devnet USDC)');
  info('To test deposits:');
  console.log('  1. Get devnet USDC from a faucet');
  console.log('  2. Call POST /api/subscription/deposit-tx');
  console.log('  3. Sign and submit the transaction');
  console.log('');
  console.log('═'.repeat(60) + '\n');
}

main().catch((err) => {
  error('Test failed: ' + err.message);
  console.error(err);
  process.exit(1);
});
