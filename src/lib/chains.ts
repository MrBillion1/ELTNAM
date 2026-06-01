import { createPublicClient, http, defineChain } from 'viem';

export const MANTLE_CHAIN_ID = 5000;

export const mantleChain = defineChain({
  id: MANTLE_CHAIN_ID,
  name: 'Mantle',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Explorer',
      url: 'https://explorer.mantle.xyz',
    },
  },
});

export const mantlePublicClient = createPublicClient({
  chain: mantleChain,
  transport: http(),
});
