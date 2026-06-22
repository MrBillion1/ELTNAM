async function fetchJson(url, timeoutMs = 15000) {
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
  console.log("Fetching protocols list from DeFiLlama...");
  const protocols = await fetchJson("https://api.llama.fi/protocols");
  console.log(`Total protocols fetched: ${protocols.length}`);

  const searchNames = ["init", "merchant", "vertex", "meth", "ondo", "ethena", "agora", "intentx", "stargate", "pendle", "clearpool", "lendle", "woofi", "izumi"];
  
  for (const query of searchNames) {
    console.log(`\n--- Searching for "${query}" ---`);
    const matches = protocols.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.slug.toLowerCase().includes(query)
    );
    for (const m of matches) {
      console.log(`Slug: "${m.slug}" | Name: "${m.name}" | TVL: $${(m.tvl || 0).toLocaleString()} | Chains:`, m.chains);
    }
  }
}

main();
