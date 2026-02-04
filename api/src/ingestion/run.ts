/**
 * Standalone ingestion test script
 * Run with: npm run ingest
 */

import { testSECFetcher } from './sec-edgar.js';
import { testDeFiLlamaFetchers } from './defillama.js';
import { generateMockWhaleAlerts } from './whale-alert.js';
import { testGenfinityFetcher } from './genfinity.js';

async function main() {
  console.log('=== Agent News Wire - Ingestion Test ===\n');

  // Test SEC
  console.log('--- SEC EDGAR ---');
  const secAlerts = await testSECFetcher();
  console.log();

  // Test DeFiLlama
  console.log('--- DeFiLlama ---');
  const defiAlerts = await testDeFiLlamaFetchers();
  console.log();

  // Test Whale Alert (mock)
  console.log('--- Whale Alert (Mock) ---');
  const whaleAlerts = generateMockWhaleAlerts();
  console.log(`Generated ${whaleAlerts.length} mock whale alerts:`);
  for (const alert of whaleAlerts) {
    console.log(`  - ${alert.headline}`);
  }
  console.log();

  // Test Genfinity
  console.log('--- Genfinity ---');
  const genfinityAlerts = await testGenfinityFetcher();
  console.log();

  // Summary
  console.log('=== Summary ===');
  console.log(`SEC alerts: ${secAlerts.length}`);
  console.log(`DeFi alerts: ${defiAlerts.length}`);
  console.log(`Whale alerts: ${whaleAlerts.length}`);
  console.log(`Genfinity alerts: ${genfinityAlerts.length}`);
  console.log(`Total: ${secAlerts.length + defiAlerts.length + whaleAlerts.length + genfinityAlerts.length}`);
}

main().catch(console.error);
