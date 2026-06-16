export const AGENT_TOOLS = [
  {
    name: 'bridge_tokens',
    description: 'Bridges tokens to Mantle from another chain using LayerZero OFT endpoints.',
    input_schema: {
      type: 'object',
      properties: {
        sourceChain: { type: 'string', description: 'The chain to transfer assets from (e.g. Solana, Arbitrum, Base, Ethereum).' },
        amount: { type: 'string', description: 'The quantity of tokens to bridge.' },
        destinationToken: { type: 'string', description: 'The token to receive on Mantle (e.g. MNT, USDC, mETH).' },
      },
      required: ['sourceChain', 'amount', 'destinationToken'],
    },
  },
  {
    name: 'get_protocol_data',
    description: 'Retrieves live TVL, fees, and metrics for a registered protocol using our 6-source waterfall API.',
    input_schema: {
      type: 'object',
      properties: {
        protocolId: { type: 'number', description: 'The numeric ID of the protocol in the Mantle Ecosystem registry.' },
      },
      required: ['protocolId'],
    },
  },
  {
    name: 'get_smart_money_flows',
    description: 'Queries Nansen token flow patterns for a specific Mantle asset address.',
    input_schema: {
      type: 'object',
      properties: {
        tokenAddress: { type: 'string', description: 'The ERC-20 contract address on Mantle.' },
      },
      required: ['tokenAddress'],
    },
  },
  {
    name: 'get_protocol_risk',
    description: 'Fetches De.Fi safety scanner and messari audit indicators for a smart contract.',
    input_schema: {
      type: 'object',
      properties: {
        protocolAddress: { type: 'string', description: 'The contract or treasury address to scan.' },
      },
      required: ['protocolAddress'],
    },
  },
  {
    name: 'get_protocol_tweets',
    description: 'Fetches high-signal tweets and sentiment patterns for a protocol name.',
    input_schema: {
      type: 'object',
      properties: {
        protocolName: { type: 'string', description: 'Ecosystem protocol name to look up.' },
        count: { type: 'number', description: 'Number of recent tweets to retrieve.' },
      },
      required: ['protocolName'],
    },
  },
  {
    name: 'get_protocol_discord_updates',
    description: 'Queries pre-indexed Discord cache channels for community and dev announcements.',
    input_schema: {
      type: 'object',
      properties: {
        protocolName: { type: 'string', description: 'Protocol name to filter.' },
        hoursBack: { type: 'number', description: 'Time horizon to query.' },
        highSignalOnly: { type: 'boolean', description: 'If true, filters announcement keywords.' },
      },
      required: ['protocolName'],
    },
  },
  {
    name: 'search_mantle_ecosystem_tweets',
    description: 'Searches public X.com streams for general Mantle keywords and developer activity.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword.' },
        sinceHours: { type: 'number', description: 'Hours horizon for search.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'execute_transaction',
    description: 'Constructs and submits a gasless user operation (ERC-4337 Biconomy) on Mantle.',
    input_schema: {
      type: 'object',
      properties: {
        protocol: { type: 'string', description: 'Name of target dApp.' },
        action: { type: 'string', description: 'Action type (e.g. Swap, Supply, Stake, Borrow).' },
        tokenIn: { type: 'string', description: 'Token contract address to supply.' },
        amountIn: { type: 'string', description: 'Amount to trade/supply.' },
        tokenOut: { type: 'string', description: 'Output token address if swapping.' },
      },
      required: ['protocol', 'action', 'tokenIn', 'amountIn'],
    },
  },
  {
    name: 'lifi_get_bridge_quote',
    description:
      'Get the optimal bridge route and quote for moving tokens to Mantle. ' +
      'Automatically selects between LI.FI Intents (stablecoins, exact output), ' +
      'LayerZero OFT (mETH, MNT, USDY, FBTC), or LI.FI Classic aggregation. ' +
      'Use when user wants to bridge assets from any chain to Mantle.',
    input_schema: {
      type: 'object',
      properties: {
        fromChain: { type: 'string', description: 'Source chain name (e.g. ethereum, solana, arbitrum, base, optimism)' },
        fromToken: { type: 'string', description: 'Source token symbol (e.g. USDC, USDT, ETH, SOL)' },
        toToken: { type: 'string', description: 'Destination token on Mantle (e.g. USDC, mETH, USDY, MNT)' },
        amountUSD: { type: 'number', description: 'Amount in USD to bridge' },
      },
      required: ['fromChain', 'fromToken', 'toToken', 'amountUSD'],
    },
  },
  {
    name: 'lifi_get_earn_vaults',
    description:
      'Discover yield-bearing vaults on Mantle via LI.FI Earn. ' +
      'Returns top vaults sorted by APY with TVL data. ' +
      'Use when user asks "where can I earn yield with my USDC on Mantle?" or similar.',
    input_schema: {
      type: 'object',
      properties: {
        asset: { type: 'string', description: 'Token symbol to filter vaults (e.g. USDC, mETH). Optional.' },
        sortBy: { type: 'string', enum: ['apy', 'tvl'], default: 'apy' },
        limit: { type: 'number', default: 5, description: 'Number of vaults to return' },
      },
    },
  },
  {
    name: 'lifi_compose_deposit',
    description:
      'Execute a one-click cross-chain deposit into a Mantle DeFi vault via LI.FI Composer. ' +
      'Handles bridging + depositing in one transaction. ' +
      'Use when user wants to deposit into a specific protocol from another chain.',
    input_schema: {
      type: 'object',
      properties: {
        fromChain: { type: 'string', description: 'Source chain' },
        fromToken: { type: 'string', description: 'Source token' },
        vaultAddress: { type: 'string', description: 'Mantle vault contract address from lifi_get_earn_vaults' },
        amountUSD: { type: 'number', description: 'Amount in USD to deposit' },
      },
      required: ['fromChain', 'fromToken', 'vaultAddress', 'amountUSD'],
    },
  },
  {
    name: 'lifi_track_transfer',
    description:
      'Track the status of a LI.FI bridge transfer. ' +
      'Returns: PENDING | DONE | FAILED with substatus details.',
    input_schema: {
      type: 'object',
      properties: {
        txHash: { type: 'string', description: 'Transaction hash from bridge execution' },
        fromChain: { type: 'string', description: 'Source chain name' },
      },
      required: ['txHash', 'fromChain'],
    },
  },
];
