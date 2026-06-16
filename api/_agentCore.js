const MANTLE_CHAIN_ID = 5000;
const LIFI_API = 'https://li.quest/v1';
const INTENTS_API = 'https://order.li.fi';
const EARN_API = 'https://earn.li.fi';

export const AGENT_TOOLS = [
  {
    name: 'get_protocol_data',
    description: 'Retrieves live TVL, fees, and metrics for a Mantle protocol from DeFiLlama. Prefer protocolSlug when known.',
    input_schema: {
      type: 'object',
      properties: {
        protocolSlug: { type: 'string', description: 'DeFiLlama slug, e.g. merchant-moe, init-capital, meth-protocol.' },
        protocolName: { type: 'string', description: 'Human protocol name if slug is unknown.' },
      },
    },
  },
  {
    name: 'execute_transaction',
    description: 'Builds a user-confirmed Mantle transaction intent. Do not call before user confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        protocol: { type: 'string' },
        action: { type: 'string' },
        tokenIn: { type: 'string' },
        amountIn: { type: 'string' },
        tokenOut: { type: 'string' },
      },
      required: ['protocol', 'action', 'tokenIn', 'amountIn'],
    },
  },
  {
    name: 'lifi_get_bridge_quote',
    description: 'Get the optimal quote for moving tokens to Mantle. Selects OFT for mETH/MNT/USDY/FBTC, LI.FI Intents for USDC/USDT/DAI, otherwise LI.FI Classic.',
    input_schema: {
      type: 'object',
      properties: {
        fromChain: { type: 'string' },
        fromToken: { type: 'string' },
        toToken: { type: 'string' },
        amountUSD: { type: 'number' },
      },
      required: ['fromChain', 'fromToken', 'toToken', 'amountUSD'],
    },
  },
  {
    name: 'lifi_get_earn_vaults',
    description: 'Discover Mantle yield vaults via LI.FI Earn.',
    input_schema: {
      type: 'object',
      properties: {
        asset: { type: 'string' },
        sortBy: { type: 'string', enum: ['apy', 'tvl'], default: 'apy' },
        limit: { type: 'number', default: 5 },
      },
    },
  },
  {
    name: 'lifi_compose_deposit',
    description: 'Create a LI.FI Composer bridge + deposit quote into a Mantle vault token address.',
    input_schema: {
      type: 'object',
      properties: {
        fromChain: { type: 'string' },
        fromToken: { type: 'string' },
        vaultAddress: { type: 'string' },
        amountUSD: { type: 'number' },
      },
      required: ['fromChain', 'fromToken', 'vaultAddress', 'amountUSD'],
    },
  },
  {
    name: 'lifi_track_transfer',
    description: 'Track a LI.FI transfer by transaction hash.',
    input_schema: {
      type: 'object',
      properties: {
        txHash: { type: 'string' },
        fromChain: { type: 'string' },
        bridge: { type: 'string' },
      },
      required: ['txHash', 'fromChain'],
    },
  },
];

const CHAIN_NAME_TO_ID = {
  ethereum: 1,
  mainnet: 1,
  arbitrum: 42161,
  'arbitrum one': 42161,
  base: 8453,
  optimism: 10,
  polygon: 137,
  bsc: 56,
  'bnb smart chain': 56,
  avalanche: 43114,
  solana: 1151111081099710,
  mantle: 5000,
};

const PROTOCOL_SLUG_HINTS = {
  'merchant moe': 'merchant-moe',
  init: 'init-capital',
  'init capital': 'init-capital',
  meth: 'meth-protocol',
  'meth protocol': 'meth-protocol',
  lendle: 'lendle',
  agni: 'agni-finance',
  'ondo': 'ondo-finance',
  'ondo finance': 'ondo-finance',
};

function getChainId(chainName = '') {
  return CHAIN_NAME_TO_ID[String(chainName).toLowerCase().trim()] || 1;
}

