import axios from 'axios';

export async function fetchFromMobula(tokenAddress: string) {
  const apiKey = import.meta.env.MOBULA_API_KEY || '';
  if (!apiKey) throw new Error('Mobula API Key missing');

  try {
    const res = await axios.get(
      `https://api.mobula.io/api/1/market/data?asset=${tokenAddress}`,
      { headers: { 'Authorization': apiKey } }
    );

    const data = res.data?.data;
    if (!data) throw new Error('Invalid market data response from Mobula');

    return {
      tvl: `$${parseFloat(data.liquidity || '0').toLocaleString()}`,
      fees24h: `$${parseFloat(data.volume || '0').toLocaleString()}`,
    };
  } catch (err: any) {
    throw new Error(`Mobula failed: ${err.message}`);
  }
}
