/**
 * Trial Mode Configuration
 * 
 * Overrides on-chain pricing for testing/trial period.
 * Set TRIAL_MODE=false in production to use on-chain values.
 */

export const TRIAL_MODE = true;

export const TRIAL_CONFIG = {
  // Pricing
  pricePerAlert: 0,           // $0 per alert (free for trial)
  pricePerQuery: 0,           // $0 per historical query
  
  // Publisher requirements
  publisherStake: 0,          // 0 USDC stake required
  
  // Fees
  treasuryFeeBps: 0,          // 0% treasury fee
  publisherShareBps: 10000,   // 100% to publisher (if any revenue)
  
  // Limits
  maxAlertsPerDay: 1000,      // Rate limit per subscriber
  minDepositAmount: 0,        // No minimum deposit
};

/**
 * Get effective config (trial overrides on-chain if TRIAL_MODE is true)
 */
export function getEffectiveConfig(onChainConfig?: {
  pricePerAlert?: number;
  treasuryFeeBps?: number;
}) {
  if (TRIAL_MODE) {
    return {
      pricePerAlert: TRIAL_CONFIG.pricePerAlert,
      pricePerQuery: TRIAL_CONFIG.pricePerQuery,
      publisherStake: TRIAL_CONFIG.publisherStake,
      treasuryFeeBps: TRIAL_CONFIG.treasuryFeeBps,
      publisherShareBps: TRIAL_CONFIG.publisherShareBps,
      trialMode: true,
    };
  }
  
  // Use on-chain values
  return {
    pricePerAlert: onChainConfig?.pricePerAlert ?? 0.02,
    pricePerQuery: 0.05,
    publisherStake: 100,
    treasuryFeeBps: onChainConfig?.treasuryFeeBps ?? 3000,
    publisherShareBps: 5000,
    trialMode: false,
  };
}
