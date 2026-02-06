import { FastifyInstance } from 'fastify';
import { publisherStore, alertStore } from '../services/index.js';
import { distributor } from '../distribution/index.js';
import { 
  PublisherRegisterRequest, 
  PublishAlertRequest,
  Channel 
} from '../types/index.js';
import { v4 as uuid } from 'uuid';

/**
 * Publisher routes for agent-based alert publishing
 */
export async function publisherRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/publishers/register - Register as a publisher
   * 
   * Returns API key (shown only once!) for authentication
   */
  fastify.post('/api/publishers/register', async (request, reply) => {
    try {
      const body = request.body as PublisherRegisterRequest;

      if (!body.name || body.name.length < 3) {
        return reply.status(400).send({ 
          error: 'Name is required (min 3 characters)' 
        });
      }

      if (!body.channels || body.channels.length === 0) {
        return reply.status(400).send({ 
          error: 'At least one channel is required' 
        });
      }

      const { publisher, apiKey } = publisherStore.register(body);

      return {
        success: true,
        publisher: {
          id: publisher.id,
          name: publisher.name,
          channels: publisher.channels,
          status: publisher.status,
          createdAt: publisher.createdAt,
          reputationScore: publisher.reputationScore
        },
        apiKey, // ⚠️ Only shown once!
        apiKeyPrefix: publisher.apiKeyPrefix,
        message: 'Publisher registered. Save your API key - it will not be shown again!'
      };
    } catch (error: any) {
      if (error.message?.includes('already')) {
        return reply.status(409).send({ error: error.message });
      }
      console.error('Publisher registration error:', error);
      return reply.status(500).send({ error: 'Failed to register publisher' });
    }
  });

  /**
   * POST /api/alerts/publish - Publish an alert (authenticated)
   * 
   * Requires: Authorization: Bearer <api_key>
   */
  fastify.post('/api/alerts/publish', async (request, reply) => {
    try {
      // Extract API key from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ 
          error: 'Authorization required. Use: Authorization: Bearer <api_key>' 
        });
      }

      const apiKey = authHeader.slice(7);
      const publisher = publisherStore.authenticate(apiKey);

      if (!publisher) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }

      const body = request.body as PublishAlertRequest;

      // Validate required fields
      if (!body.channel) {
        return reply.status(400).send({ error: 'Channel is required' });
      }
      if (!body.headline || body.headline.length < 10) {
        return reply.status(400).send({ error: 'Headline is required (min 10 characters)' });
      }
      if (!body.summary || body.summary.length < 20) {
        return reply.status(400).send({ error: 'Summary is required (min 20 characters)' });
      }
      if (!body.sourceUrl) {
        return reply.status(400).send({ error: 'Source URL is required' });
      }

      // Check if publisher can post to this channel
      if (!publisherStore.canPublishTo(publisher.id, body.channel)) {
        return reply.status(403).send({ 
          error: `Not authorized to publish to channel: ${body.channel}`,
          authorizedChannels: publisher.channels
        });
      }

      // Create the alert
      const alertInput = {
        channel: body.channel,
        priority: body.priority || 'medium',
        headline: body.headline,
        summary: body.summary,
        entities: body.entities || [],
        tickers: body.tickers || [],
        tokens: body.tokens || [],
        sourceUrl: body.sourceUrl,
        sourceType: 'agent' as const,
        sentiment: body.sentiment,
        impactScore: body.impactScore,
        publisherId: publisher.id,
        publisherName: publisher.name
      };

      const alert = alertStore.add(alertInput);

      if (!alert) {
        return reply.status(409).send({ 
          error: 'Duplicate alert - this content has already been published' 
        });
      }

      // Increment publisher stats
      publisherStore.incrementPublished(publisher.id);

      // Distribute to subscribers
      const recipients = await distributor.distribute(alert);
      const deliveryCount = recipients.length;

      // Track consumption for publisher reputation
      if (deliveryCount > 0) {
        for (let i = 0; i < deliveryCount; i++) {
          publisherStore.incrementConsumed(publisher.id);
        }
      }

      console.log(`[Publisher] ${publisher.name} published alert: ${alert.alertId} -> ${deliveryCount} subscribers`);

      return {
        success: true,
        alert: {
          alertId: alert.alertId,
          channel: alert.channel,
          headline: alert.headline,
          timestamp: alert.timestamp
        },
        delivery: {
          subscribersNotified: deliveryCount
        },
        publisher: {
          id: publisher.id,
          name: publisher.name,
          alertsPublished: publisher.alertsPublished + 1
        }
      };
    } catch (error) {
      console.error('Publish alert error:', error);
      return reply.status(500).send({ error: 'Failed to publish alert' });
    }
  });

  /**
   * GET /api/publishers - List publishers
   */
  fastify.get('/api/publishers', async (request, reply) => {
    const query = request.query as { limit?: string; includeInactive?: string };
    const limit = parseInt(query.limit || '50');
    const includeInactive = query.includeInactive === 'true';

    const publishers = publisherStore.list(limit, includeInactive);
    const stats = publisherStore.stats();

    return {
      publishers,
      stats
    };
  });

  /**
   * GET /api/publishers/leaderboard - Publisher leaderboard
   */
  fastify.get('/api/publishers/leaderboard', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '20');

    return {
      leaderboard: publisherStore.getLeaderboard(limit)
    };
  });

  /**
   * GET /api/publishers/:id - Get publisher details
   */
  fastify.get('/api/publishers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const publisher = publisherStore.get(id);

    if (!publisher) {
      return reply.status(404).send({ error: 'Publisher not found' });
    }

    // Return public info only
    const { apiKey, ...publicInfo } = publisher;

    return {
      publisher: publicInfo
    };
  });

  /**
   * GET /api/publishers/:id/alerts - Get alerts by publisher
   */
  fastify.get('/api/publishers/:id/alerts', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50');

    const publisher = publisherStore.get(id);
    if (!publisher) {
      return reply.status(404).send({ error: 'Publisher not found' });
    }

    // Get recent alerts and filter by publisher
    const allAlerts = alertStore.getRecent(500);
    const publisherAlerts = allAlerts
      .filter(a => a.publisherId === id)
      .slice(0, limit);

    return {
      publisher: {
        id: publisher.id,
        name: publisher.name
      },
      alerts: publisherAlerts,
      total: publisherAlerts.length
    };
  });

  /**
   * GET /api/my-publisher - Get own publisher info (authenticated)
   */
  fastify.get('/api/my-publisher', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ 
        error: 'Authorization required' 
      });
    }

    const apiKey = authHeader.slice(7);
    const publisher = publisherStore.authenticate(apiKey);

    if (!publisher) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    const { apiKey: _, ...publicInfo } = publisher;

    return {
      publisher: publicInfo
    };
  });
}
