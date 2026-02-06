/**
 * Channel bitmap utilities
 * 
 * Channels are stored on-chain as a bitmap (u32) where each bit represents a channel.
 * This matches the mapping in the Solana program and API.
 */

// Channel definitions - must match api/src/services/solana-client.ts
export const CHANNEL_MAP: Record<string, number> = {
  'regulatory/sec': 0,
  'regulatory/cftc': 1,
  'regulatory/global': 2,
  'institutional/banks': 3,
  'institutional/asset-managers': 4,
  'defi/yields': 5,
  'defi/hacks': 6,
  'defi/protocols': 7,
  'rwa/tokenization': 8,
  'networks/solana': 9,
  'networks/ethereum': 10,
  'networks/canton': 11,
  'networks/hedera': 12,
  'networks/ripple': 13,
  'networks/avalanche': 14,
  'networks/bitcoin': 15,
  'markets/whale-movements': 16,
  'markets/liquidations': 17,
};

// Reverse mapping: bit position -> channel name
export const BIT_TO_CHANNEL: Record<number, string> = Object.fromEntries(
  Object.entries(CHANNEL_MAP).map(([channel, bit]) => [bit, channel])
);

// All channels grouped by category
export const CHANNELS_BY_CATEGORY: Record<string, string[]> = {
  'Regulatory': ['regulatory/sec', 'regulatory/cftc', 'regulatory/global'],
  'Institutional': ['institutional/banks', 'institutional/asset-managers'],
  'DeFi': ['defi/yields', 'defi/hacks', 'defi/protocols'],
  'RWA': ['rwa/tokenization'],
  'Networks': ['networks/solana', 'networks/ethereum', 'networks/canton', 'networks/hedera', 'networks/ripple', 'networks/avalanche', 'networks/bitcoin'],
  'Markets': ['markets/whale-movements', 'markets/liquidations'],
};

/**
 * Decode a channel bitmap to an array of channel names
 */
export function decodeChannelBitmap(bitmap: number): string[] {
  const channels: string[] = [];
  
  for (let bit = 0; bit < 32; bit++) {
    if (bitmap & (1 << bit)) {
      const channel = BIT_TO_CHANNEL[bit];
      if (channel) {
        channels.push(channel);
      }
    }
  }
  
  return channels;
}

/**
 * Encode an array of channel names to a bitmap
 */
export function encodeChannelBitmap(channels: string[]): number {
  let bitmap = 0;
  
  for (const channel of channels) {
    const bit = CHANNEL_MAP[channel];
    if (bit !== undefined) {
      bitmap |= (1 << bit);
    }
  }
  
  return bitmap;
}

/**
 * Get a short display name for a channel
 * e.g., "regulatory/sec" -> "SEC"
 */
export function getChannelShortName(channel: string): string {
  const shortNames: Record<string, string> = {
    'regulatory/sec': 'SEC',
    'regulatory/cftc': 'CFTC',
    'regulatory/global': 'Global Reg',
    'institutional/banks': 'Banks',
    'institutional/asset-managers': 'Asset Mgrs',
    'defi/yields': 'DeFi Yields',
    'defi/hacks': 'Hacks',
    'defi/protocols': 'Protocols',
    'rwa/tokenization': 'RWA',
    'networks/solana': 'Solana',
    'networks/ethereum': 'Ethereum',
    'networks/canton': 'Canton',
    'networks/hedera': 'Hedera',
    'networks/ripple': 'Ripple',
    'networks/avalanche': 'Avalanche',
    'networks/bitcoin': 'Bitcoin',
    'markets/whale-movements': 'Whales',
    'markets/liquidations': 'Liquidations',
  };
  
  return shortNames[channel] || channel.split('/')[1] || channel;
}

/**
 * Get category color for styling
 */
export function getCategoryColor(channel: string): string {
  const category = channel.split('/')[0];
  
  const colors: Record<string, string> = {
    'regulatory': 'bg-red-500/20 text-red-400 border-red-500/30',
    'institutional': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'defi': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'rwa': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'networks': 'bg-green-500/20 text-green-400 border-green-500/30',
    'markets': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  
  return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}
