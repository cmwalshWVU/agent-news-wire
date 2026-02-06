import knex, { Knex } from 'knex';

let db: Knex | null = null;

/**
 * Initialize database schema
 */
async function initSchema(db: Knex): Promise<void> {
  // Subscribers table
  const hasSubscribers = await db.schema.hasTable('subscribers');
  if (!hasSubscribers) {
    await db.schema.createTable('subscribers', (table) => {
      table.string('id').primary();
      table.string('wallet_address').nullable();
      table.text('channels').notNullable(); // JSON array
      table.decimal('balance', 20, 6).defaultTo(0);
      table.integer('alerts_received').defaultTo(0);
      table.boolean('on_chain').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.string('webhook_url').nullable();
      table.index('wallet_address');
    });
    console.log('[Database] Created subscribers table');
  }

  // Alerts table
  const hasAlerts = await db.schema.hasTable('alerts');
  if (!hasAlerts) {
    await db.schema.createTable('alerts', (table) => {
      table.string('alert_id').primary();
      table.string('channel').notNullable();
      table.string('priority').notNullable();
      table.timestamp('timestamp').notNullable();
      table.text('headline').notNullable();
      table.text('summary').notNullable();
      table.text('entities'); // JSON array
      table.text('tickers'); // JSON array
      table.text('tokens'); // JSON array
      table.string('source_url');
      table.string('source_type');
      table.string('sentiment').nullable();
      table.decimal('impact_score', 10, 2).nullable();
      table.text('raw_data'); // JSON object
      table.string('content_hash').unique();
      table.string('publisher_id').nullable();
      table.string('publisher_name').nullable();
      table.index('channel');
      table.index('timestamp');
      table.index('publisher_id');
    });
    console.log('[Database] Created alerts table');
  }

  // Alert hashes table (for deduplication)
  const hasAlertHashes = await db.schema.hasTable('alert_hashes');
  if (!hasAlertHashes) {
    await db.schema.createTable('alert_hashes', (table) => {
      table.string('hash').primary();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('[Database] Created alert_hashes table');
  }

  // Publishers table
  const hasPublishers = await db.schema.hasTable('publishers');
  if (!hasPublishers) {
    await db.schema.createTable('publishers', (table) => {
      table.string('id').primary();
      table.string('name').notNullable().unique();
      table.string('api_key_hash').notNullable();
      table.string('api_key_prefix').notNullable();
      table.text('channels').notNullable(); // JSON array
      table.integer('alerts_published').defaultTo(0);
      table.integer('alerts_consumed').defaultTo(0);
      table.decimal('reputation_score', 5, 2).defaultTo(50);
      table.string('status').defaultTo('active');
      table.decimal('staked_amount', 20, 6).defaultTo(0);
      table.boolean('on_chain').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.string('wallet_address').nullable();
      table.index('status');
      table.index('api_key_prefix');
    });
    console.log('[Database] Created publishers table');
  }
}

/**
 * Database singleton
 */
export const database = {
  /**
   * Get database connection (initializes if needed)
   */
  async get(): Promise<Knex> {
    if (!db) {
      await this.init();
    }
    return db!;
  },

  /**
   * Initialize database connection and schema
   */
  async init(): Promise<void> {
    if (db) return;

    const databaseUrl = process.env.DATABASE_URL;
    
    let config: Knex.Config;
    if (databaseUrl) {
      console.log('[Database] Using PostgreSQL');
      config = {
        client: 'pg',
        connection: databaseUrl,
        pool: { min: 2, max: 10 },
        migrations: { tableName: 'knex_migrations' }
      };
    } else {
      // Fallback to SQLite for local development
      const path = await import('path');
      const fs = await import('fs');
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'anw.db');
      console.log(`[Database] Using SQLite at: ${dbPath}`);
      
      config = {
        client: 'better-sqlite3',
        connection: { filename: dbPath },
        useNullAsDefault: true
      };
    }

    db = knex(config);
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('[Database] Connection established');

    // Initialize schema
    await initSchema(db);
    console.log('[Database] Initialized successfully');
  },

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (db) {
      await db.destroy();
      db = null;
      console.log('[Database] Connection closed');
    }
  },

  /**
   * Get stats
   */
  async stats() {
    const conn = await this.get();
    const [subscribers, alerts, publishers] = await Promise.all([
      conn('subscribers').count('* as count').first(),
      conn('alerts').count('* as count').first(),
      conn('publishers').count('* as count').first()
    ]);
    return {
      subscribers: Number(subscribers?.count || 0),
      alerts: Number(alerts?.count || 0),
      publishers: Number(publishers?.count || 0)
    };
  }
};
