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
// New sources
import { fetchCoinDeskNews } from './coindesk.js';
import { fetchDefiantNews } from './thedefiant.js';
import { fetchTheBlockNews } from './theblock.js';
import { fetchBlockworksNews } from './blockworks.js';
import { fetchDecryptNews } from './decrypt.js';
import { fetchFedNews } from './federal-reserve.js';
import { fetchKrakenNews } from './kraken.js';
import { fetchUnchainedNews } from './unchained.js';
import { fetchCointelegraphNews } from './cointelegraph.js';
import { fetchCryptoPotatoNews } from './cryptopotato.js';

import { alertStore } from '../services/index.js';
import { Alert } from '../types/index.js';

// Re-export existing
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

// Re-export new sources
export { fetchCoinDeskNews, testCoinDeskFetcher } from './coindesk.js';
export { fetchDefiantNews, testDefiantFetcher } from './thedefiant.js';
export { fetchTheBlockNews, testTheBlockFetcher } from './theblock.js';
export { fetchBlockworksNews, testBlockworksFetcher } from './blockworks.js';
export { fetchDecryptNews, testDecryptFetcher } from './decrypt.js';
export { fetchFedNews, testFedFetcher } from './federal-reserve.js';
export { fetchKrakenNews, testKrakenFetcher } from './kraken.js';
export { fetchUnchainedNews, testUnchainedFetcher } from './unchained.js';
export { fetchCointelegraphNews, testCointelegraphFetcher } from './cointelegraph.js';
export { fetchCryptoPotatoNews, testCryptoPotatoFetcher } from './cryptopotato.js';

type AlertHandler = (alert: Alert) => void | Promise<void>;

interface IngestionConfig {
  // Original sources
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
  // NEW: Major news sources
  coinDeskEnabled: boolean;
  coinDeskIntervalMs: number;
  defiantEnabled: boolean;
  defiantIntervalMs: number;
  theBlockEnabled: boolean;
  theBlockIntervalMs: number;
  blockworksEnabled: boolean;
  blockworksIntervalMs: number;
  decryptEnabled: boolean;
  decryptIntervalMs: number;
  fedEnabled: boolean;
  fedIntervalMs: number;
  krakenEnabled: boolean;
  krakenIntervalMs: number;
  unchainedEnabled: boolean;
  unchainedIntervalMs: number;
  cointelegraphEnabled: boolean;
  cointelegraphIntervalMs: number;
  cryptoPotatoEnabled: boolean;
  cryptoPotatoIntervalMs: number;
}

