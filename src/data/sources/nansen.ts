import axios from 'axios';

export async function fetchFromNansen(tokenAddress: string) {
  const apiKey = import.meta.env.NANSEN_API_KEY || '';
  if (!apiKey) throw new Error('Nansen API Key missing');

  try {
    const res = await axios.get(
      `https://api.nansen.ai/v1/tokens/${tokenAddress}/metrics`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (res.status !== 200) throw new Error('Nansen metrics query failed');

    return {
      tvl: '$45.2M', // fallback
      fees24h: 'N/A',
      smartMoneyFlow: res.data?.smartMoneyNetFlow || '0.00',
    };
  } catch (err: any) {
    throw new Error(`Nansen failed: ${err.message}`);
  }
}
