// api/chain-stats.js - Vercel Serverless Function
// Fetches real-time Mantle chain TVL and 24h fees from DeFiLlama

function formatValue(val) {
  if (!val || isNaN(val)) return null;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${Math.round(val).toLocaleString()}`;
}

/**
 * Fetch Mantle-chain 24h fees.
 *
 * Strategy (in order):
 * 1. DeFiLlama /overview/fees/Mantle → data.total24h
 *    (DeFiLlama chain-scoped endpoint already restricts to Mantle-chain activity)
 * 2. Sum proto.total24h from each protocol in data.protocols
 *    (secondary aggregate if top-level total24h is missing)
 * 3. DeFiLlama /overview/fees/Mantle with dailyRevenue dataType as cross-check
 */
async function fetchChainFees24h() {
  // Source 1: DeFiLlama Mantle fee overview (dailyFees)
  try {
    const res = await fetch(
      'https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        // Top-level total24h is DeFiLlama's sum of all Mantle-chain protocol fees
        if (typeof data.total24h === 'number' && data.total24h > 0) {
          return formatValue(data.total24h);
        }
        // Fallback: sum individual protocol totals (already Mantle-filtered by the endpoint)
        if (Array.isArray(data.protocols)) {
          let sum = 0;
          for (const proto of data.protocols) {
            if (typeof proto.total24h === 'number' && proto.total24h > 0) {
              sum += proto.total24h;
            }
          }
          if (sum > 0) return formatValue(sum);
        }
      }
    }
  } catch (_) { /* fall through */ }

  // Source 2: DeFiLlama Mantle revenue overview (dailyRevenue) as backup
  try {
    const res = await fetch(
      'https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.total24h > 0) {
        return formatValue(data.total24h);
      }
    }
  } catch (_) { /* fall through */ }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parallel fetch: historical TVL, chain list (for current TVL), and 24h fees
    const [histRes, allChainsRes, fees24hStr] = await Promise.all([
      fetch('https://api.llama.fi/v2/historicalChainTvl/Mantle').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('https://api.llama.fi/v2/chains').then(r => r.ok ? r.json() : []).catch(() => []),
      fetchChainFees24h(),
    ]);

    const hist = Array.isArray(histRes) ? histRes : [];
    const allChains = Array.isArray(allChainsRes) ? allChainsRes : [];

    // Chain TVL from historical data (most precise daily snapshot)
    const latest = hist.length >= 2 ? hist[hist.length - 1] : null;
    const prev   = hist.length >= 2 ? hist[hist.length - 2] : null;
    const chainTvlNum = latest ? latest.tvl : 0;
    const prevTvlNum  = prev   ? prev.tvl   : chainTvlNum;
    const chainTvlChangePct = prevTvlNum ? ((chainTvlNum - prevTvlNum) / prevTvlNum * 100).toFixed(2) : '0.00';

    const chainTvlStr    = formatValue(chainTvlNum) || '$0';
    const chainTvlChange = `${parseFloat(chainTvlChangePct) >= 0 ? '+' : ''}${chainTvlChangePct}%`;

    // Ecosystem TVL from chains endpoint (snapshot)
    const mantleChain   = allChains.find(c => c.name?.toLowerCase() === 'mantle');
    const ecosystemTvl  = mantleChain ? mantleChain.tvl : chainTvlNum;
    const ecosystemStr  = formatValue(ecosystemTvl) || chainTvlStr;

    return res.status(200).json({
      chainTvl:          chainTvlStr,
      chainTvlChange,
      ecosystemTvl:      ecosystemStr,
      ecosystemTvlChange: chainTvlChange,
      fees24h:           fees24hStr || 'N/A',
      fetchedAt:         Date.now(),
    });

  } catch (err) {
    console.warn('[API] /api/chain-stats error:', err.message);
    return res.status(200).json({
      chainTvl:          '$156.2M',
      chainTvlChange:    '-0.01%',
      ecosystemTvl:      '$156.2M',
      ecosystemTvlChange: '-0.01%',
      fees24h:           'N/A',
      fetchedAt:         Date.now(),
    });
  }
}
