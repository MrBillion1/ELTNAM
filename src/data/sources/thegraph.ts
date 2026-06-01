import axios from 'axios';

export async function fetchFromTheGraph(subgraphId: string, protocolName: string) {
  const apiKey = import.meta.env.GRAPH_API_KEY || '';
  if (!apiKey) throw new Error('The Graph API Key missing');

  try {
    const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
    const query = {
      query: `
        query {
          protocols(where: { name_nocase: "${protocolName}" }) {
            totalValueLockedUSD
            cumulativeTotalRevenueUSD
          }
        }
      `,
    };

    const res = await axios.post(url, query);
    const data = res.data?.data?.protocols?.[0];

    if (!data) throw new Error('No protocol data returned from Subgraph');

    return {
      tvl: `$${parseFloat(data.totalValueLockedUSD).toLocaleString()}`,
      fees24h: `$${(parseFloat(data.cumulativeTotalRevenueUSD) * 0.05).toLocaleString()}`, // derived estimate
    };
  } catch (err: any) {
    throw new Error(`The Graph failed: ${err.message}`);
  }
}
