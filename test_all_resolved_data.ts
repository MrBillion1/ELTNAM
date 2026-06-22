import { MANTLE_PROJECTS } from './src/lib/mantleProjects';
import { fetchProtocolMantleData } from './api/_defiData.js';

async function main() {
  console.log("Resolving TVL and fees for all projects...");
  const results = [];

  for (let i = 0; i < MANTLE_PROJECTS.length; i++) {
    const p = MANTLE_PROJECTS[i];
    // Resolve using the API logic
    const data = await fetchProtocolMantleData(p.defillamaSlug || '', {
      name: p.name,
      baseTvl: p.tvl,
      baseFees: p.fees24h
    });

    results.push({
      id: p.id,
      name: p.name,
      slug: p.defillamaSlug || '(none)',
      resolvedTvl: data.tvl,
      resolvedMantleTvl: data.mantleTvl,
      resolvedFees: data.fees24h,
      dataSource: data.dataSource
    });

    // Polite delay
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  // Print summary sorted by TVL or Name
  console.log("\nResolved Data Summary (top 50 by resolved Mantle/Global TVL or first 50):");
  const sorted = results.sort((a, b) => {
    // simple sort: protocols with valid numerical TVL first
    const cleanTvl = (val: string) => {
      if (val === '-') return 0;
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      if (val.includes('B')) return num * 1e9;
      if (val.includes('M')) return num * 1e6;
      if (val.includes('K')) return num * 1e3;
      return num;
    };
    return cleanTvl(b.resolvedMantleTvl !== '-' ? b.resolvedMantleTvl : b.resolvedTvl) - 
           cleanTvl(a.resolvedMantleTvl !== '-' ? a.resolvedMantleTvl : a.resolvedTvl);
  });

  for (const r of sorted) {
    console.log(`- ${r.name} (ID: ${r.id}, Slug: ${r.slug}): Mantle TVL: ${r.resolvedMantleTvl} | Global TVL: ${r.resolvedTvl} | Fees: ${r.resolvedFees} | Source: ${r.dataSource}`);
  }
}

main();