const DEFAULT_CONFIG: IngestionConfig = {
  // Original sources
  secEnabled: true,
  secIntervalMs: 10 * 60 * 1000,
  cftcEnabled: true,
  cftcIntervalMs: 10 * 60 * 1000,
  mockCFTC: false,
  defiLlamaEnabled: true,
  defiLlamaIntervalMs: 5 * 60 * 1000,
  whaleAlertEnabled: true,
  whaleAlertApiKey: process.env.WHALE_ALERT_API_KEY,
  whaleAlertIntervalMs: 5 * 60 * 1000,
  mockWhales: false,
  hacksEnabled: true,
  hacksIntervalMs: 5 * 60 * 1000,
  mockHacks: false,
  genfinityEnabled: true,
  genfinityIntervalMs: 5 * 60 * 1000,
  // Crypto project feeds
  chainlinkEnabled: true,
  chainlinkIntervalMs: 10 * 60 * 1000,
  hederaEnabled: true,
  hederaIntervalMs: 10 * 60 * 1000,
  solanaEnabled: true,
  solanaIntervalMs: 10 * 60 * 1000,
  algorandEnabled: true,
  algorandIntervalMs: 10 * 60 * 1000,
  // NEW: Major news sources - poll every 5 minutes
  coinDeskEnabled: true,
  coinDeskIntervalMs: 5 * 60 * 1000,
  defiantEnabled: true,
  defiantIntervalMs: 5 * 60 * 1000,
  theBlockEnabled: true,
  theBlockIntervalMs: 5 * 60 * 1000,
  blockworksEnabled: true,
  blockworksIntervalMs: 5 * 60 * 1000,
  decryptEnabled: true,
  decryptIntervalMs: 5 * 60 * 1000,
  fedEnabled: true,
  fedIntervalMs: 15 * 60 * 1000, // Fed releases less frequently
  krakenEnabled: true,
  krakenIntervalMs: 10 * 60 * 1000,
  unchainedEnabled: true,
  unchainedIntervalMs: 10 * 60 * 1000,
  cointelegraphEnabled: true,
  cointelegraphIntervalMs: 5 * 60 * 1000,
  cryptoPotatoEnabled: true,
  cryptoPotatoIntervalMs: 5 * 60 * 1000
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

  // ========== NEW SOURCE POLLERS ==========

  private async pollCoinDesk() {
    console.log('[Ingestion] Polling CoinDesk...');
    const inputs = await fetchCoinDeskNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New CoinDesk alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] CoinDesk: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollDefiant() {
    console.log('[Ingestion] Polling The Defiant...');
    const inputs = await fetchDefiantNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Defiant alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] The Defiant: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollTheBlock() {
    console.log('[Ingestion] Polling The Block...');
    const inputs = await fetchTheBlockNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New The Block alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] The Block: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollBlockworks() {
    console.log('[Ingestion] Polling Blockworks...');
    const inputs = await fetchBlockworksNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Blockworks alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Blockworks: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollDecrypt() {
    console.log('[Ingestion] Polling Decrypt...');
    const inputs = await fetchDecryptNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Decrypt alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Decrypt: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollFed() {
    console.log('[Ingestion] Polling Federal Reserve...');
    const inputs = await fetchFedNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Fed alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Federal Reserve: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollKraken() {
    console.log('[Ingestion] Polling Kraken blog...');
    const inputs = await fetchKrakenNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Kraken alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Kraken: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollUnchained() {
    console.log('[Ingestion] Polling Unchained...');
    const inputs = await fetchUnchainedNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Unchained alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Unchained: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollCointelegraph() {
    console.log('[Ingestion] Polling Cointelegraph...');
    const inputs = await fetchCointelegraphNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New Cointelegraph alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] Cointelegraph: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  private async pollCryptoPotato() {
    console.log('[Ingestion] Polling CryptoPotato...');
    const inputs = await fetchCryptoPotatoNews();
    const alerts: Alert[] = [];
    
    for (const input of inputs) {
      const alert = await alertStore.add(input);
      if (alert) {
        console.log(`[Ingestion] New CryptoPotato alert: ${alert.headline}`);
        alerts.push(alert);
      }
    }
    
    if (alerts.length > 0) {
      await this.processAlerts(alerts);
    }
    console.log(`[Ingestion] CryptoPotato: ${inputs.length} items, ${alerts.length} new alerts`);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    
    console.log('[Ingestion] Starting ingestion engine with 20 sources...');

    // Original sources
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

    // NEW: Major news sources
    if (this.config.coinDeskEnabled) {
      await this.pollCoinDesk();
      this.intervals.push(setInterval(() => this.pollCoinDesk(), this.config.coinDeskIntervalMs));
    }

    if (this.config.defiantEnabled) {
      await this.pollDefiant();
      this.intervals.push(setInterval(() => this.pollDefiant(), this.config.defiantIntervalMs));
    }

    if (this.config.theBlockEnabled) {
      await this.pollTheBlock();
      this.intervals.push(setInterval(() => this.pollTheBlock(), this.config.theBlockIntervalMs));
    }

    if (this.config.blockworksEnabled) {
      await this.pollBlockworks();
      this.intervals.push(setInterval(() => this.pollBlockworks(), this.config.blockworksIntervalMs));
    }

    if (this.config.decryptEnabled) {
      await this.pollDecrypt();
      this.intervals.push(setInterval(() => this.pollDecrypt(), this.config.decryptIntervalMs));
    }

    if (this.config.fedEnabled) {
      await this.pollFed();
      this.intervals.push(setInterval(() => this.pollFed(), this.config.fedIntervalMs));
    }

    if (this.config.krakenEnabled) {
      await this.pollKraken();
      this.intervals.push(setInterval(() => this.pollKraken(), this.config.krakenIntervalMs));
    }

    if (this.config.unchainedEnabled) {
      await this.pollUnchained();
      this.intervals.push(setInterval(() => this.pollUnchained(), this.config.unchainedIntervalMs));
    }

    if (this.config.cointelegraphEnabled) {
      await this.pollCointelegraph();
      this.intervals.push(setInterval(() => this.pollCointelegraph(), this.config.cointelegraphIntervalMs));
    }

    if (this.config.cryptoPotatoEnabled) {
      await this.pollCryptoPotato();
      this.intervals.push(setInterval(() => this.pollCryptoPotato(), this.config.cryptoPotatoIntervalMs));
    }

    console.log('[Ingestion] Engine started with 20 data sources');
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
    
    // Original sources
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

    // NEW: Major news sources
    if (this.config.coinDeskEnabled) {
      const inputs = await fetchCoinDeskNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.defiantEnabled) {
      const inputs = await fetchDefiantNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.theBlockEnabled) {
      const inputs = await fetchTheBlockNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.blockworksEnabled) {
      const inputs = await fetchBlockworksNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.decryptEnabled) {
      const inputs = await fetchDecryptNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.fedEnabled) {
      const inputs = await fetchFedNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.krakenEnabled) {
      const inputs = await fetchKrakenNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.unchainedEnabled) {
      const inputs = await fetchUnchainedNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.cointelegraphEnabled) {
      const inputs = await fetchCointelegraphNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    if (this.config.cryptoPotatoEnabled) {
      const inputs = await fetchCryptoPotatoNews();
      for (const input of inputs) {
        const alert = await alertStore.add(input);
        if (alert) alerts.push(alert);
      }
    }

    await this.processAlerts(alerts);
    return alerts;
  }
}
