import { fetchSECFilings } from './sec-edgar.js';
import { fetchYieldAlerts, fetchTVLAlerts } from './defillama.js';
import { fetchWhaleAlerts, generateMockWhaleAlerts } from './whale-alert.js';
import { fetchGenfinityNews } from './genfinity.js';
import { fetchCFTCReleases, generateMockCFTCAlerts } from './cftc.js';
import { fetchHackAlerts, generateMockHackAlerts } from './rekt-news.js';
import { fetchChainlinkNews } from './chainlink.js';
import { fetchHederaNews } from './hedera.js';
import { fetchSolanaNews } from './solana.js';
import { fetchAlgorandNews } from './algorand.js';
import { alertStore } from '../services/index.js';
import { Alert } from '../types/index.js';

export { fetchSECFilings, testSECFetcher } from './sec-edgar.js';
export { fetchYieldAlerts, fetchTVLAlerts, testDeFiLlamaFetchers } from './defillama.js';
export { fetchWhaleAlerts, generateMockWhaleAlerts } from './whale-alert.js';
export { fetchGenfinityNews, testGenfinityFetcher } from './genfinity.js';
export { fetchCFTCReleases, generateMockCFTCAlerts, testCFTCFetcher } from './cftc.js';
export { fetchHackAlerts, generateMockHackAlerts, testHackFetchers } from './rekt-news.js';
export { fetchChainlinkNews, testChainlinkFetcher } from './chainlink.js';
export { fetchHederaNews, testHederaFetcher } from './hedera.js';
export { fetchSolanaNews, testSolanaFetcher } from './solana.js';
export { fetchAlgorandNews, testAlgorandFetcher } from './algorand.js';

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
  // Crypto project feeds
  chainlinkEnabled: boolean;
  chainlinkIntervalMs: number;
  hederaEnabled: boolean;
  hederaIntervalMs: number;
  solanaEnabled: boolean;
  solanaIntervalMs: number;
  algorandEnabled: boolean;
  algorandIntervalMs: number;
}

