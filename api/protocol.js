// api/protocol.js - Vercel Serverless Function
// Returns protocol TVL and 24h fees scoped to Mantle where aggregator data exists.

import { fetchProtocolMantleData, setDataCacheHeaders } from './_defiData.js';

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

  const { slug, baseTvl, baseFees } = req.query;
  const data = await fetchProtocolMantleData(String(slug || ''), {
    baseTvl: String(baseTvl || ''),
    baseFees: String(baseFees || ''),
  });

  return res.status(200).json(data);
}
