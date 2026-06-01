import axios from 'axios';

export async function fetchFromDeFiLlama(slug: string) {
  try {
    const tvlRes = await axios.get(`https://api.llama.fi/tvl/${slug}`);
    const feesRes = await axios.get(`https://api.llama.fi/summary/fees/${slug}?dataType=dailyFees`).catch(() => null);

    const tvl = tvlRes.status === 200 ? `$${parseFloat(tvlRes.data).toLocaleString()}` : null;
    const fees24h = feesRes && feesRes.status === 200 && feesRes.data?.total24h
      ? `$${parseFloat(feesRes.data.total24h).toLocaleString()}`
      : 'N/A';

    if (!tvl) throw new Error('Invalid TVL response from DeFiLlama');

    return {
      tvl,
      fees24h,
    };
  } catch (err: any) {
    throw new Error(`DeFiLlama failed: ${err.message}`);
  }
}
