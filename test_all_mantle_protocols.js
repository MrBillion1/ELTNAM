import fetch from 'node-fetch';

async function main() {
  try {
    console.log("Fetching all protocols from DeFiLlama...");
    const protocols = await fetch('https://api.llama.fi/protocols').then(r => r.json());
    console.log(`Total protocols in DeFiLlama: ${protocols.length}`);

    // Filter protocols that are on Mantle
    const mantleProtocols = protocols.filter(p => {
      const chains = p.chains || [];
      return chains.some(c => c.toLowerCase() === 'mantle');
    });

    console.log(`Found ${mantleProtocols.length} protocols on Mantle.`);

    let totalMantleTvl = 0;
    let printed = 0;

    for (const p of mantleProtocols) {
      const mantleTvl = p.chainTvls ? (p.chainTvls.Mantle || p.chainTvls.mantle || 0) : 0;
      totalMantleTvl += mantleTvl;
      if (mantleTvl > 1000000 && printed < 20) {
        console.log(`- ${p.name} (slug: ${p.slug}): Mantle TVL = $${mantleTvl.toLocaleString()} | Global TVL = $${(p.tvl || 0).toLocaleString()}`);
        printed++;
      }
    }

    console.log(`\nCalculated Sum of Mantle-scoped TVLs of all protocols: $${totalMantleTvl.toLocaleString()}`);

  } catch (err) {
    console.error(err);
  }
}

main();
