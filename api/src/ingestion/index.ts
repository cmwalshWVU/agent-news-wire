import { fetchSECFilings } from './sec-edgar.js';
import { fetchYieldAlerts, fetchTVLAlerts } from './defillama.js';
import { fetchWhaleAlerts, generateMockWhaleAlerts } from './whale-alert.js';
import { fetchGenfinityNews } from './genfinity.js';
import { fetchCFTCReleases, generateMockCFTCAlerts } from './cftc.js';
import { fetchHackAlerts, generateMockHackAlerts } from './rekt-news.js';
import { alertStore } from '../services/index.js';
import { Alert } from '../types/index.js';

export { fetchSECFilings, testSECFetcher } from './sec-edgar.js';
export { fetchYieldAlerts, fetchTVLAlerts, testDeFiLlamaFetchers } from './defillama.js';
export { fetchWhaleAlerts, generateMockWhaleAlerts } from './whale-alert.js';
export { fetchGenfinityNews, testGenfinityFetcher } from './genfinity.js';
export { fetchCFTCReleases, generateMockCFTCAlerts, testCFTCFetcher } from './cftc.js';
export { fetchHackAlerts, generateMockHackAlerts, testHackFetchers } from './rekt-news.js';

type AlertHandler = (alert: Alert) => void | Promise<void>;

interface IngestionConfig {
  secEnabled: boolean;
  secIntervalMs: number;
  cftcEnabled: boolean;
  cftcIntervalMs: number;
  mockCFTC: boolean;
  defiLlamaEnabled: boolean;
  defiLlamaIntervalMs: number;
  whaleAlertEnabled: boolean;
  whaleAlertApiKey?: string;
  whaleAlertIntervalMs: number;
  mockWhales: boolean;
  hacksEnabled: boolean;
  hacksIntervalMs: number;
  mockHacks: boolean;
  genfinityEnabled: boolean;
  genfinityIntervalMs: number;
}

const DEFAULT_CONFIG: IngestionConfig = {
  secEnabled: true,
  secIntervalMs: 10 * 60 * 1000, // 10 minutes
  cftcEnabled: true,
  cftcIntervalMs: 10 * 60 * 1000, // 10 minutes
  mockCFTC: false, // CFTC RSS is reliable
  defiLlamaEnabled: true,
  defiLlamaIntervalMs: 5 * 60 * 1000, // 5 minutes
  whaleAlertEnabled: true,
  whaleAlertApiKey: process.env.WHALE_ALERT_API_KEY,
  whaleAlertIntervalMs: 60 * 1000, // 1 minute
  mockWhales: true, // Use mock data for demo
  hacksEnabled: true,
  hacksIntervalMs: 5 * 60 * 1000, // 5 minutes
  mockHacks: false, // DeFiLlama hacks API is reliable
  genfinityEnabled: true,
  genfinityIntervalMs: 5 * 60 * 1000 // 5 minutes
};

/**
 * Ingestion orchestrator - runs all data source pollers
 */
export class IngestionEngine {
  private config: IngestionConfig;
  private handlers: AlertHandler[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];
  private running = false;

