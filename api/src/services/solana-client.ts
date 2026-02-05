/**
 * Solana Client Service
 * 
 * Handles all on-chain interactions for Agent News Wire:
 * - Subscriber account management
 * - USDC deposits/withdrawals
 * - Alert charging
 * - Balance queries
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
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Program IDs (devnet)
export const SUBSCRIPTION_PROGRAM_ID = new PublicKey('H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ');
export const ALERT_PROGRAM_ID = new PublicKey('BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t');
export const PUBLISHER_PROGRAM_ID = new PublicKey('H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc');

// Devnet USDC mint
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// PDA addresses (from initialization)
export const SUBSCRIPTION_CONFIG_PDA = new PublicKey('7pobVEtga9fSLngK3EUgtu45WuqrrnTgBsHPAc4cYRQN');
export const ALERT_REGISTRY_PDA = new PublicKey('ErwSC32EUrF9PNcbqeT1Hdn85x2VhHVMfXUFTqyD5uWs');
export const PUBLISHER_REGISTRY_PDA = new PublicKey('3H8MprBvoDiuKRCoUmYw3x9WipWu8nU9uRWffEzEEzmx');

// Configuration
const PRICE_PER_ALERT = 20000; // 0.02 USDC (6 decimals)

export interface SubscriberAccount {
  owner: PublicKey;
  channels: number;
  balance: bigint;
  alertsReceived: bigint;
  createdAt: bigint;
  active: boolean;
  bump: number;
  vaultBump: number;
}

export interface OnChainConfig {
  authority: PublicKey;
  usdcMint: PublicKey;
  treasury: PublicKey;
  pricePerAlert: bigint;
  treasuryFeeBps: number;
  totalSubscribers: bigint;
  totalAlertsDelivered: bigint;
  totalRevenue: bigint;
}

export class SolanaClient {
  private connection: Connection;
  private distributorWallet: Keypair | null = null;
  
  constructor(rpcUrl: string = 'https://api.devnet.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  /**
   * Load distributor wallet from Solana CLI default location
   */
  async loadDistributorWallet(): Promise<void> {
    const walletPath = path.join(process.env.HOME!, '.config/solana/id.json');
    if (fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      this.distributorWallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
      console.log('[Solana] Loaded distributor wallet:', this.distributorWallet.publicKey.toBase58());
    } else {
      console.warn('[Solana] No wallet found at', walletPath);
    }
  }
  
  /**
   * Get subscriber PDA for a given owner
   */
  getSubscriberPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('subscriber'), owner.toBuffer()],
      SUBSCRIPTION_PROGRAM_ID
    );
  }
  
  /**
   * Get subscriber vault PDA for a given owner
   */
  getSubscriberVaultPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('subscriber_vault'), owner.toBuffer()],
      SUBSCRIPTION_PROGRAM_ID
    );
  }
  
  /**
   * Fetch protocol configuration
   */
  async getConfig(): Promise<OnChainConfig | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(SUBSCRIPTION_CONFIG_PDA);
      if (!accountInfo) return null;
      
      const data = accountInfo.data;
      // Skip 8-byte discriminator
      let offset = 8;
      
      const authority = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const usdcMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const treasury = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const pricePerAlert = data.readBigUInt64LE(offset);
      offset += 8;
      const treasuryFeeBps = data.readUInt16LE(offset);
      offset += 2;
      const totalSubscribers = data.readBigUInt64LE(offset);
      offset += 8;
      const totalAlertsDelivered = data.readBigUInt64LE(offset);
      offset += 8;
      const totalRevenue = data.readBigUInt64LE(offset);
      
      return {
        authority,
        usdcMint,
        treasury,
        pricePerAlert,
        treasuryFeeBps,
        totalSubscribers,
        totalAlertsDelivered,
        totalRevenue,
      };
    } catch (err) {
      console.error('[Solana] Error fetching config:', err);
      return null;
    }
  }
  
  /**
   * Fetch subscriber account data
   * Updated for v2: includes bump and vault_bump fields
   */
  async getSubscriber(owner: PublicKey): Promise<SubscriberAccount | null> {
    try {
      const [subscriberPDA] = this.getSubscriberPDA(owner);
      const accountInfo = await this.connection.getAccountInfo(subscriberPDA);
      if (!accountInfo) return null;
      
      const data = accountInfo.data;
      // Skip 8-byte discriminator
      let offset = 8;
      
      const ownerPubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      const channels = data.readUInt32LE(offset);
      offset += 4;
      const balance = data.readBigUInt64LE(offset);
      offset += 8;
      const alertsReceived = data.readBigUInt64LE(offset);
      offset += 8;
      const createdAt = data.readBigInt64LE(offset);
      offset += 8;
      const active = data.readUInt8(offset) === 1;
      offset += 1;
      const bump = data.readUInt8(offset);
      offset += 1;
      // vault_bump may not exist in old accounts - handle gracefully
      const vaultBump = offset < data.length ? data.readUInt8(offset) : 0;
      
      return {
        owner: ownerPubkey,
        channels,
        balance,
        alertsReceived,
        createdAt,
        active,
        bump,
        vaultBump,
      };
    } catch (err) {
      console.error('[Solana] Error fetching subscriber:', err);
      return null;
    }
  }
  
  /**
   * Get subscriber USDC balance from vault
   */
  async getSubscriberBalance(owner: PublicKey): Promise<bigint> {
    try {
      const subscriber = await this.getSubscriber(owner);
      return subscriber?.balance ?? BigInt(0);
    } catch (err) {
      console.error('[Solana] Error fetching balance:', err);
      return BigInt(0);
    }
  }
  
  /**
   * Check if subscriber exists on-chain
   */
  async subscriberExists(owner: PublicKey): Promise<boolean> {
    const [subscriberPDA] = this.getSubscriberPDA(owner);
    const accountInfo = await this.connection.getAccountInfo(subscriberPDA);
    return accountInfo !== null;
  }
  
  /**
   * Get protocol statistics
   */
  async getStats(): Promise<{
    totalSubscribers: number;
    totalAlertsDelivered: number;
    totalRevenue: number;
    pricePerAlert: number;
  }> {
    const config = await this.getConfig();
    if (!config) {
      return {
        totalSubscribers: 0,
        totalAlertsDelivered: 0,
        totalRevenue: 0,
        pricePerAlert: PRICE_PER_ALERT / 1e6,
      };
    }
    
    return {
      totalSubscribers: Number(config.totalSubscribers),
      totalAlertsDelivered: Number(config.totalAlertsDelivered),
      totalRevenue: Number(config.totalRevenue) / 1e6,
      pricePerAlert: Number(config.pricePerAlert) / 1e6,
    };
  }
  
  /**
   * Create a new subscriber account on-chain (requires owner keypair)
   * Returns the transaction signature
   * 
   * Updated for v2: Now also creates the subscriber_vault TokenAccount
   */
  async createSubscriber(
    ownerKeypair: Keypair,
    channels: number[]
  ): Promise<string> {
    const [subscriberPDA] = this.getSubscriberPDA(ownerKeypair.publicKey);
    const [subscriberVault] = this.getSubscriberVaultPDA(ownerKeypair.publicKey);
    
    // Build instruction
    // Anchor discriminator for create_subscriber = sha256("global:create_subscriber")[0..8]
    const discriminator = Buffer.from([2, 10, 181, 63, 185, 231, 150, 156]);
    const channelsBuffer = Buffer.alloc(4 + channels.length);
    channelsBuffer.writeUInt32LE(channels.length, 0);
    channels.forEach((c, i) => channelsBuffer.writeUInt8(c, 4 + i));
    
    const data = Buffer.concat([discriminator, channelsBuffer]);
    
    // Updated account list for v2 (with vault initialization)
    const ix = new TransactionInstruction({
      programId: SUBSCRIPTION_PROGRAM_ID,
      keys: [
        { pubkey: SUBSCRIPTION_CONFIG_PDA, isSigner: false, isWritable: true },
        { pubkey: subscriberPDA, isSigner: false, isWritable: true },
        { pubkey: subscriberVault, isSigner: false, isWritable: true },
        { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: ownerKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const tx = new Transaction().add(ix);
    return await sendAndConfirmTransaction(this.connection, tx, [ownerKeypair]);
  }

  /**
   * Build createSubscriber transaction for client-side signing
   * Returns base64-encoded transaction that client can sign and send
   * 
   * Updated for v2: Now also creates the subscriber_vault TokenAccount
   */
  async buildCreateSubscriberTx(
    owner: PublicKey,
    channelBitmap: number
  ): Promise<{
    transaction: string;
    subscriberPDA: string;
    subscriberVault: string;
    message: string;
  }> {
    const [subscriberPDA] = this.getSubscriberPDA(owner);
    const [subscriberVault] = this.getSubscriberVaultPDA(owner);
    
    // Check if already exists
    const exists = await this.subscriberExists(owner);
    if (exists) {
      throw new Error('Subscriber already exists on-chain');
    }
    
    // Build instruction data
    // Anchor discriminator for create_subscriber = sha256("global:create_subscriber")[0..8]
    const discriminator = Buffer.from([2, 10, 181, 63, 185, 231, 150, 156]);
    
    // Channels as Vec<u8> - convert bitmap to bytes
    const channelBytes: number[] = [];
    for (let i = 0; i < 4; i++) {
      channelBytes.push((channelBitmap >> (i * 8)) & 0xff);
    }
    // Remove trailing zeros
    while (channelBytes.length > 1 && channelBytes[channelBytes.length - 1] === 0) {
      channelBytes.pop();
    }
    
    const channelsBuffer = Buffer.alloc(4 + channelBytes.length);
    channelsBuffer.writeUInt32LE(channelBytes.length, 0);
    channelBytes.forEach((b, i) => channelsBuffer.writeUInt8(b, 4 + i));
    
    const data = Buffer.concat([discriminator, channelsBuffer]);
    
    // Updated account list for v2 (with vault initialization)
    const ix = new TransactionInstruction({
      programId: SUBSCRIPTION_PROGRAM_ID,
      keys: [
        { pubkey: SUBSCRIPTION_CONFIG_PDA, isSigner: false, isWritable: true },
        { pubkey: subscriberPDA, isSigner: false, isWritable: true },
        { pubkey: subscriberVault, isSigner: false, isWritable: true },
        { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const tx = new Transaction().add(ix);
    
    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = owner;
    
    // Serialize (without signatures - client will sign)
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    return {
      transaction: serialized.toString('base64'),
      subscriberPDA: subscriberPDA.toBase58(),
      subscriberVault: subscriberVault.toBase58(),
      message: 'Sign and submit this transaction to create your on-chain subscription with USDC vault',
    };
  }

  /**
   * Build deposit transaction for client-side signing
   * User deposits USDC from their token account to subscriber vault
   */
  async buildDepositTx(
    owner: PublicKey,
    amount: number // In USDC (will be converted to lamports)
  ): Promise<{
    transaction: string;
    subscriberVault: string;
    amount: number;
    message: string;
  }> {
    const [subscriberPDA] = this.getSubscriberPDA(owner);
    const [subscriberVault, vaultBump] = this.getSubscriberVaultPDA(owner);
    
    // Check subscriber exists
    const exists = await this.subscriberExists(owner);
    if (!exists) {
      throw new Error('Subscriber does not exist on-chain. Create subscription first.');
    }
    
    // Get user's USDC token account
    const userTokenAccount = await getAssociatedTokenAddress(
      DEVNET_USDC_MINT,
      owner
    );
    
    // Amount in USDC lamports (6 decimals)
    const amountLamports = BigInt(Math.floor(amount * 1e6));
    
    // Build deposit instruction
    const discriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]); // deposit
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(amountLamports, 0);
    
    const data = Buffer.concat([discriminator, amountBuffer]);
    
    const ix = new TransactionInstruction({
      programId: SUBSCRIPTION_PROGRAM_ID,
      keys: [
        { pubkey: subscriberPDA, isSigner: false, isWritable: true },
        { pubkey: subscriberVault, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
    
    const tx = new Transaction().add(ix);
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = owner;
    
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    return {
      transaction: serialized.toString('base64'),
      subscriberVault: subscriberVault.toBase58(),
      amount,
      message: `Sign and submit to deposit ${amount} USDC`,
    };
  }

  /**
   * Convert channel names to bitmap
   */
  channelsToBitmap(channels: string[]): number {
    const channelMap: Record<string, number> = {
      'regulatory/sec': 0,
      'regulatory/cftc': 1,
      'regulatory/global': 2,
      'institutional/banks': 3,
      'institutional/asset-managers': 4,
      'defi/yields': 5,
      'defi/hacks': 6,
      'defi/protocols': 7,
      'rwa/tokenization': 8,
      'networks/solana': 9,
      'networks/ethereum': 10,
      'networks/canton': 11,
      'networks/hedera': 12,
      'networks/ripple': 13,
      'networks/avalanche': 14,
      'networks/bitcoin': 15,
      'markets/whale-movements': 16,
      'markets/liquidations': 17,
    };
    
    let bitmap = 0;
    for (const channel of channels) {
      const bit = channelMap[channel];
      if (bit !== undefined) {
        bitmap |= (1 << bit);
      }
    }
    return bitmap;
  }
  
  /**
   * Verify a public key string is valid
   */
  isValidPublicKey(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get connection for advanced operations
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get distributor wallet public key (for API operations)
   */
  getDistributorPubkey(): PublicKey | null {
    return this.distributorWallet?.publicKey ?? null;
  }
}

// Singleton instance
export const solanaClient = new SolanaClient();
