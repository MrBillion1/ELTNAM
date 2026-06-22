async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

async function main() {
  const PORT = 3001; // API Port
  const projects = [
    { slug: 'init-capital', name: 'INIT Capital', baseTvl: '$124.5M', baseFees: '$12,400' },
    { slug: 'merchant-moe', name: 'Merchant Moe', baseTvl: '$98.2M', baseFees: '$45,200' },
    { slug: 'vertex-perps', name: 'Vertex Protocol', baseTvl: '$45.1M', baseFees: '$0' },
    { slug: 'meth-protocol', name: 'mETH Protocol', baseTvl: '$1.42B', baseFees: '$12,400' }
  ];

  for (const p of projects) {
    const params = new URLSearchParams({
      slug: p.slug,
      name: p.name,
      baseTvl: p.baseTvl,
      baseFees: p.baseFees
    });
    const url = `http://localhost:${PORT}/api/protocol?${params.toString()}`;
    console.log(`\nQuerying API: ${url}`);
    try {
      const data = await fetchJson(url);
      console.log(`Response:`, data);
    } catch (err) {
      console.error(`Error querying API:`, err.message);
    }
  }
}

main();