const DEFAULT_CONFIG: IngestionConfig = {
  secEnabled: true,
  secIntervalMs: 10 * 60 * 1000,
  cftcEnabled: true,
  cftcIntervalMs: 10 * 60 * 1000,
  mockCFTC: false,
  defiLlamaEnabled: true,
  defiLlamaIntervalMs: 5 * 60 * 1000,
  whaleAlertEnabled: false,
  whaleAlertApiKey: process.env.WHALE_ALERT_API_KEY,
  whaleAlertIntervalMs: 60 * 1000,
  mockWhales: false,
  hacksEnabled: true,
  hacksIntervalMs: 5 * 60 * 1000,
  mockHacks: false,
  genfinityEnabled: true,
  genfinityIntervalMs: 5 * 60 * 1000,
  // Crypto project feeds - poll every 10 minutes (blogs don't update that frequently)
  chainlinkEnabled: true,
  chainlinkIntervalMs: 10 * 60 * 1000,
  hederaEnabled: true,
  hederaIntervalMs: 10 * 60 * 1000,
  solanaEnabled: true,
  solanaIntervalMs: 10 * 60 * 1000,
  algorandEnabled: true,
  algorandIntervalMs: 10 * 60 * 1000
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

  onAlert(handler: AlertHandler) {
    this.handlers.push(handler);
  }

  private async processAlerts(alerts: Alert[]) {
    console.log(`[Ingestion] processAlerts called with ${alerts.length} alert(s), ${this.handlers.length} handler(s) registered`);
    for (const alert of alerts) {
      for (const handler of this.handlers) {
        try {
          console.log(`[Ingestion] Calling handler for alert: ${alert.alertId}`);
          await handler(alert);
        } catch (error) {
          console.error('[Ingestion] Handler error:', error);
        }
      }
    }
  }

  private async pollSEC() {
    console.log('[Ingestion] Polling SEC EDGAR...');
    const inputs = await fetchSECFilings();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
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

  private async pollDeFiLlama() {
    console.log('[Ingestion] Polling DeFiLlama...');
    const yieldInputs = await fetchYieldAlerts();
    const tvlInputs = await fetchTVLAlerts();
    const allInputs = [...yieldInputs, ...tvlInputs];
    const alerts: Alert[] = [];
    
    for (const input of allInputs) {
      const alert = await alertStore.add(input);
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
      const alert = await alertStore.add(input);
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

  private async pollGenfinity() {
    console.log('[Ingestion] Polling Genfinity...');
    const inputs = await fetchGenfinityNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
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
      const alert = await alertStore.add(input);
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
      const alert = await alertStore.add(input);
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

  private async pollChainlink() {
    console.log('[Ingestion] Polling Chainlink blog...');
    const inputs = await fetchChainlinkNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Chainlink alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Chainlink: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollHedera() {
    console.log('[Ingestion] Polling Hedera blog...');
    const inputs = await fetchHederaNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Hedera alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Hedera: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollSolana() {
    console.log('[Ingestion] Polling Solana news...');
    const inputs = await fetchSolanaNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Solana alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Solana: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollAlgorand() {
    console.log('[Ingestion] Polling Algorand blog...');
    const inputs = await fetchAlgorandNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Algorand alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Algorand: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    
    console.log('[Ingestion] Starting ingestion engine...');

    if (this.config.secEnabled) {
      await this.pollSEC();
      this.intervals.push(setInterval(() => this.pollSEC(), this.config.secIntervalMs));
    }

    if (this.config.defiLlamaEnabled) {
      await this.pollDeFiLlama();
      this.intervals.push(setInterval(() => this.pollDeFiLlama(), this.config.defiLlamaIntervalMs));
    }

    if (this.config.whaleAlertEnabled) {
      await this.pollWhaleAlert();
      this.intervals.push(setInterval(() => this.pollWhaleAlert(), this.config.whaleAlertIntervalMs));
    }

    if (this.config.genfinityEnabled) {
      await this.pollGenfinity();
      this.intervals.push(setInterval(() => this.pollGenfinity(), this.config.genfinityIntervalMs));
    }

    if (this.config.cftcEnabled) {
      await this.pollCFTC();
      this.intervals.push(setInterval(() => this.pollCFTC(), this.config.cftcIntervalMs));
    }

    if (this.config.hacksEnabled) {
      await this.pollHacks();
      this.intervals.push(setInterval(() => this.pollHacks(), this.config.hacksIntervalMs));
    }

    // Crypto project feeds
    if (this.config.chainlinkEnabled) {
      await this.pollChainlink();
      this.intervals.push(setInterval(() => this.pollChainlink(), this.config.chainlinkIntervalMs));
    }

    if (this.config.hederaEnabled) {
      await this.pollHedera();
      this.intervals.push(setInterval(() => this.pollHedera(), this.config.hederaIntervalMs));
    }

    if (this.config.solanaEnabled) {
      await this.pollSolana();
      this.intervals.push(setInterval(() => this.pollSolana(), this.config.solanaIntervalMs));
    }

    if (this.config.algorandEnabled) {
      await this.pollAlgorand();
      this.intervals.push(setInterval(() => this.pollAlgorand(), this.config.algorandIntervalMs));
    }

    console.log('[Ingestion] Engine started');
  }

  stop() {
    this.running = false;
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    console.log('[Ingestion] Engine stopped');
  }

  async pollOnce() {
    const alerts: Alert[] = [];
    
    if (this.config.secEnabled) {
      const inputs = await fetchSECFilings();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.defiLlamaEnabled) {
      const yieldInputs = await fetchYieldAlerts();
      const tvlInputs = await fetchTVLAlerts();
      for (const input of [...yieldInputs, ...tvlInputs]) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.whaleAlertEnabled) {
      const inputs = this.config.mockWhales 
        ? generateMockWhaleAlerts() 
        : await fetchWhaleAlerts(this.config.whaleAlertApiKey);
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.genfinityEnabled) {
      const inputs = await fetchGenfinityNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.cftcEnabled) {
      const inputs = this.config.mockCFTC
        ? generateMockCFTCAlerts()
        : await fetchCFTCReleases();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.hacksEnabled) {
      const inputs = this.config.mockHacks
        ? generateMockHackAlerts()
        : await fetchHackAlerts();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    // Crypto project feeds
    if (this.config.chainlinkEnabled) {
      const inputs = await fetchChainlinkNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.hederaEnabled) {
      const inputs = await fetchHederaNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.solanaEnabled) {
      const inputs = await fetchSolanaNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.algorandEnabled) {
      const inputs = await fetchAlgorandNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    await this.processAlerts(alerts);
    return alerts;
  }
}
