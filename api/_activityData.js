const MANTLE_EXPLORER_API = 'https://explorer.mantle.xyz/api/v2';
const MANTLE_RPC_URL = 'https://rpc.mantle.xyz';
const CACHE_TTL_MS = 20 * 1000;
const cache = new Map();

function getRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function shortAddress(address) {
  if (!address || address.length < 12) return '0xunknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || '')) && !/^0x0{40}$/i.test(String(address || ''));
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ELTNAM-Mantle-Portal/1.0',
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function rpcCall(method, params = [], timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(MANTLE_RPC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'RPC error');
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

function actionFromTransaction(item, projectName, category) {
  const from = shortAddress(item.from?.hash || item.from_address_hash || item.from);
  const method = item.method || item.decoded_input?.method_call || item.tx_types?.[0] || 'transaction';
  const transfer = item.token_transfers?.[0];

  if (transfer) {
    const decimals = Number.parseInt(transfer.token?.decimals || transfer.decimals || '18', 10);
    const raw = Number(transfer.total?.value || transfer.amount || 0);
    const amount = Number.isFinite(raw) ? raw / Math.pow(10, Number.isFinite(decimals) ? decimals : 18) : 0;
    const formatted = amount >= 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toLocaleString(undefined, { maximumFractionDigits: 3 });
    const symbol = transfer.token?.symbol || 'token';
    return `${from} ${method} ${formatted} ${symbol} on ${projectName}`;
  }

  const categoryVerb = category === 'dex'
    ? 'executed swap/liquidity tx'
    : category === 'lending'
      ? 'executed lending tx'
      : category === 'bridge'
        ? 'executed bridge tx'
        : 'interacted';

  return `${from} ${categoryVerb} on ${projectName} (${method})`;
}

function normalizeTransactions(items, projectName, category) {
  return items
    .filter((item) => item?.hash && item?.timestamp)
    .slice(0, 8)
    .map((item) => ({
      action: actionFromTransaction(item, projectName, category),
      time: getRelativeTime(item.timestamp),
      hash: item.hash,
      url: `https://explorer.mantle.xyz/tx/${item.hash}`,
      source: 'Mantle Explorer',
    }));
}

async function fetchRpcActivity(address, projectName, category) {
  const latestHex = await rpcCall('eth_blockNumber');
  const latest = Number.parseInt(latestHex, 16);
  const targetAddress = isValidAddress(address) ? String(address).toLowerCase() : '';
  const results = [];

  for (let offset = 0; offset < 8 && results.length < 8; offset += 1) {
    const blockNumber = `0x${(latest - offset).toString(16)}`;
    const block = await rpcCall('eth_getBlockByNumber', [blockNumber, true]);
    const timestamp = Number.parseInt(block?.timestamp || '0x0', 16) * 1000;
    const txs = Array.isArray(block?.transactions) ? block.transactions : [];

    for (const tx of txs) {
      const from = String(tx?.from || '').toLowerCase();
      const to = String(tx?.to || '').toLowerCase();
      if (targetAddress && from !== targetAddress && to !== targetAddress) continue;

      const categoryVerb = category === 'dex'
        ? 'executed Mantle DEX tx'
        : category === 'lending'
          ? 'executed Mantle lending tx'
          : category === 'bridge'
            ? 'executed Mantle bridge tx'
            : 'executed Mantle tx';

      results.push({
        action: targetAddress
          ? `${shortAddress(from)} ${categoryVerb} on ${projectName}`
          : `${shortAddress(from)} ${categoryVerb}`,
        time: timestamp ? getRelativeTime(timestamp) : 'just now',
        hash: tx.hash,
        url: `https://explorer.mantle.xyz/tx/${tx.hash}`,
        source: targetAddress ? 'Mantle RPC contract scan' : 'Mantle RPC live blocks',
      });

      if (results.length >= 8) break;
    }
  }

  return results;
}

export async function fetchMantleActivity({ address, projectName = 'this protocol', category = '' }) {
  const addressKey = isValidAddress(address) ? String(address).toLowerCase() : 'recent';
  const key = `activity:${addressKey}:${projectName}:${category}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.value;

  const urls = [];
  if (isValidAddress(address)) {
    urls.push(`${MANTLE_EXPLORER_API}/addresses/${String(address).toLowerCase()}/transactions`);
  }
  urls.push(`${MANTLE_EXPLORER_API}/transactions`);

  for (const url of urls) {
    try {
      const data = await fetchJson(url);
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = normalizeTransactions(items, projectName, category);
      if (normalized.length > 0) {
        const value = {
          items: normalized,
          source: isValidAddress(address) && url.includes('/addresses/') ? 'Mantle Explorer contract feed' : 'Mantle Explorer live feed',
          fetchedAt: Date.now(),
        };
        cache.set(key, { value, fetchedAt: Date.now() });
        return value;
      }
    } catch (error) {
      console.warn(`[ActivityData] Mantle explorer fetch failed for ${projectName}:`, error.message);
    }
  }

  try {
    const normalized = await fetchRpcActivity(address, projectName, category);
    if (normalized.length > 0) {
      const value = {
        items: normalized,
        source: isValidAddress(address) ? 'Mantle RPC contract scan' : 'Mantle RPC live blocks',
        fetchedAt: Date.now(),
      };
      cache.set(key, { value, fetchedAt: Date.now() });
      return value;
    }
  } catch (error) {
    console.warn(`[ActivityData] Mantle RPC fallback failed for ${projectName}:`, error.message);
  }

  const stale = cache.get(key)?.value;
  if (stale) return { ...stale, source: `${stale.source} cache`, isStale: true };

  return {
    items: [
      {
        action: `Waiting for verified Mantle transactions for ${projectName}`,
        time: 'live',
        source: 'Mantle Explorer',
      },
    ],
    source: 'Mantle Explorer',
    fetchedAt: Date.now(),
  };
}

export function setActivityCacheHeaders(res) {
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
}
