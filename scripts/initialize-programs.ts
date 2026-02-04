/**
 * Agent News Wire - Program Initialization Script
 * 
 * Initializes all three Solana programs on devnet:
 * - SubscriptionRegistry
 * - AlertRegistry  
 * - PublisherRegistry
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { BorshCoder, Idl } from '@coral-xyz/anchor';

// Program IDs (deployed to devnet)
const SUBSCRIPTION_PROGRAM_ID = new PublicKey('H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ');
const ALERT_PROGRAM_ID = new PublicKey('BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t');
const PUBLISHER_PROGRAM_ID = new PublicKey('H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc');

// Devnet USDC mint (SPL Token devnet)
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Configuration
const PRICE_PER_ALERT = 20000; // 0.02 USDC (6 decimals)
const TREASURY_FEE_BPS = 3000; // 30%
const MIN_PUBLISHER_STAKE = 100_000_000; // 100 USDC
const PUBLISHER_SHARE_BPS = 5000; // 50%

async function main() {
  console.log('🚀 Agent News Wire - Program Initialization\n');
  
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('Connected to devnet');
  
  // Load wallet from default Solana CLI location
  const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found at', walletPath);
    console.log('Run: solana-keygen new');
    process.exit(1);
  }
  
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  console.log('Wallet:', wallet.publicKey.toBase58());
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL\n');
  
  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL');
    console.log('Run: solana airdrop 1');
    process.exit(1);
  }
  
  // Create treasury token account (just use wallet for now)
  const treasury = wallet.publicKey;
  
  // === Initialize SubscriptionRegistry ===
  console.log('📝 Initializing SubscriptionRegistry...');
  
  const [subscriptionConfig, subscriptionConfigBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    SUBSCRIPTION_PROGRAM_ID
  );
  console.log('  Config PDA:', subscriptionConfig.toBase58());
  
  // Check if already initialized
  const subscriptionConfigInfo = await connection.getAccountInfo(subscriptionConfig);
  if (subscriptionConfigInfo) {
    console.log('  ✅ Already initialized\n');
  } else {
    try {
      // Build initialize instruction using Anchor discriminator
      const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize
      const data = Buffer.alloc(8 + 8 + 2);
      discriminator.copy(data, 0);
      data.writeBigUInt64LE(BigInt(PRICE_PER_ALERT), 8);
      data.writeUInt16LE(TREASURY_FEE_BPS, 16);
      
      const initSubscriptionIx = new TransactionInstruction({
        programId: SUBSCRIPTION_PROGRAM_ID,
        keys: [
          { pubkey: subscriptionConfig, isSigner: false, isWritable: true },
          { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
          { pubkey: treasury, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });
      
      const tx = new Transaction().add(initSubscriptionIx);
      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log('  ✅ Initialized! Tx:', sig, '\n');
    } catch (err: any) {
      console.log('  ⚠️  Init failed (may already exist):', err.message, '\n');
    }
  }
  
  // === Initialize AlertRegistry ===
  console.log('📝 Initializing AlertRegistry...');
  
  const [alertRegistry, alertRegistryBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry')],
    ALERT_PROGRAM_ID
  );
  console.log('  Registry PDA:', alertRegistry.toBase58());
  
  const alertRegistryInfo = await connection.getAccountInfo(alertRegistry);
  if (alertRegistryInfo) {
    console.log('  ✅ Already initialized\n');
  } else {
    try {
      // Build initialize instruction
      const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize
      
      const initAlertIx = new TransactionInstruction({
        programId: ALERT_PROGRAM_ID,
        keys: [
          { pubkey: alertRegistry, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });
      
      const tx = new Transaction().add(initAlertIx);
      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log('  ✅ Initialized! Tx:', sig, '\n');
    } catch (err: any) {
      console.log('  ⚠️  Init failed (may already exist):', err.message, '\n');
    }
  }
  
  // === Initialize PublisherRegistry ===
  console.log('📝 Initializing PublisherRegistry...');
  
  const [publisherRegistry, publisherRegistryBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('publisher_registry')],
    PUBLISHER_PROGRAM_ID
  );
  console.log('  Registry PDA:', publisherRegistry.toBase58());
  
  const publisherRegistryInfo = await connection.getAccountInfo(publisherRegistry);
  if (publisherRegistryInfo) {
    console.log('  ✅ Already initialized\n');
  } else {
    try {
      // Build initialize instruction
      const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize
      const data = Buffer.alloc(8 + 8 + 2);
      discriminator.copy(data, 0);
      data.writeBigUInt64LE(BigInt(MIN_PUBLISHER_STAKE), 8);
      data.writeUInt16LE(PUBLISHER_SHARE_BPS, 16);
      
      const initPublisherIx = new TransactionInstruction({
        programId: PUBLISHER_PROGRAM_ID,
        keys: [
          { pubkey: publisherRegistry, isSigner: false, isWritable: true },
          { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });
      
      const tx = new Transaction().add(initPublisherIx);
      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log('  ✅ Initialized! Tx:', sig, '\n');
    } catch (err: any) {
      console.log('  ⚠️  Init failed (may already exist):', err.message, '\n');
    }
  }
  
  // === Summary ===
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 Initialization Summary\n');
  console.log('Programs:');
  console.log('  SubscriptionRegistry:', SUBSCRIPTION_PROGRAM_ID.toBase58());
  console.log('  AlertRegistry:       ', ALERT_PROGRAM_ID.toBase58());
  console.log('  PublisherRegistry:   ', PUBLISHER_PROGRAM_ID.toBase58());
  console.log('\nPDAs:');
  console.log('  Subscription Config: ', subscriptionConfig.toBase58());
  console.log('  Alert Registry:      ', alertRegistry.toBase58());
  console.log('  Publisher Registry:  ', publisherRegistry.toBase58());
  console.log('\nConfiguration:');
  console.log('  Price per alert:     ', PRICE_PER_ALERT / 1e6, 'USDC');
  console.log('  Treasury fee:        ', TREASURY_FEE_BPS / 100, '%');
  console.log('  Min publisher stake: ', MIN_PUBLISHER_STAKE / 1e6, 'USDC');
  console.log('  Publisher share:     ', PUBLISHER_SHARE_BPS / 100, '%');
  console.log('\nUSDC Mint (devnet):', DEVNET_USDC_MINT.toBase58());
  console.log('Treasury:', treasury.toBase58());
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('✅ Initialization complete!');
}

main().catch(console.error);
