import Knex from 'knex';
import type { Knex as KnexType } from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database configuration
 * 
 * Supports both SQLite (local/simple) and PostgreSQL (production/Railway)
 * 
 * Environment variables:
 * - DATABASE_URL: PostgreSQL connection string (takes precedence)
 * - DATABASE_PATH: SQLite file path (default: ./data/anw.db)
 */

function getConfig(): KnexType.Config {
  // PostgreSQL if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    console.log('[Database] Using PostgreSQL');
    return {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        tableName: 'knex_migrations'
      }
    };
  }

  // SQLite as default (local development)
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/anw.db');
  console.log(`[Database] Using SQLite at: ${dbPath}`);
  
  // Ensure data directory exists
  const dbDir = path.dirname(dbPath);
  import('fs').then(fs => {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  });

  return {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations'
    }
  };
}

/**
 * Database service using Knex
 * Supports SQLite (local) and PostgreSQL (production)
 */
class DatabaseService {
  private _db: KnexType | null = null;
  private _isPostgres: boolean = false;

  /**
   * Initialize database connection and create tables
   */
  async init(): Promise<KnexType> {
    if (this._db) return this._db;

    const config = getConfig();
    this._isPostgres = config.client === 'pg';
    this._db = Knex(config);

    // Test connection
    try {
      await this._db.raw('SELECT 1');
      console.log('[Database] Connection established');
    } catch (err) {
      console.error('[Database] Connection failed:', err);
      throw err;
    }

    // Create tables
    await this.createTables();
    
    console.log('[Database] Initialized successfully');
    return this._db;
  }

  /**
   * Get database instance (initializes if needed)
   */
  async get(): Promise<KnexType> {
    if (!this._db) {
      await this.init();
    }
    return this._db!;
  }

  /**
   * Get synchronous access (for backward compatibility)
   * Note: Should migrate to async methods
   */
  getSync(): KnexType {
    if (!this._db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this._db;
  }

  /**
   * Check if using PostgreSQL
   */
  isPostgres(): boolean {
    return this._isPostgres;
  }

  /**
   * Create all tables
   */
  private async createTables() {
    const db = this._db!;

    // Subscribers table
    if (!(await db.schema.hasTable('subscribers'))) {
      await db.schema.createTable('subscribers', (table) => {
        table.string('id').primary();
        table.string('wallet_address').unique().nullable();
        table.text('channels').notNullable(); // JSON array
        table.string('webhook_url').nullable();
        table.string('created_at').notNullable();
        table.float('balance').defaultTo(0);
        table.integer('alerts_received').defaultTo(0);
        table.boolean('active').defaultTo(true);
        table.boolean('on_chain').defaultTo(false);
        
        table.index('wallet_address');
        table.index('active');
      });
      console.log('[Database] Created subscribers table');
    }

    // Alerts table
    if (!(await db.schema.hasTable('alerts'))) {
      await db.schema.createTable('alerts', (table) => {
        table.string('alert_id').primary();
        table.string('channel').notNullable();
        table.string('priority').notNullable();
        table.string('timestamp').notNullable();
        table.string('headline').notNullable();
        table.text('summary').notNullable();
        table.text('entities').notNullable(); // JSON array
        table.text('tickers').notNullable(); // JSON array
        table.text('tokens').notNullable(); // JSON array
        table.string('source_url').notNullable();
        table.string('source_type').notNullable();
        table.string('sentiment').nullable();
        table.float('impact_score').nullable();
        table.text('raw_data').nullable(); // JSON object
        table.string('publisher_id').nullable();
        table.string('publisher_name').nullable();
        table.string('hash').unique().nullable();
        
        table.index('channel');
        table.index('timestamp');
        table.index('publisher_id');
      });
      console.log('[Database] Created alerts table');
    }

    // Publishers table
    if (!(await db.schema.hasTable('publishers'))) {
      await db.schema.createTable('publishers', (table) => {
        table.string('id').primary();
        table.string('name').unique().notNullable();
        table.text('description').nullable();
        table.string('wallet_address').nullable();
        table.string('api_key').notNullable(); // Hashed
        table.string('api_key_prefix').notNullable();
        table.text('channels').notNullable(); // JSON array
        table.string('status').defaultTo('active');
        table.string('created_at').notNullable();
        table.integer('alerts_published').defaultTo(0);
        table.integer('alerts_consumed').defaultTo(0);
        table.float('reputation_score').defaultTo(50);
        table.float('stake').defaultTo(0);
        table.boolean('on_chain').defaultTo(false);
        table.string('publisher_pda').nullable();
        
        table.index('api_key_prefix');
        table.index('status');
      });
      console.log('[Database] Created publishers table');
    }

    // Alert hashes for deduplication
    if (!(await db.schema.hasTable('alert_hashes'))) {
      await db.schema.createTable('alert_hashes', (table) => {
        table.string('hash').primary();
        table.string('alert_id').notNullable();
        table.string('created_at').notNullable();
      });
      console.log('[Database] Created alert_hashes table');
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this._db) {
      await this._db.destroy();
      this._db = null;
      console.log('[Database] Connection closed');
    }
  }

  /**
   * Get database stats
   */
  async stats() {
    const db = await this.get();
    
    const [subscribers] = await db('subscribers').count('* as count');
    const [alerts] = await db('alerts').count('* as count');
    const [publishers] = await db('publishers').count('* as count');
    
    return {
      subscribers: Number(subscribers.count),
      alerts: Number(alerts.count),
      publishers: Number(publishers.count),
      type: this._isPostgres ? 'postgresql' : 'sqlite'
    };
  }
}

// Singleton instance
export const database = new DatabaseService();

// Initialize on import (async)
database.init().catch(err => {
  console.error('[Database] Failed to initialize:', err);
  process.exit(1);
});
