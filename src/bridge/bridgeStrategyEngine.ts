// src/bridge/bridgeStrategyEngine.ts

export type BridgeStrategy = 'OFT' | 'INTENTS' | 'CLASSIC';

export interface StrategyResult {
  strategy: BridgeStrategy;
  label: string;
  description: string;
  icon: string;
  color: string;
  estimatedTime: string;
  requiresInventory: boolean;
}

// Tokens that use LayerZero OFT (burn→attest→mint, no inventory needed)
const OFT_TOKENS = new Set(['METH', 'MNT', 'USDY', 'FBTC']);

// Tokens optimised for LI.FI Intents (solver pre-funding, exact output)
const INTENTS_TOKENS = new Set(['USDC', 'USDT', 'DAI', 'USDC.E', 'USDT.E']);

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function decideBridgeStrategy(fromTokenSymbol: string, toTokenSymbol: string): StrategyResult {
  const symbol = normalizeSymbol(fromTokenSymbol || '');
  const toSymbol = normalizeSymbol(toTokenSymbol || '');

  // OFT tokens: use LayerZero OFT (burn-and-mint, no solver inventory required)
  if (OFT_TOKENS.has(symbol) || OFT_TOKENS.has(toSymbol)) {
    return {
      strategy: 'OFT',
      label: 'LayerZero OFT',
      description: 'Burn on source, mint on Mantle. Trust-minimised via DVN attestation.',
      icon: '🔥',
      color: 'orange',
      estimatedTime: '30–60 seconds',
      requiresInventory: false,
    };
  }

  // Major stablecoins: use LI.FI Intents (exact output, solver pre-funds)
  if (INTENTS_TOKENS.has(symbol) || INTENTS_TOKENS.has(toSymbol)) {
    return {
      strategy: 'INTENTS',
      label: 'LI.FI Intents',
      description: 'Solver pre-funds exact output on Mantle. Near-instant, zero slippage.',
      icon: '⚡',
      color: 'blue',
      estimatedTime: '5–15 seconds',
      requiresInventory: true,
    };
  }

  // Everything else: LI.FI Classic aggregation
  return {
    strategy: 'CLASSIC',
    label: 'LI.FI Aggregated Route',
    description: 'Best available route across bridges and DEXs. May include a swap.',
    icon: '🔀',
    color: 'purple',
    estimatedTime: '30 seconds – 5 minutes',
    requiresInventory: false,
  };
}
