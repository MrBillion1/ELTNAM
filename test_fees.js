async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function testFees(slug) {
  console.log(`\n========================================`);
  console.log(`Testing fees for: ${slug}`);
  for (const dataType of ['dailyFees', 'dailyRevenue']) {
    const url = `https://api.llama.fi/summary/fees/${slug}?dataType=${dataType}`;
    const data = await fetchJson(url);
    if (data.error) {
      console.log(`${dataType} error:`, data.error);
    } else {
      console.log(`${dataType} keys:`, Object.keys(data).filter(k => k !== 'totalDataChart' && k !== 'totalDataChartBreakdown'));
      console.log(`${dataType} total24h:`, data.total24h);
      if (data.chainBreakdown) {
        console.log(`${dataType} chainBreakdown keys:`, Object.keys(data.chainBreakdown));
        console.log(`${dataType} chainBreakdown Mantle:`, data.chainBreakdown.Mantle || data.chainBreakdown.mantle);
      }
    }
  }
}

async function main() {
  await testFees('init-capital');
  await testFees('merchant-moe');
  await testFees('merchant-moe-liquidity-book');
  await testFees('vertex-perps');
  await testFees('meth-protocol');
}

main();
