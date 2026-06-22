const MANTLE_CHAIN = 'mantle';
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

// Some protocols track fees under a different (child) slug on DeFiLlama.
// Key = the defillamaSlug we store in mantleProjects.ts
// Value = array of alternative slugs to try for fee lookups.
const SLUG_FEE_ALIASES = {
  'merchant-moe':    ['merchant-moe-liquidity-book', 'merchant-moe-dex'],
  'stargate-v1':     ['stargate-v2', 'stargate-v1'],
  'lendle-pooled-markets': ['lendle-pooled-markets'],
  'compound-v3':     ['compound-v3'],
  'ondo-yield-assets': ['ondo-yield-assets'],
  'agni-finance':    ['agni-finance'],
};

export function formatUsd(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '-';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${Math.round(num).toLocaleString()}`;
}

function getCached(key, { allowStale = false } = {}) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (!allowStale && Date.now() - hit.fetchedAt > CACHE_TTL_MS) return null;
  return hit.value;
}

function setCached(key, value) {
  cache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function isUsefulDisplay(value) {
  return Boolean(value && value !== 'N/A' && value !== '$0' && value !== '$0.00' && value !== '-' && value !== '—');
}

function pickMetric(primary, fallback = '', emptyLabel = '-') {
  if (isUsefulDisplay(primary)) return primary;
  if (isUsefulDisplay(fallback)) return fallback;
  return emptyLabel;
}

function getMantleTvlNumber(details) {
  const chainTvls = details?.currentChainTvls || {};
  const mantleKey = Object.keys(chainTvls).find((key) => key.toLowerCase() === MANTLE_CHAIN);
  if (mantleKey && typeof chainTvls[mantleKey] === 'number') return chainTvls[mantleKey];

  const chains = Array.isArray(details?.chains) ? details.chains.map((chain) => String(chain).toLowerCase()) : [];
  const isOnlyMantle = chains.length === 1 && chains[0] === MANTLE_CHAIN;
  if (isOnlyMantle) {
    const totalFromChains = Object.values(chainTvls).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0
    );
    if (totalFromChains > 0) return totalFromChains;
    const last = Array.isArray(details?.tvl) ? details.tvl.at(-1) : null;
    if (typeof last?.totalLiquidityUSD === 'number') return last.totalLiquidityUSD;
  }

  return 0;
}

function getGlobalTvlNumber(details) {
  const chainTvls = details?.currentChainTvls || {};
  const totalFromChains = Object.values(chainTvls).reduce(
    (sum, value) => sum + (typeof value === 'number' ? value : 0),
    0
  );
  if (totalFromChains > 0) return totalFromChains;
  const last = Array.isArray(details?.tvl) ? details.tvl.at(-1) : null;
  return typeof last?.totalLiquidityUSD === 'number' ? last.totalLiquidityUSD : 0;
}

function extractMantleFeeNumber(summary, details) {
  const breakdown = summary?.chainBreakdown || {};
  const mantleKey = Object.keys(breakdown).find((key) => key.toLowerCase() === MANTLE_CHAIN);
  const mantleBreakdown = mantleKey ? breakdown[mantleKey] : null;

  if (typeof mantleBreakdown?.total24h === 'number') return mantleBreakdown.total24h;
  if (typeof mantleBreakdown === 'number') return mantleBreakdown;

  const chains = Array.isArray(details?.chains) ? details.chains.map((chain) => String(chain).toLowerCase()) : [];
  const isOnlyMantle = chains.length === 1 && chains[0] === MANTLE_CHAIN;
  if (isOnlyMantle && typeof summary?.total24h === 'number') return summary.total24h;

  return 0;
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchProtocolRow(row, slug, baseline = {}) {
  const targetSlug = normalizeName(slug);
  const targetName = normalizeName(baseline.name);
  const candidates = [
    row?.slug,
    row?.module,
    row?.name,
    row?.displayName,
    row?.defillamaId,
  ].map(normalizeName);

  return candidates.some((candidate) => candidate && (candidate === targetSlug || candidate === targetName));
}

async function fetchMantleOverviewFee(slug, baseline = {}) {
  for (const dataType of ['dailyFees', 'dailyRevenue']) {
    try {
      const overview = await fetchJson(
        `https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=${dataType}`,
        10000
      );
      const row = Array.isArray(overview?.protocols)
        ? overview.protocols.find((protocol) => matchProtocolRow(protocol, slug, baseline))
        : null;
      if (typeof row?.total24h === 'number' && row.total24h > 0) return row.total24h;
    } catch {
      // Try the next aggregate type.
    }
  }
  return 0;
}

export async function fetchProtocolMantleData(slug, baseline = {}) {
  if (!slug) {
    return {
      tvl: '-',
      mantleTvl: '-',
      fees24h: '-',
      dataSource: 'Baseline',
      isStale: true,
      isFallback: true,
      fetchedAt: Date.now(),
    };
  }

  const key = `protocol:${slug}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const details = await fetchJson(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, 18000);
    const mantleTvlNum = getMantleTvlNumber(details);
    const globalTvlNum = getGlobalTvlNumber(details);

    let feeNum = 0;
    // Build the list of slugs to try for fee lookups:
    // Use aliased child slugs first (if mapped), then the primary slug.
    const feeSlugs = SLUG_FEE_ALIASES[slug]
      ? [...SLUG_FEE_ALIASES[slug], slug]
      : [slug];

    outer: for (const feeSlug of feeSlugs) {
      for (const dataType of ['dailyFees', 'dailyRevenue']) {
        try {
          const summary = await fetchJson(
            `https://api.llama.fi/summary/fees/${encodeURIComponent(feeSlug)}?dataType=${dataType}`,
            10000
          );
          feeNum = extractMantleFeeNumber(summary, details);
          if (feeNum > 0) break outer;
        } catch {
          // Keep trying the next DeFiLlama summary type or slug.
        }
      }
    }
    // Last resort: scan the Mantle-chain fee overview
    if (feeNum <= 0) {
      feeNum = await fetchMantleOverviewFee(slug, baseline);
    }

    return setCached(key, {
      tvl: pickMetric(formatUsd(globalTvlNum)),
      mantleTvl: pickMetric(formatUsd(mantleTvlNum)),
      fees24h: pickMetric(formatUsd(feeNum)),
      logoUrl: details.logo || `https://icons.llamao.fi/icons/protocols/${slug}.png`,
      dataSource: 'DeFiLlama',
      isStale: false,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.warn(`[DeFiData] Protocol fetch failed for ${slug}:`, error.message);
    const stale = getCached(key, { allowStale: true });
    if (stale) return { ...stale, isStale: true, dataSource: `${stale.dataSource} cache` };
    return {
      tvl: '-',
      mantleTvl: '-',
      fees24h: '-',
      dataSource: 'Baseline',
      isStale: true,
      isFallback: true,
      fetchedAt: Date.now(),
    };
  }
}

async function fetchMantleDappFees() {
  for (const dataType of ['dailyFees', 'dailyRevenue']) {
    try {
      const overview = await fetchJson(
        `https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=${dataType}`,
        7000
      );
      if (typeof overview?.total24h === 'number' && overview.total24h > 0) return overview.total24h;
      if (Array.isArray(overview?.protocols)) {
        const sum = overview.protocols.reduce(
          (total, protocol) => total + (typeof protocol.total24h === 'number' ? protocol.total24h : 0),
          0
        );
        if (sum > 0) return sum;
      }
    } catch {
      // Try the next aggregate type.
    }
  }
  return 0;
}

export async function fetchMantleChainStats() {
  const key = 'chain:mantle';
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const [historical, allChains, dappFees24h] = await Promise.all([
      fetchJson('https://api.llama.fi/v2/historicalChainTvl/Mantle', 7000).catch(() => []),
      fetchJson('https://api.llama.fi/v2/chains', 7000).catch(() => []),
      fetchMantleDappFees(),
    ]);

    const history = Array.isArray(historical) ? historical : [];
    const latest = history.at(-1);
    const previous = history.at(-2);
    const chainTvlNum = typeof latest?.tvl === 'number' ? latest.tvl : 0;
    const prevTvlNum = typeof previous?.tvl === 'number' ? previous.tvl : chainTvlNum;
    const changePct = prevTvlNum ? ((chainTvlNum - prevTvlNum) / prevTvlNum) * 100 : 0;

    const mantleChain = Array.isArray(allChains)
      ? allChains.find((chain) => String(chain?.name || '').toLowerCase() === MANTLE_CHAIN)
      : null;
    const currentTvlNum = typeof mantleChain?.tvl === 'number' ? mantleChain.tvl : chainTvlNum;

    return setCached(key, {
      chainTvl: formatUsd(currentTvlNum || chainTvlNum),
      chainTvlChange: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      ecosystemTvl: formatUsd(currentTvlNum || chainTvlNum),
      ecosystemTvlChange: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      fees24h: dappFees24h > 0 ? formatUsd(dappFees24h) : '-',
      feesLabel: 'Mantle dApp fees',
      dataSource: 'DeFiLlama',
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[DeFiData] Mantle chain stats failed:', error.message);
    const stale = getCached(key, { allowStale: true });
    if (stale) return { ...stale, isStale: true, dataSource: `${stale.dataSource} cache` };
    return {
      chainTvl: '-',
      chainTvlChange: '0.00%',
      ecosystemTvl: '-',
      ecosystemTvlChange: '0.00%',
      fees24h: '-',
      feesLabel: 'Mantle dApp fees',
      dataSource: 'DeFiLlama',
      fetchedAt: Date.now(),
    };
  }
}

export function setDataCacheHeaders(res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
}
