// api/chain-stats.js - Vercel Serverless Function
// Fetches Mantle DeFi TVL and dApp-only 24h fees from DeFiLlama.

import { fetchMantleChainStats, setDataCacheHeaders } from './_defiData.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  setDataCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = await fetchMantleChainStats();
  return res.status(200).json(data);
}
