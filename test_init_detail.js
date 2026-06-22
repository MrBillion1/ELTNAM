async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const details = await fetchJson(`https://api.llama.fi/protocol/init-capital`, 10000);
  console.log(`Chains:`, details.chains);
  console.log(`CurrentChainTvls:`, details.currentChainTvls);
  
  if (Array.isArray(details.tvl)) {
    console.log(`Total tvl history length:`, details.tvl.length);
    console.log(`Last 5 tvl entries:`, details.tvl.slice(-5));
  }
  
  if (details.chainTvls) {
    console.log(`ChainTvls keys:`, Object.keys(details.chainTvls));
    for (const key of Object.keys(details.chainTvls)) {
      if (details.chainTvls[key]?.tvl) {
        console.log(`ChainTvls[${key}] last 3 entries:`, details.chainTvls[key].tvl.slice(-3));
      }
    }
  }
}

main();
