/**
 * Subscription management utilities
 * Handles localStorage persistence for seamless experience
 */

const STORAGE_KEY = 'anw_subscription';

export interface StoredSubscription {
  subscriberId: string;
  channels: string[];
  createdAt: string;
  walletAddress?: string;
}

/**
 * Save subscription to localStorage
 */
export function saveSubscription(sub: StoredSubscription): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
}

/**
 * Get subscription from localStorage
 */
export function getStoredSubscription(): StoredSubscription | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear subscription from localStorage
 */
export function clearSubscription(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Update subscription channels
 */
export function updateSubscriptionChannels(channels: string[]): void {
  const sub = getStoredSubscription();
  if (sub) {
    sub.channels = channels;
    saveSubscription(sub);
  }
}
