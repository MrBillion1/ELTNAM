async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

async function main() {
  const url = `https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees`;
  console.log(`Fetching from: ${url}`);
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data.protocols)) {
      console.log(`Total protocols in Mantle overview:`, data.protocols.length);
      for (const p of data.protocols) {
        console.log(`Slug: "${p.slug}" | Name: "${p.name}" | Total24h:`, p.total24h);
      }
    } else {
      console.log(`No protocols array found. Response keys:`, Object.keys(data));
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  }
}

main();