function formatUsd(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 'N/A';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${Math.round(num).toLocaleString()}`;
}

function decideBridgeStrategy(fromToken, toToken) {
  const from = String(fromToken || '').trim().toUpperCase();
  const to = String(toToken || '').trim().toUpperCase();
  const oft = new Set(['METH', 'MNT', 'USDY', 'FBTC']);
  const intents = new Set(['USDC', 'USDT', 'DAI', 'USDC.E', 'USDT.E']);
  if (oft.has(from) || oft.has(to)) {
    return { strategy: 'OFT', label: 'LayerZero OFT', description: 'Burn on source, mint on Mantle via DVN attestation.', icon: 'OFT', estimatedTime: '30-60 seconds', requiresInventory: false };
  }
  if (intents.has(from) || intents.has(to)) {
    return { strategy: 'INTENTS', label: 'LI.FI Intents', description: 'Solver pre-funds exact output on Mantle.', icon: 'INTENTS', estimatedTime: '5-15 seconds', requiresInventory: true };
  }
  return { strategy: 'CLASSIC', label: 'LI.FI Aggregated Route', description: 'Best available route across bridges and DEXs.', icon: 'CLASSIC', estimatedTime: '30 seconds - 5 minutes', requiresInventory: false };
}

function amountToRaw(fromToken, amountUSD) {
  const token = String(fromToken || '').toUpperCase();
  const stable = ['USDC', 'USDT', 'DAI', 'USDC.E', 'USDT.E'].includes(token);
  const decimals = stable ? 6 : 18;
  const tokenAmount = token === 'ETH' || token === 'WETH' ? Number(amountUSD) / 2500 : Number(amountUSD);
  return Math.max(0, Math.floor(tokenAmount * 10 ** decimals)).toString();
}

function fallbackQuote(strategy, input, fromAddress, reason) {
  const fromChainId = getChainId(input.fromChain);
  const fromAmount = amountToRaw(input.fromToken, input.amountUSD || 0);
  return {
    status: 'success',
    strategy,
    useOFT: strategy.strategy === 'OFT',
    isFallback: true,
    isStale: true,
    fallbackReason: reason,
    quote: {
      tool: strategy.strategy === 'OFT' ? 'LayerZero OFT' : 'LI.FI fallback estimate',
      estimate: {
        toAmount: strategy.strategy === 'CLASSIC' ? String(Number(input.amountUSD || 0) * 0.992) : fromAmount,
        executionDuration: strategy.strategy === 'INTENTS' ? 12 : strategy.strategy === 'OFT' ? 45 : 180,
        feeCosts: [{ amountUSD: strategy.strategy === 'CLASSIC' ? '1.20' : '0.12', name: 'Estimated fee' }],
      },
      action: { fromChainId, toChainId: MANTLE_CHAIN_ID, fromToken: input.fromToken, toToken: input.toToken },
      transactionRequest: strategy.strategy === 'CLASSIC' ? { from: fromAddress, to: '0x0000000000000000000000000000000000000000', data: '0x', value: '0' } : undefined,
    },
  };
}

async function fetchClassicQuote(input, fromAddress, strategyOverride) {
  const params = new URLSearchParams({
    fromChain: String(getChainId(input.fromChain)),
    toChain: String(MANTLE_CHAIN_ID),
    fromToken: input.fromToken,
    toToken: input.toToken,
    fromAmount: amountToRaw(input.fromToken, input.amountUSD),
    fromAddress,
    slippage: '0.005',
    integrator: 'mantle-agentic-portal',
  });
  const res = await fetch(`${LIFI_API}/quote?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`LI.FI Classic quote failed: ${res.status}`);
  return { status: 'success', strategy: strategyOverride || decideBridgeStrategy(input.fromToken, input.toToken), useOFT: false, quote: await res.json() };
}

