// api/protocol.js - Vercel Serverless Function
// Fetches real-time TVL and 24h fees for a protocol from DeFiLlama scoped to Mantle

function isValuable(val) {
  return val && val !== 'N/A' && val !== '$0' && val !== '$0.00' && val !== '—';
}

async function fetchLlamaData(slug) {
  if (!slug) return null;
  try {
    // 1. Fetch main protocol details (which includes logo and chain breakdown)
    const detailRes = await fetch(`https://api.llama.fi/protocol/${slug}`);
    if (!detailRes.ok) throw new Error(`DeFiLlama details API failed for ${slug}`);
    const details = await detailRes.json();

    // 2. Parse TVL and Mantle TVL
    let tvlVal = 0;
    let hasMantleTvl = false;
    if (details.currentChainTvls) {
      const mantleKey = Object.keys(details.currentChainTvls).find(k => k.toLowerCase() === 'mantle');
      if (mantleKey) {
        tvlVal = details.currentChainTvls[mantleKey];
        hasMantleTvl = true;
      }
    }

    if (!hasMantleTvl) {
      // Fallback to global TVL if Mantle is not in currentChainTvls but the protocol is Mantle-native or mETH
      const isMantleNative = !details.chains || details.chains.length <= 1 || details.chains.map(c => c.toLowerCase()).includes('mantle') || slug === 'meth-protocol';
      if (isMantleNative) {
        if (details.currentChainTvls) {
          tvlVal = Object.values(details.currentChainTvls).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
        }
        if (!tvlVal && Array.isArray(details.tvl) && details.tvl.length > 0) {
          tvlVal = details.tvl[details.tvl.length - 1].totalLiquidityUSD || 0;
        }
      }
    }

    const mantleTvl = tvlVal > 0 ? `$${tvlVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A';

    // Global TVL
    let totalTvlVal = 0;
    if (details.currentChainTvls) {
      totalTvlVal = Object.values(details.currentChainTvls).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    }
    if (!totalTvlVal && Array.isArray(details.tvl) && details.tvl.length > 0) {
      totalTvlVal = details.tvl[details.tvl.length - 1].totalLiquidityUSD || 0;
    }
    const totalTvl = totalTvlVal > 0 ? `$${totalTvlVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A';

    // 3. Fetch daily fees separately
    let fees24h = 'N/A';
    for (const dataType of ['dailyFees', 'dailyRevenue']) {
      try {
        const feesRes = await fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=${dataType}`);
        if (feesRes.ok) {
          const fj = await feesRes.json().catch(() => null);
          if (fj) {
            let feeNum = null;
            if (fj.chainBreakdown) {
              const mantleKey = Object.keys(fj.chainBreakdown).find(k => k.toLowerCase() === 'mantle');
              if (mantleKey) {
                feeNum = fj.chainBreakdown[mantleKey].total24h;
              }
            }

            if (feeNum === null || feeNum === undefined) {
              // Fallback to global fee only if Mantle-native or mETH
              const isMantleNative = !details.chains || details.chains.length <= 1 || details.chains.map(c => c.toLowerCase()).includes('mantle') || slug === 'meth-protocol';
              if (isMantleNative) {
                if (typeof fj.total24h === 'number') feeNum = fj.total24h;
                else if (Array.isArray(fj.protocols) && fj.protocols[0]?.total24h > 0) feeNum = fj.protocols[0].total24h;
                else if (Array.isArray(fj.totalDataChart) && fj.totalDataChart.length > 0) {
                  const lastEntry = fj.totalDataChart[fj.totalDataChart.length - 1];
                  feeNum = Array.isArray(lastEntry) ? lastEntry[1] : lastEntry;
                }
              }
            }

            if (feeNum !== null && feeNum !== undefined && feeNum >= 0) {
              fees24h = `$${parseFloat(feeNum).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`[API] DeFiLlama fees failed for ${slug} (${dataType}):`, e.message);
      }
    }

    // Resolve Logo — prefer protocol details, fall back to DeFiLlama icons CDN
    const logoUrl = details.logo || `https://icons.llamao.fi/icons/protocols/${slug}.png`;

    return {
      tvl: totalTvl,
      mantleTvl,
      fees24h,
      logoUrl,
      dataSource: 'DeFiLlama',
      isStale: false,
      fetchedAt: Date.now()
    };
  } catch (err) {
    console.warn(`[API] DeFiLlama fetch error for ${slug}:`, err.message);
    return null;
  }
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
    return res.status(200).json({
      tvl: baseTvl || 'N/A',
      mantleTvl: baseTvl || 'N/A',
      fees24h: baseFees || 'N/A',
      dataSource: 'Baseline',
      isStale: true,
      fetchedAt: Date.now(),
    });
  }

  // 15-second promise timeout guard
  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  try {
    const llamaData = await Promise.race([fetchLlamaData(slug), timeout(12000)]);
    if (llamaData) {
      // Top up missing stats with baseline values
      if (!isValuable(llamaData.tvl)) llamaData.tvl = baseTvl || 'N/A';
      if (!isValuable(llamaData.mantleTvl)) llamaData.mantleTvl = baseTvl || 'N/A';
      if (!isValuable(llamaData.fees24h)) llamaData.fees24h = baseFees || 'N/A';

      return res.status(200).json({
        ...llamaData,
        dataSource: 'DeFiLlama',
      });
    }
  } catch (err) {
    console.warn(`[API] DeFiLlama serverless handler error for ${slug}:`, err.message);
  }

  // Fallback to baseline
  return res.status(200).json({
    tvl: baseTvl || 'N/A',
    mantleTvl: baseTvl || 'N/A',
    fees24h: baseFees || 'N/A',
    dataSource: 'Baseline',
    isStale: true,
    fetchedAt: Date.now(),
  });
}
