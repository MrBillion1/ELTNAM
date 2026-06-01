export interface Category {
  id: string;
  label: string;
  icon: string;
  mantleXyzLabel: string;
  approxCount: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All', icon: '🌐', mantleXyzLabel: 'All', approxCount: '242+' },
  { id: 'dex', label: 'DEX & AMM', icon: '💱', mantleXyzLabel: 'DEX, Aggregator, RFQ/Intents', approxCount: '58+' },
  { id: 'lending', label: 'Lending', icon: '💰', mantleXyzLabel: 'Lending, Money Market', approxCount: '24' },
  { id: 'derivatives', label: 'Derivatives', icon: '📈', mantleXyzLabel: 'Perpetual Futures, Intents', approxCount: '10+' },
  { id: 'ai', label: 'AI Agents', icon: '🤖', mantleXyzLabel: '(portal-exclusive)', approxCount: 'Growing' },
  { id: 'lst', label: 'Liquid Staking', icon: '🔒', mantleXyzLabel: 'Restaking, LST', approxCount: '3+' },
  { id: 'yield', label: 'Yield & Vaults', icon: '🌾', mantleXyzLabel: 'Vault', approxCount: '10' },
  { id: 'bridge', label: 'Bridges', icon: '🌉', mantleXyzLabel: 'Bridge', approxCount: '12' },
  { id: 'rwa', label: 'RWA & Stables', icon: '🏢', mantleXyzLabel: 'RWA/Synthetic', approxCount: '8+' },
  { id: 'gaming', label: 'Games & NFT', icon: '🎮', mantleXyzLabel: 'Games, NFT Marketplace', approxCount: '12+' },
  { id: 'infra', label: 'Infrastructure', icon: '⚙️', mantleXyzLabel: 'Oracle, Node Provider, Dev Tool', approxCount: '40+' },
  { id: 'social', label: 'Social & Quests', icon: '🗣️', mantleXyzLabel: 'Social, DAO Tool', approxCount: '10+' },
  { id: 'wallet', label: 'Wallet & Custody', icon: '💼', mantleXyzLabel: 'Wallet / Custody', approxCount: '16' },
  { id: 'fiat', label: 'On-Ramp & Fiat', icon: '💳', mantleXyzLabel: 'On-Ramp / Fiat', approxCount: '3' },
];

export const TOKEN_ADDRESSES = {
  mETH: '0xd5F79792Bed4FA45840d2d2a66e48bbE7aF7ef4F',
  USDY: '0x5bE265859eA4c87272b22079362172776029f6db',
  USDC: '0x09Bc4E0D864854c6aFB6Eb9ab62776E23ced2244',
  USDT: '0x201EBa99a684b4DB27a67af763d3e62EaD01aa8E',
  MNT: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000',
} as const;

export const LAYERZERO_ENDPOINT_IDS = {
  solana: 30168,
  mantle: 30181,
} as const;

export interface OnrampOption {
  name: string;
  url: string;
  description: string;
  logo: string;
  time: string;
  fee: string;
}

export const ONRAMP_OPTIONS: OnrampOption[] = [
  {
    name: 'Transak',
    url: 'https://global.transak.com/?walletAddress={walletAddress}&network=mantle',
    description: 'Buy with card or bank. 100+ countries.',
    logo: '🌐',
    time: '< 5 min',
    fee: '~1-2%',
  },
  {
    name: 'Banxa',
    url: 'https://banxa.com/',
    description: '130+ fiat currencies supported.',
    logo: '💳',
    time: '< 5 min',
    fee: '~1-3%',
  },
  {
    name: 'Onramp.money',
    url: 'https://onramp.money/',
    description: 'Fiat to Web3 in under 60 seconds.',
    logo: '⚡',
    time: '< 1 min',
    fee: '~1%',
  },
  {
    name: 'Alchemy Pay',
    url: 'https://alchemypay.org/',
    description: 'Global fiat-crypto payment gateway.',
    logo: '🔮',
    time: '< 3 min',
    fee: '~1-2%',
  },
];
