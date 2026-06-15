// api/protocol.js - Vercel Serverless Function
// Fetches real-time TVL and 24h fees for a protocol from DeFiLlama
// Fee resolution order:
//   1. DeFiLlama /overview/fees/Mantle  → find protocol by slug/name (most accurate for Mantle)
//   2. DeFiLlama /summary/fees/{slug}?dataType=dailyFees
//   3. DeFiLlama /summary/fees/{slug}?dataType=dailyRevenue
//   4. Baseline value passed by the caller

function formatFee(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Look up a protocol inside DeFiLlama's Mantle chain overview.
 * This endpoint is already Mantle-scoped, so proto.total24h IS the Mantle fee.
 */
async function fetchFeesFromMantleOverview(slug, name) {
  if (!slug && !name) return null;
  try {
    const res = await fetch(
      'https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees',
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.protocols) return null;

    // Match by slug, id, or normalised name
    const normSlug = (s) => (s || '').toLowerCase().trim();
    const slugNorm = normSlug(slug);
    const nameNorm = normSlug(name);

    const proto = data.protocols.find((p) => {
      if (slugNorm && normSlug(p.slug) === slugNorm) return true;
      if (slugNorm && normSlug(p.id) === slugNorm) return true;
      // DeFiLlama may not return a slug field; derive from name
      const derivedSlug = normSlug(p.name).replace(/\s+/g, '-');
      if (slugNorm && derivedSlug === slugNorm) return true;
      if (nameNorm && normSlug(p.name) === nameNorm) return true;
      return false;
    });

    if (proto?.total24h > 0) return formatFee(proto.total24h);
  } catch (_) { /* fall through */ }
  return null;
}

/**
 * DeFiLlama /summary/fees/{slug} response shape:
 * {
 *   total24h: number,          // most reliable for daily fees
 *   totalAllTime: number,
 *   change_1d: number,
 *   totalDataChart: [[timestamp, value], ...],
 *   protocols: [{ total24h, ... }],
 *   ...
 * }
 */
async function fetchFeesFromLlamaSummary(slug, dataType = 'dailyFees') {
  if (!slug) return null;
  try {
    const res = await fetch(
      `https://api.llama.fi/summary/fees/${encodeURIComponent(slug)}?dataType=${dataType}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const fj = await res.json().catch(() => null);
    if (!fj) return null;

    // Primary: top-level total24h
    if (typeof fj.total24h === 'number' && fj.total24h > 0) {
      return formatFee(fj.total24h);
    }
    // Secondary: nested in protocols[]
    if (Array.isArray(fj.protocols) && fj.protocols[0]?.total24h > 0) {
      return formatFee(fj.protocols[0].total24h);
    }
    // Tertiary: last entry in totalDataChart
    if (Array.isArray(fj.totalDataChart) && fj.totalDataChart.length > 0) {
      const lastEntry = fj.totalDataChart[fj.totalDataChart.length - 1];
      const val = Array.isArray(lastEntry) ? lastEntry[1] : lastEntry;
      if (typeof val === 'number' && val > 0) return formatFee(val);
    }
  } catch (_) { /* fall through */ }
  return null;
}

async function fetchTvlFromLlama(slug) {
  if (!slug) return null;
  try {
    const res = await fetch(`https://api.llama.fi/tvl/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
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

  const { slug, name, baseTvl, baseFees } = req.query;

  if (!slug) {
    // No slug — return baseline values directly
    return res.status(200).json({
      tvl: baseTvl || 'N/A',
      fees24h: baseFees || 'N/A',
      dataSource: 'Baseline',
      isStale: true,
      fetchedAt: Date.now(),
    });
  }

  // 10-second guard on the entire fetch block
  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  const [tvlResult, feesResult] = await Promise.allSettled([
    // TVL: DeFiLlama /tvl/{slug}
    Promise.race([fetchTvlFromLlama(slug), timeout(8000)]),

    // Fees: multi-source cascade with timeout
    Promise.race([
      (async () => {
        // Source A: Mantle overview (highest confidence — Mantle-specific)
        const fromOverview = await fetchFeesFromMantleOverview(slug, name);
        if (fromOverview) return fromOverview;

        // Source B: DeFiLlama /summary/fees/{slug}?dataType=dailyFees
        const fromSummaryFees = await fetchFeesFromLlamaSummary(slug, 'dailyFees');
        if (fromSummaryFees) return fromSummaryFees;

        // Source C: DeFiLlama /summary/fees/{slug}?dataType=dailyRevenue
        const fromSummaryRev = await fetchFeesFromLlamaSummary(slug, 'dailyRevenue');
        if (fromSummaryRev) return fromSummaryRev;

        return null;
      })(),
      timeout(10000),
    ]),
  ]);

  const tvl = tvlResult.status === 'fulfilled' ? tvlResult.value : null;
  const fees24h = feesResult.status === 'fulfilled' ? feesResult.value : null;

  if (tvl || fees24h) {
    return res.status(200).json({
      tvl: tvl || baseTvl || 'N/A',
      fees24h: fees24h || baseFees || 'N/A',
      dataSource: 'DeFiLlama',
      isStale: false,
      fetchedAt: Date.now(),
    });
  }

  // All sources failed — return baseline
  return res.status(200).json({
    tvl: baseTvl || 'N/A',
    fees24h: baseFees || 'N/A',
    dataSource: 'Baseline',
    isStale: true,
    fetchedAt: Date.now(),
  });
}
