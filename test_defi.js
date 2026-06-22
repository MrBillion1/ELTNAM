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

async function testProtocol(slug) {
  console.log(`\n========================================`);
  console.log(`Testing protocol: ${slug}`);
  try {
    const details = await fetchJson(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, 10000);
    console.log(`Name:`, details.name);
    console.log(`Chains:`, details.chains);
    console.log(`CurrentChainTvls:`, details.currentChainTvls);
  } catch (err) {
    console.error(`Error fetching protocol details for ${slug}:`, err.message);
  }
}

async function main() {
  await testProtocol('init-capital');
  await testProtocol('merchant-moe');
  await testProtocol('vertex-perps');
  await testProtocol('meth-protocol');
}

main();