async function getBridgeQuote(input, fromAddress) {
  const strategy = decideBridgeStrategy(input.fromToken, input.toToken);
  if (strategy.strategy === 'OFT') {
    return fallbackQuote(strategy, input, fromAddress, 'OFT route selected; LayerZero execution quote is estimated until wallet execution.');
  }
  if (strategy.strategy === 'INTENTS') {
    const params = new URLSearchParams({
      fromChainId: String(getChainId(input.fromChain)),
      toChainId: String(MANTLE_CHAIN_ID),
      fromToken: input.fromToken,
      toToken: input.toToken,
      fromAmount: amountToRaw(input.fromToken, input.amountUSD),
      fromAddress,
    });
    try {
      const res = await fetch(`${INTENTS_API}/api/v1/integrator/quote/request?${params}`, { headers: { Accept: 'application/json' } });
      if (res.ok) return { status: 'success', strategy, useOFT: false, quote: await res.json() };
    } catch {}
    const classic = { ...decideBridgeStrategy('ETH', 'ETH'), description: 'No active Intents solver route was available; using LI.FI Classic aggregation.' };
    try {
      return { ...(await fetchClassicQuote(input, fromAddress, classic)), intentsFallback: true };
    } catch {
      return fallbackQuote(classic, input, fromAddress, 'LI.FI Intents and Classic quote APIs were unavailable.');
    }
  }
  try {
    return await fetchClassicQuote(input, fromAddress);
  } catch {
    return fallbackQuote(strategy, input, fromAddress, 'LI.FI Classic quote API was unavailable.');
  }
}

async function fetchProtocolData(input) {
  const slug = input.protocolSlug || PROTOCOL_SLUG_HINTS[String(input.protocolName || '').toLowerCase()];
  if (!slug) {
    return { status: 'error', error: 'protocolSlug is required for live protocol data.', isFallback: false, isStale: false };
  }
  const detailsRes = await fetch(`https://api.llama.fi/protocol/${slug}`, { headers: { Accept: 'application/json' } });
  if (!detailsRes.ok) throw new Error(`DeFiLlama protocol lookup failed: ${detailsRes.status}`);
  const details = await detailsRes.json();
  const mantleKey = details.currentChainTvls ? Object.keys(details.currentChainTvls).find((key) => key.toLowerCase() === 'mantle') : null;
  const mantleTvlNum = mantleKey ? details.currentChainTvls[mantleKey] : 0;
  const totalTvlNum = details.currentChainTvls
    ? Object.values(details.currentChainTvls).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    : details.tvl?.at?.(-1)?.totalLiquidityUSD || 0;
  let feeNum = null;
  for (const dataType of ['dailyFees', 'dailyRevenue']) {
    const feesRes = await fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=${dataType}`, { headers: { Accept: 'application/json' } }).catch(() => null);
    if (!feesRes?.ok) continue;
    const fees = await feesRes.json().catch(() => null);
    const feeMantleKey = fees?.chainBreakdown ? Object.keys(fees.chainBreakdown).find((key) => key.toLowerCase() === 'mantle') : null;
    if (feeMantleKey && typeof fees.chainBreakdown[feeMantleKey]?.total24h === 'number') {
      feeNum = fees.chainBreakdown[feeMantleKey].total24h;
      break;
    }
  }
  return {
    status: 'success',
    tvl: formatUsd(totalTvlNum),
    mantleTvl: formatUsd(mantleTvlNum),
    fees24h: formatUsd(feeNum),
    logoUrl: details.logo || `https://icons.llamao.fi/icons/protocols/${slug}.png`,
    dataSource: 'DeFiLlama',
    isFallback: false,
    isStale: false,
    fetchedAt: Date.now(),
  };
}

