import { FastifyInstance } from 'fastify';
import { PublicKey } from '@solana/web3.js';
import { subscriptionStore } from '../services/index.js';
import { solanaClient } from '../services/solana-client.js';
import { SubscribeRequest, Channel } from '../types/index.js';
import { distributor } from '../distribution/index.js';
import { TRIAL_MODE, getEffectiveConfig } from '../config/trial.js';

export async function subscriptionRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/subscribe - Create a new subscription
   */
  fastify.post('/api/subscribe', async (request, reply) => {
    try {
      const body = request.body as SubscribeRequest;
      
      if (!body.channels || body.channels.length === 0) {
        return reply.status(400).send({ 
          error: 'At least one channel is required' 
        });
      }

      const subscriber = await subscriptionStore.subscribe(body);
      
      return {
        success: true,
        subscriber: {
          id: subscriber.id,
          channels: subscriber.channels,
          balance: subscriber.balance,
          createdAt: subscriber.createdAt,
          onChain: subscriber.onChain,
          walletAddress: subscriber.walletAddress
        },
        message: subscriber.onChain 
          ? 'Subscription synced with on-chain state. Connect via WebSocket to receive alerts.'
          : 'Subscription created. Connect via WebSocket to receive alerts.'
      };
    } catch (error) {
      console.error('Subscribe error:', error);
      return reply.status(500).send({ error: 'Failed to create subscription' });
    }
  });

  /**
   * GET /api/subscription/:id - Get subscription details
   */
  fastify.get('/api/subscription/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const subscriber = await subscriptionStore.get(id);
    
    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    const balance = await subscriptionStore.getBalance(id);

    return {
      id: subscriber.id,
      channels: subscriber.channels,
      balance,
      alertsReceived: subscriber.alertsReceived,
      active: subscriber.active,
      createdAt: subscriber.createdAt,
      onChain: subscriber.onChain,
      walletAddress: subscriber.walletAddress
    };
  });

  /**
   * POST /api/deposit - Deposit USDC to subscription balance
   */
  fastify.post('/api/deposit', async (request, reply) => {
    const { subscriberId, amount } = request.body as { 
      subscriberId: string; 
      amount: number 
    };

    if (!subscriberId || !amount || amount <= 0) {
      return reply.status(400).send({ 
        error: 'subscriberId and positive amount required' 
      });
    }

    const subscriber = await subscriptionStore.deposit(subscriberId, amount);
    
    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    return {
      success: true,
      balance: subscriber.balance,
      onChain: subscriber.onChain,
      message: subscriber.onChain 
        ? `Balance refreshed from on-chain: ${subscriber.balance} USDC`
        : `Deposited ${amount} USDC. New balance: ${subscriber.balance}`
    };
  });

  /**
   * GET /api/balance/:id - Check balance and runway
   */
  fastify.get('/api/balance/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const subscriber = await subscriptionStore.get(id);
    
    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    const balance = await subscriptionStore.getBalance(id);

    const config = getEffectiveConfig();
    const pricePerAlert = config.pricePerAlert;
    const alertsRemaining = pricePerAlert > 0 ? Math.floor(balance / pricePerAlert) : Infinity;

    return {
      subscriberId: id,
      balance,
      alertsReceived: subscriber.alertsReceived,
      alertsRemaining: alertsRemaining === Infinity ? 'unlimited' : alertsRemaining,
      pricePerAlert,
      trialMode: TRIAL_MODE,
      onChain: subscriber.onChain,
      walletAddress: subscriber.walletAddress,
      runway: TRIAL_MODE ? 'unlimited' : (alertsRemaining > 100 ? 'healthy' : alertsRemaining > 20 ? 'low' : 'critical')
    };
  });

  /**
   * PUT /api/subscription/:id/channels - Update channels
   */
  fastify.put('/api/subscription/:id/channels', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { channels } = request.body as { channels: Channel[] };

    if (!channels || channels.length === 0) {
      return reply.status(400).send({ error: 'At least one channel required' });
    }

    const subscriber = await subscriptionStore.updateChannels(id, channels);
    
    if (!subscriber) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    distributor.updateClientChannels(id, channels);

    return {
      success: true,
      channels: subscriber.channels
    };
  });

  /**
   * POST /api/subscription/create-tx - Build on-chain subscription transaction
   */
  fastify.post('/api/subscription/create-tx', async (request, reply) => {
    const { walletAddress, channels } = request.body as {
      walletAddress: string;
      channels: Channel[];
    };

    if (!walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' });
    }

    if (!channels || channels.length === 0) {
      return reply.status(400).send({ error: 'At least one channel is required' });
    }

    if (!solanaClient.isValidPublicKey(walletAddress)) {
      return reply.status(400).send({ error: 'Invalid wallet address' });
    }

    try {
      const owner = new PublicKey(walletAddress);
      const channelBitmap = solanaClient.channelsToBitmap(channels);
      
      const result = await solanaClient.buildCreateSubscriberTx(owner, channelBitmap);
      
      return {
        success: true,
        ...result,
        channels,
        channelBitmap,
        instructions: [
          '1. Sign this transaction with your Solana wallet',
          '2. Submit the signed transaction to Solana',
          '3. Call POST /api/subscribe with your walletAddress to sync'
        ]
      };
    } catch (err: any) {
      console.error('[CreateTx] Error:', err);
      
      if (err.message?.includes('already exists')) {
        return reply.status(409).send({ 
          error: 'Subscriber already exists on-chain',
          message: 'Call POST /api/subscribe with your walletAddress to sync'
        });
      }
      
      return reply.status(500).send({ error: err.message || 'Failed to build transaction' });
    }
  });

  /**
   * POST /api/subscription/deposit-tx - Build USDC deposit transaction
   */
  fastify.post('/api/subscription/deposit-tx', async (request, reply) => {
    const { walletAddress, amount } = request.body as {
      walletAddress: string;
      amount: number;
    };

    if (!walletAddress) {
      return reply.status(400).send({ error: 'walletAddress is required' });
    }

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'Positive amount is required' });
    }

    if (!solanaClient.isValidPublicKey(walletAddress)) {
      return reply.status(400).send({ error: 'Invalid wallet address' });
    }

    try {
      const owner = new PublicKey(walletAddress);
      const result = await solanaClient.buildDepositTx(owner, amount);
      
      return {
        success: true,
        ...result,
        instructions: [
          '1. Ensure you have USDC in your wallet',
          '2. Sign this transaction with your Solana wallet',
          '3. Submit the signed transaction to Solana',
          '4. Call GET /api/balance/:id to verify deposit'
        ]
      };
    } catch (err: any) {
      console.error('[DepositTx] Error:', err);
      
      if (err.message?.includes('does not exist')) {
        return reply.status(404).send({ 
          error: 'Subscriber not found on-chain',
          message: 'Create on-chain subscription first via POST /api/subscription/create-tx'
        });
      }
      
      return reply.status(500).send({ error: err.message || 'Failed to build transaction' });
    }
  });

  /**
   * GET /api/subscription/pda/:wallet - Get PDA addresses for a wallet
   */
  fastify.get('/api/subscription/pda/:wallet', async (request, reply) => {
    const { wallet } = request.params as { wallet: string };

    if (!solanaClient.isValidPublicKey(wallet)) {
      return reply.status(400).send({ error: 'Invalid wallet address' });
    }

    try {
      const owner = new PublicKey(wallet);
      const [subscriberPDA] = solanaClient.getSubscriberPDA(owner);
      const [vaultPDA] = solanaClient.getSubscriberVaultPDA(owner);
      const exists = await solanaClient.subscriberExists(owner);
      
      let balance = 0;
      let subscriber = null;
      
      if (exists) {
        const data = await solanaClient.getSubscriber(owner);
        if (data) {
          balance = Number(data.balance) / 1e6;
          subscriber = {
            channels: data.channels,
            balance,
            alertsReceived: Number(data.alertsReceived),
            active: data.active,
          };
        }
      }

      return {
        walletAddress: wallet,
        subscriberPDA: subscriberPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        existsOnChain: exists,
        subscriber,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Failed to get PDA info' });
    }
  });

  /**
   * DELETE /api/subscription/:id - Unsubscribe
   */
  fastify.delete('/api/subscription/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const success = await subscriptionStore.unsubscribe(id);
    
    if (!success) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    return { success: true, message: 'Unsubscribed successfully' };
  });
}
