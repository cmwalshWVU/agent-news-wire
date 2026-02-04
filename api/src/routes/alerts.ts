import { FastifyInstance } from 'fastify';
import { alertStore, subscriptionStore } from '../services/index.js';
import { Channel } from '../types/index.js';

// Price per historical query
const QUERY_PRICE = 0.05;

export async function alertRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/alerts - Get historical alerts (paid query)
   */
  fastify.get('/api/alerts', async (request, reply) => {
    const { 
      channel, 
      limit = 50, 
      subscriberId 
    } = request.query as { 
      channel?: Channel; 
      limit?: number; 
      subscriberId?: string 
    };

    // Charge for historical queries if subscriber provided
    if (subscriberId) {
      const charged = subscriptionStore.charge(subscriberId, QUERY_PRICE);
      if (!charged) {
        return reply.status(402).send({ 
          error: 'Insufficient balance',
          queryPrice: QUERY_PRICE
        });
      }
    }

    const alerts = channel 
      ? alertStore.getByChannel(channel, Math.min(limit, 100))
      : alertStore.getRecent(Math.min(limit, 100));

    return {
      alerts,
      count: alerts.length,
      charged: subscriberId ? QUERY_PRICE : 0
    };
  });

  /**
   * GET /api/alerts/:id - Get single alert by ID
   */
  fastify.get('/api/alerts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const alert = alertStore.get(id);
    
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }

    return { alert };
  });

  /**
   * GET /api/channels - List available channels
   */
  fastify.get('/api/channels', async () => {
    return {
      channels: [
        { id: 'regulatory/sec', name: 'SEC Filings', description: 'SEC EDGAR regulatory filings' },
        { id: 'regulatory/cftc', name: 'CFTC', description: 'CFTC press releases and enforcement' },
        { id: 'regulatory/global', name: 'Global Regulators', description: 'International regulatory news' },
        { id: 'institutional/banks', name: 'Banks', description: 'Major bank announcements' },
        { id: 'institutional/asset-managers', name: 'Asset Managers', description: 'Fund and ETF news' },
        { id: 'defi/yields', name: 'DeFi Yields', description: 'Yield farming opportunities and changes' },
        { id: 'defi/hacks', name: 'DeFi Hacks', description: 'Exploits and security incidents' },
        { id: 'defi/protocols', name: 'Protocol TVL', description: 'Protocol TVL changes' },
        { id: 'rwa/tokenization', name: 'RWA Tokenization', description: 'Real-world asset tokenization' },
        { id: 'networks/solana', name: 'Solana', description: 'Solana network news' },
        { id: 'networks/ethereum', name: 'Ethereum', description: 'Ethereum network news' },
        { id: 'networks/canton', name: 'Canton', description: 'Canton Network updates' },
        { id: 'networks/hedera', name: 'Hedera', description: 'Hedera network news' },
        { id: 'networks/ripple', name: 'Ripple/XRP', description: 'Ripple and XRP ecosystem' },
        { id: 'networks/avalanche', name: 'Avalanche', description: 'Avalanche network news' },
        { id: 'networks/bitcoin', name: 'Bitcoin', description: 'Bitcoin network news' },
        { id: 'markets/whale-movements', name: 'Whale Movements', description: 'Large crypto transfers' },
        { id: 'markets/liquidations', name: 'Liquidations', description: 'Major liquidation events' }
      ]
    };
  });
}
