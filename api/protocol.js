// api/protocol.js - Vercel Serverless Function

async function fetchLlamaData(slug) {
  if (!slug) return null;
  try {
    const [tvlRes, feesRes] = await Promise.allSettled([
      fetch(`https://api.llama.fi/tvl/${slug}`),
      fetch(`https://api.llama.fi/summary/fees/${slug}?dataType=dailyFees`),
    ]);

    const tvlText = tvlRes.status === 'fulfilled' && tvlRes.value.ok
      ? await tvlRes.value.text()
      : null;
    const tvl = tvlText
      ? `$${parseFloat(tvlText).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;

    let fees24h = 'N/A';
    if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
      const fj = await feesRes.value.json().catch(() => null);
      if (fj?.total24h) fees24h = `$${parseFloat(fj.total24h).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    return tvl ? { tvl, fees24h, dataSource: 'DeFiLlama', isStale: false, fetchedAt: Date.now() } : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS configuration (allow Vite dev or custom domain if needed)
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

  const { slug } = req.query;
  const data = await fetchLlamaData(slug || '');

  if (data) {
    return res.status(200).json(data);
  } else {
    return res.status(200).json({
      tvl: 'N/A',
      fees24h: 'N/A',
      dataSource: 'Baseline',
      isStale: true,
      fetchedAt: Date.now()
    });
  }
}