async function getEarnVaults(input) {
  try {
    const params = new URLSearchParams({ chainId: String(MANTLE_CHAIN_ID), sortBy: input.sortBy || 'apy', limit: String(input.limit || 5) });
    if (input.asset) params.set('asset', input.asset);
    const res = await fetch(`${EARN_API}/v1/vaults?${params}`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return { status: 'success', vaults: (data.data || []).map((vault) => ({ ...vault, isFallback: false, isStale: false })) };
    }
  } catch {}
  return {
    status: 'success',
    isFallback: true,
    isStale: true,
    fallbackReason: 'LI.FI Earn API was unavailable or returned no Mantle vaults.',
    vaults: [],
  };
}

export async function executeToolCallJS(toolName, toolInput, address = '0x0000000000000000000000000000000000000000') {
  switch (toolName) {
    case 'get_protocol_data':
      return fetchProtocolData(toolInput);
    case 'execute_transaction':
      return { status: 'queued', requiresConfirmation: true, ...toolInput };
    case 'lifi_get_bridge_quote':
      return getBridgeQuote(toolInput, address);
    case 'lifi_get_earn_vaults':
      return getEarnVaults(toolInput || {});
    case 'lifi_compose_deposit':
      return getBridgeQuote({ fromChain: toolInput.fromChain, fromToken: toolInput.fromToken, toToken: toolInput.vaultAddress, amountUSD: toolInput.amountUSD }, address);
    case 'lifi_track_transfer': {
      const params = new URLSearchParams({ txHash: toolInput.txHash, fromChain: String(getChainId(toolInput.fromChain)), toChain: String(MANTLE_CHAIN_ID) });
      if (toolInput.bridge) params.set('bridge', toolInput.bridge);
      const res = await fetch(`${LIFI_API}/status?${params}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return { status: 'success', transferStatus: 'PENDING', isFallback: true, isStale: true };
      return { status: 'success', ...(await res.json()), isFallback: false, isStale: false };
    }
    default:
      throw new Error(`Unsupported tool call: ${toolName}`);
  }
}

export async function streamAnthropicCall(messages, systemPrompt, anthropicKey, res, address, depth = 0) {
  if (depth > 5) {
    res.write(`data: ${JSON.stringify({ text: '\nTool loop depth exceeded limit.' })}\n\n`);
    res.end();
    return;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1400,
      stream: true,
      system: systemPrompt,
      messages,
      tools: AGENT_TOOLS,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic stream failed with code ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let currentText = '';
  const toolCalls = [];
  let currentToolCall = null;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      const parsed = JSON.parse(payload);
      if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
        currentToolCall = { id: parsed.content_block.id, name: parsed.content_block.name, inputStr: '' };
      } else if (parsed.type === 'content_block_delta') {
        if (parsed.delta?.type === 'text_delta') {
          currentText += parsed.delta.text;
          res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
        } else if (parsed.delta?.type === 'input_json_delta' && currentToolCall) {
          currentToolCall.inputStr += parsed.delta.partial_json;
        }
      } else if (parsed.type === 'content_block_stop' && currentToolCall) {
        currentToolCall.input = JSON.parse(currentToolCall.inputStr || '{}');
        toolCalls.push(currentToolCall);
        currentToolCall = null;
      }
    }
  }

  if (!toolCalls.length) {
    res.end();
    return;
  }

  const assistantContent = currentText ? [{ type: 'text', text: currentText }] : [];
  const toolResults = [];
  for (const tc of toolCalls) {
    assistantContent.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
    res.write(`data: ${JSON.stringify({ toolCall: { name: tc.name, input: tc.input } })}\n\n`);
    let result;
    try {
      result = await executeToolCallJS(tc.name, tc.input, address);
    } catch (err) {
      result = { status: 'error', error: err.message };
    }
    res.write(`data: ${JSON.stringify({ toolResult: { name: tc.name, input: tc.input, result } })}\n\n`);
    toolResults.push({ type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) });
  }

  await streamAnthropicCall([...messages, { role: 'assistant', content: assistantContent }, { role: 'user', content: toolResults }], systemPrompt, anthropicKey, res, address, depth + 1);
}
