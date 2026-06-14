// api/protocol.js - Vercel Serverless Function
// Fetches real-time TVL and 24h fees for a protocol from DeFiLlama

/**
 * DeFiLlama /summary/fees/{slug} response shape:
 * {
 *   total24h: number,          // most reliable for daily fees
 *   totalAllTime: number,
 *   change_1d: number,
 *   totalDataChart: [[timestamp, value], ...],
 *   ...
 * }
 * Some protocols have the fee data nested under `protocols[0].total24h`
 */
async function fetchFeesFromLlama(slug) {
  // Try the summary/fees endpoint first
  try {
    const res = await fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=dailyFees`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const fj = await res.json().catch(() => null);
      if (fj) {
        // Primary: top-level total24h
        if (typeof fj.total24h === 'number' && fj.total24h > 0) {
          return `$${parseFloat(fj.total24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        }
        // Secondary: protocols[0].total24h (some protocols nest it)
        if (Array.isArray(fj.protocols) && fj.protocols[0]?.total24h > 0) {
          return `$${parseFloat(fj.protocols[0].total24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        }
        // Tertiary: last entry in totalDataChart
        if (Array.isArray(fj.totalDataChart) && fj.totalDataChart.length > 0) {
          const lastEntry = fj.totalDataChart[fj.totalDataChart.length - 1];
          const val = Array.isArray(lastEntry) ? lastEntry[1] : lastEntry;
          if (typeof val === 'number' && val > 0) {
            return `$${parseFloat(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          }
        }
      }
    }
  } catch (_) { /* fall through */ }

  // Fallback: try revenue endpoint with dailyRevenue
  try {
    const res = await fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=dailyRevenue`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const fj = await res.json().catch(() => null);
      if (fj?.total24h > 0) {
        return `$${parseFloat(fj.total24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      }
    }
  } catch (_) { /* fall through */ }

  return null;
}

async function fetchTvlFromLlama(slug) {
  try {
    const res = await fetch(`https://api.llama.fi/tvl/${slug}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const tvlText = await res.text();
      const tvlNum = parseFloat(tvlText);
      if (!isNaN(tvlNum) && tvlNum > 0) {
        return `$${tvlNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      }
    }
  } catch (_) { /* fall through */ }
  return null;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug, baseTvl, baseFees } = req.query;

  if (!slug) {
    // No slug provided — return baseline values directly
    return res.status(200).json({
      tvl: baseTvl || 'N/A',
      fees24h: baseFees || 'N/A',
      dataSource: 'Baseline',
      isStale: true,
      fetchedAt: Date.now(),
    });
  }

  // Run both fetches in parallel with a 5-second timeout guard
  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  const [tvlResult, feesResult] = await Promise.allSettled([
    Promise.race([fetchTvlFromLlama(slug), timeout(5000)]),
    Promise.race([fetchFeesFromLlama(slug), timeout(5000)]),
  ]);

  const tvl = tvlResult.status === 'fulfilled' ? tvlResult.value : null;
  const fees24h = feesResult.status === 'fulfilled' ? feesResult.value : null;

  // If we got at least TVL, return live data; otherwise return baseline
  if (tvl || fees24h) {
    return res.status(200).json({
      tvl: tvl || baseTvl || 'N/A',
      fees24h: fees24h || baseFees || 'N/A',
      dataSource: 'DeFiLlama',
      isStale: false,
      fetchedAt: Date.now(),
    });
  }

  // All failed — return baseline
  return res.status(200).json({
    tvl: baseTvl || 'N/A',
    fees24h: baseFees || 'N/A',
    dataSource: 'Baseline',
    isStale: true,
    fetchedAt: Date.now(),
  });
}
