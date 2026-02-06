import { FastifyInstance } from 'fastify';
import { database, alertStore, subscriptionStore, publisherStore } from '../services/index.js';
import { distributor } from '../distribution/index.js';
import { solanaClient, SUBSCRIPTION_PROGRAM_ID, ALERT_PROGRAM_ID, PUBLISHER_PROGRAM_ID } from '../services/solana-client.js';
import { TRIAL_MODE, TRIAL_CONFIG, getEffectiveConfig } from '../config/trial.js';

export async function statsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/stats - Get system statistics
   */
  fastify.get('/api/stats', async () => {
    const onChainStats = await solanaClient.getStats();
    const effectiveConfig = getEffectiveConfig(onChainStats);
    
    // All stores are now async
    const [alertStats, subscriptionStats, publisherStats] = await Promise.all([
      alertStore.stats(),
      subscriptionStore.stats(),
      publisherStore.stats()
    ]);

    return {
      alerts: alertStats,
      subscriptions: subscriptionStats,
      publishers: publisherStats,
      distribution: distributor.stats(),
      pricing: {
        trialMode: TRIAL_MODE,
        pricePerAlert: effectiveConfig.pricePerAlert,
        pricePerQuery: effectiveConfig.pricePerQuery,
        publisherStake: effectiveConfig.publisherStake,
        note: TRIAL_MODE ? 'Trial mode: all features free' : 'Production pricing active',
      },
      onChain: {
        ...onChainStats,
        programs: {
          subscription: SUBSCRIPTION_PROGRAM_ID.toBase58(),
          alerts: ALERT_PROGRAM_ID.toBase58(),
          publisher: PUBLISHER_PROGRAM_ID.toBase58(),
        },
        network: 'devnet',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  });

  /**
   * GET /api/health - Health check
   */
  fastify.get('/api/health', async () => {
    let dbStatus = 'healthy';
    try {
      const dbStats = await database.stats();
      if (dbStats.subscribers === undefined) {
        dbStatus = 'unhealthy';
      }
    } catch (err) {
      dbStatus = 'unhealthy';
    }

    const status = dbStatus === 'healthy' ? 'healthy' : 'degraded';

    return { 
      status,
      version: '0.2.0',
      database: dbStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  });

  /**
   * GET /api/ready - Readiness check
   */
  fastify.get('/api/ready', async (request, reply) => {
    try {
      await database.stats();
      return { ready: true };
    } catch (err) {
      reply.status(503);
      return { ready: false, error: 'Database not available' };
    }
  });

  /**
   * GET / - Welcome message
   */
  fastify.get('/', async () => {
    return {
      name: 'Agent News Wire',
      description: 'Bloomberg Terminal for the Agent Economy',
      version: '0.2.0',
      skillFile: '/skill.md',
      endpoints: {
        subscribe: 'POST /api/subscribe',
        channels: 'GET /api/channels',
        alerts: 'GET /api/alerts',
        balance: 'GET /api/balance/:id',
        stats: 'GET /api/stats',
        websocket: 'WS /api/stream',
        registerPublisher: 'POST /api/publishers/register',
        publishAlert: 'POST /api/alerts/publish',
        publishers: 'GET /api/publishers',
        leaderboard: 'GET /api/publishers/leaderboard'
      }
    };
  });
}
