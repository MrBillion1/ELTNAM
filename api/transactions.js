// api/transactions.js - real Mantle Explorer activity for protocol panels

import { fetchMantleActivity, setActivityCacheHeaders } from './_activityData.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  setActivityCacheHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = await fetchMantleActivity({
    address: String(req.query.address || ''),
    category: String(req.query.category || ''),
    projectName: String(req.query.project || 'this protocol'),
  });

  return res.status(200).json(data.items);
}