  constructor(config: Partial<IngestionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a handler for new alerts
   */
  onAlert(handler: AlertHandler) {
    this.handlers.push(handler);
  }

  /**
   * Process alerts through the pipeline
   */
  private async processAlerts(alerts: Alert[]) {
    for (const alert of alerts) {
      // Notify all handlers
      for (const handler of this.handlers) {
        try {
          await handler(alert);
        } catch (error) {
          console.error('[Ingestion] Handler error:', error);
        }
      }
    }
  }

  /**
   * Run SEC poller
   */
  private async pollSEC() {
    console.log('[Ingestion] Polling SEC EDGAR...');
    const inputs = await fetchSECFilings();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New SEC alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] SEC: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Run DeFiLlama pollers
   */
  private async pollDeFiLlama() {
    console.log('[Ingestion] Polling DeFiLlama...');
    const yieldInputs = await fetchYieldAlerts();
    const tvlInputs = await fetchTVLAlerts();
    const allInputs = [...yieldInputs, ...tvlInputs];
    const alerts: Alert[] = [];
    
    for (const input of allInputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New DeFi alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] DeFiLlama: ${allInputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Run Whale Alert poller
   */
  private async pollWhaleAlert() {
    console.log('[Ingestion] Polling Whale Alert...');
    
    let inputs;
    if (this.config.mockWhales && !this.config.whaleAlertApiKey) {
      inputs = generateMockWhaleAlerts();
    } else {
      inputs = await fetchWhaleAlerts(this.config.whaleAlertApiKey);
    }
    
    const alerts: Alert[] = [];
    for (const input of inputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New whale alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] WhaleAlert: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Run Genfinity poller
   */
  private async pollGenfinity() {
    console.log('[Ingestion] Polling Genfinity...');
    const inputs = await fetchGenfinityNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Genfinity alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Genfinity: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Run CFTC poller
   */
  private async pollCFTC() {
    console.log('[Ingestion] Polling CFTC...');
    
    let inputs;
    if (this.config.mockCFTC) {
      inputs = generateMockCFTCAlerts();
    } else {
      inputs = await fetchCFTCReleases();
    }
    
    const alerts: Alert[] = [];
    for (const input of inputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New CFTC alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] CFTC: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Run Hacks/Exploits poller (DeFiLlama + Rekt News)
   */
  private async pollHacks() {
    console.log('[Ingestion] Polling Hacks (DeFiLlama + Rekt)...');
    
    let inputs;
    if (this.config.mockHacks) {
      inputs = generateMockHackAlerts();
    } else {
      inputs = await fetchHackAlerts();
    }
    
    const alerts: Alert[] = [];
    for (const input of inputs) {
      const alert = alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New hack alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Hacks: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  /**
   * Start all pollers
   */
  async start() {
    if (this.running) return;
    this.running = true;
    
    console.log('[Ingestion] Starting ingestion engine...');

    // Run initial polls
    if (this.config.secEnabled) {
      await this.pollSEC();
      this.intervals.push(
        setInterval(() => this.pollSEC(), this.config.secIntervalMs)
      );
    }

    if (this.config.defiLlamaEnabled) {
      await this.pollDeFiLlama();
      this.intervals.push(
        setInterval(() => this.pollDeFiLlama(), this.config.defiLlamaIntervalMs)
      );
    }

    if (this.config.whaleAlertEnabled) {
      await this.pollWhaleAlert();
      this.intervals.push(
        setInterval(() => this.pollWhaleAlert(), this.config.whaleAlertIntervalMs)
      );
    }

    if (this.config.genfinityEnabled) {
      await this.pollGenfinity();
      this.intervals.push(
        setInterval(() => this.pollGenfinity(), this.config.genfinityIntervalMs)
      );
    }

    if (this.config.cftcEnabled) {
      await this.pollCFTC();
      this.intervals.push(
        setInterval(() => this.pollCFTC(), this.config.cftcIntervalMs)
      );
    }

    if (this.config.hacksEnabled) {
      await this.pollHacks();
      this.intervals.push(
        setInterval(() => this.pollHacks(), this.config.hacksIntervalMs)
      );
    }

    console.log('[Ingestion] Engine started');
  }

  /**
   * Stop all pollers
   */
  stop() {
    this.running = false;
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    console.log('[Ingestion] Engine stopped');
  }

  /**
   * Run a single poll cycle (for testing)
   */
  async pollOnce() {
    const alerts: Alert[] = [];
    
    if (this.config.secEnabled) {
      const inputs = await fetchSECFilings();
      for (const input of inputs) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.defiLlamaEnabled) {
      const yieldInputs = await fetchYieldAlerts();
      const tvlInputs = await fetchTVLAlerts();
      for (const input of [...yieldInputs, ...tvlInputs]) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.whaleAlertEnabled) {
      const inputs = this.config.mockWhales 
        ? generateMockWhaleAlerts() 
        : await fetchWhaleAlerts(this.config.whaleAlertApiKey);
      for (const input of inputs) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.genfinityEnabled) {
      const inputs = await fetchGenfinityNews();
      for (const input of inputs) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.cftcEnabled) {
      const inputs = this.config.mockCFTC
        ? generateMockCFTCAlerts()
        : await fetchCFTCReleases();
      for (const input of inputs) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.hacksEnabled) {
      const inputs = this.config.mockHacks
        ? generateMockHackAlerts()
        : await fetchHackAlerts();
      for (const input of inputs) {
        const alert = alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    await this.processAlerts(alerts);
    return alerts;
  }
}
