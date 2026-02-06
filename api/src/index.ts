import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { subscriptionRoutes, alertRoutes, statsRoutes, publisherRoutes } from './routes/index.js';
import { subscriptionStore } from './services/index.js';
import { distributor } from './distribution/index.js';
import { IngestionEngine } from './ingestion/index.js';
import { Channel } from './types/index.js';
import { solanaClient } from './services/solana-client.js';

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  // Initialize Solana client
  console.log('[Solana] Initializing client...');
  await solanaClient.loadDistributorWallet();
  const stats = await solanaClient.getStats();
  console.log('[Solana] Connected to devnet. Protocol stats:', stats);
  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    }
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true
  });

  await fastify.register(websocket);

  // Register REST routes
  await fastify.register(subscriptionRoutes);
  await fastify.register(alertRoutes);
  await fastify.register(statsRoutes);
  await fastify.register(publisherRoutes);

  // Serve skill.md for agent discovery
  fastify.get('/skill.md', async (request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const skillPath = path.join(process.cwd(), '..', 'public', 'skill.md');
    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      reply.type('text/markdown; charset=utf-8').send(content);
    } catch {
      // Fallback to local path
      try {
        const content = await fs.readFile(path.join(process.cwd(), 'public', 'skill.md'), 'utf-8');
        reply.type('text/markdown; charset=utf-8').send(content);
      } catch {
        reply.status(404).send('skill.md not found');
      }
    }
  });

  // WebSocket endpoint for real-time alerts
  fastify.get('/api/stream', { websocket: true }, (socket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const subscriberId = url.searchParams.get('subscriberId');
    
    if (!subscriberId) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'subscriberId query parameter required' 
      }));
      socket.close();
      return;
    }

    const subscriber = subscriptionStore.get(subscriberId);
    if (!subscriber) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Subscription not found. Create one via POST /api/subscribe' 
      }));
      socket.close();
      return;
    }

    // Register with distributor
    distributor.addClient(socket, subscriberId, subscriber.channels as Channel[]);

    // Handle incoming messages (e.g., channel updates)
    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'update_channels') {
          const channels = message.channels as Channel[];
          subscriptionStore.updateChannels(subscriberId, channels);
          distributor.updateClientChannels(subscriberId, channels);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  // Create and start ingestion engine
  const ingestion = new IngestionEngine({
    secEnabled: true,
    defiLlamaEnabled: true,
    whaleAlertEnabled: true,
    mockWhales: !process.env.WHALE_ALERT_API_KEY // Use mock if no API key
  });

  // Wire ingestion to distribution
  ingestion.onAlert(async (alert) => {
    await distributor.distribute(alert);
  });

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     AGENT NEWS WIRE                          ║
║            Bloomberg Terminal for the Agent Economy          ║
╠══════════════════════════════════════════════════════════════╣
║  REST API:  http://${HOST}:${PORT}                              ║
║  WebSocket: ws://${HOST}:${PORT}/api/stream                     ║
╠══════════════════════════════════════════════════════════════╣
║  Subscriber Endpoints:                                       ║
║    POST /api/subscribe      - Create subscription            ║
║    GET  /api/channels       - List channels                  ║
║    GET  /api/alerts         - Historical alerts              ║
║    GET  /api/balance/:id    - Check balance                  ║
║    WS   /api/stream         - Real-time alerts               ║
╠══════════════════════════════════════════════════════════════╣
║  Publisher Endpoints (Agents):                               ║
║    POST /api/publishers/register  - Register as publisher    ║
║    POST /api/alerts/publish       - Publish an alert         ║
║    GET  /api/publishers           - List publishers          ║
║    GET  /api/publishers/leaderboard - Publisher rankings     ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Start ingestion
    await ingestion.start();
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    ingestion.stop();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
