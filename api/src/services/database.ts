import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database path - use environment variable or default to data directory
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/anw.db');

/**
 * SQLite Database singleton
 * Provides persistent storage for subscribers, alerts, and publishers
 */
class DatabaseService {
  private db: Database.Database | null = null;

  /**
   * Initialize database connection and create tables
   */
  init(): Database.Database {
    if (this.db) return this.db;

    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    import('fs').then(fs => {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    });

    console.log(`[Database] Initializing SQLite at: ${DB_PATH}`);
    
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL'); // Better concurrent access
    this.db.pragma('foreign_keys = ON');
    
    this.createTables();
    
    console.log('[Database] Initialized successfully');
    return this.db;
  }

  /**
   * Get database instance
   */
  get(): Database.Database {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  /**
   * Create all tables
   */
  private createTables() {
    const db = this.db!;

    // Subscribers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE,
        channels TEXT NOT NULL, -- JSON array
        webhook_url TEXT,
        created_at TEXT NOT NULL,
        balance REAL DEFAULT 0,
        alerts_received INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        on_chain INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_subscribers_wallet ON subscribers(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
    `);

    // Alerts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        priority TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        headline TEXT NOT NULL,
        summary TEXT NOT NULL,
        entities TEXT NOT NULL, -- JSON array
        tickers TEXT NOT NULL, -- JSON array
        tokens TEXT NOT NULL, -- JSON array
        source_url TEXT NOT NULL,
        source_type TEXT NOT NULL,
        sentiment TEXT,
        impact_score REAL,
        raw_data TEXT, -- JSON object
        publisher_id TEXT,
        publisher_name TEXT,
        hash TEXT UNIQUE -- For deduplication
      );
      
      CREATE INDEX IF NOT EXISTS idx_alerts_channel ON alerts(channel);
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_publisher ON alerts(publisher_id);
    `);

    // Publishers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS publishers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        wallet_address TEXT,
        api_key TEXT NOT NULL, -- Hashed
        api_key_prefix TEXT NOT NULL,
        channels TEXT NOT NULL, -- JSON array
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        alerts_published INTEGER DEFAULT 0,
        alerts_consumed INTEGER DEFAULT 0,
        reputation_score REAL DEFAULT 50,
        stake REAL DEFAULT 0,
        on_chain INTEGER DEFAULT 0,
        publisher_pda TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_publishers_api_key_prefix ON publishers(api_key_prefix);
      CREATE INDEX IF NOT EXISTS idx_publishers_status ON publishers(status);
    `);

    // Alert hashes for deduplication (separate table for efficiency)
    db.exec(`
      CREATE TABLE IF NOT EXISTS alert_hashes (
        hash TEXT PRIMARY KEY,
        alert_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    console.log('[Database] Tables created/verified');
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[Database] Connection closed');
    }
  }

  /**
   * Get database stats
   */
  stats() {
    const db = this.get();
    const subscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };
    const alerts = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    const publishers = db.prepare('SELECT COUNT(*) as count FROM publishers').get() as { count: number };
    
    return {
      subscribers: subscribers.count,
      alerts: alerts.count,
      publishers: publishers.count,
      path: DB_PATH
    };
  }
}

// Singleton instance
export const database = new DatabaseService();

// Initialize on import
database.init();
