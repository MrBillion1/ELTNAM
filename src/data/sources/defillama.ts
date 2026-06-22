import axios from 'axios';

export async function fetchFromDeFiLlama(slug: string) {
  try {
    // 1. Fetch detailed protocol data
    const detailRes = await axios.get(`https://api.llama.fi/protocol/${slug}`);
    if (detailRes.status !== 200) throw new Error('Details fail');
    const details = detailRes.data;

    // 2. Parse Mantle TVL
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
      // Fallback to global TVL only for Mantle-native protocols/mETH
      const isMantleNative = !details.chains || details.chains.length <= 1 || details.chains.map((c: string) => c.toLowerCase()).includes('mantle') || slug === 'meth-protocol';
      if (isMantleNative) {
        if (details.currentChainTvls) {
          tvlVal = Object.values(details.currentChainTvls).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
        }
        if (!tvlVal && Array.isArray(details.tvl) && details.tvl.length > 0) {
          tvlVal = details.tvl[details.tvl.length - 1].totalLiquidityUSD || 0;
        }
      }
    }

    const tvl = tvlVal > 0 ? `$${tvlVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : null;

    // 3. Fetch fees
    let fees24h = '-';
    for (const dataType of ['dailyFees', 'dailyRevenue']) {
      try {
        const feesRes = await axios.get(`https://api.llama.fi/summary/fees/${slug}?dataType=${dataType}`);
        if (feesRes.status === 200 && feesRes.data) {
          const fj = feesRes.data;
          let feeNum = null;
          if (fj.chainBreakdown) {
            const mantleKey = Object.keys(fj.chainBreakdown).find(k => k.toLowerCase() === 'mantle');
            if (mantleKey) {
              feeNum = fj.chainBreakdown[mantleKey].total24h;
            }
          }

          if (feeNum === null || feeNum === undefined) {
            // Fallback to global fee only for Mantle-native/mETH
            const isMantleNative = !details.chains || details.chains.length <= 1 || details.chains.map((c: string) => c.toLowerCase()).includes('mantle') || slug === 'meth-protocol';
            if (isMantleNative) {
              if (typeof fj.total24h === 'number') feeNum = fj.total24h;
              else if (Array.isArray(fj.protocols) && fj.protocols[0]?.total24h > 0) feeNum = fj.protocols[0].total24h;
              else if (Array.isArray(fj.totalDataChart) && fj.totalDataChart.length > 0) {
                const lastEntry = fj.totalDataChart[fj.totalDataChart.length - 1];
                feeNum = Array.isArray(lastEntry) ? lastEntry[1] : lastEntry;
              }
            }
          }

          if (feeNum !== null && feeNum !== undefined && feeNum > 0) {
            fees24h = `$${parseFloat(feeNum).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            break;
          }
        }
      } catch (_) {}
    }

    if (!tvl) throw new Error('Invalid TVL response from DeFiLlama');

    return {
      tvl,
      fees24h,
    };
  } catch (err: any) {
    throw new Error(`DeFiLlama failed: ${err.message}`);
  }
}
