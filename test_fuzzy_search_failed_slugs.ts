import fetch from 'node-fetch';

const targets = [
  'funny.money',
  'Galxe',
  'FBTC',
  'Catizen',
  'MetaCene',
  'Pulsar Protocol',
  'Range Protocol',
  'Reax',
  'Cleopatra',
  'Timeswap',
  'Solv Protocol',
  'Stryke',
  'Velocimeter',
  'Demex',
  'LiQ',
  'Gamma Strategies',
  'LayerZero',
  'zk.Link',
  'RetroBridge',
  'Mini Bridge',
  'Aurelius Finance',
  'Fluid',
  'Axis Finance',
  'Native',
  'CeDeFiAi',
  'MYSO Finance',
  'Swapsicle',
  'OMOSwap',
  'Router Nitro',
  'Novabits',
  'Oku Trade',
  'Algebra Protocol'
];

async function main() {
  console.log("Fetching protocols list...");
  const res = await fetch("https://api.llama.fi/protocols");
  const protocols = await res.json();
  console.log(`Fetched ${protocols.length} protocols. Searching for matches...`);

  for (const t of targets) {
    const q = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matches = protocols.filter((p: any) => {
      const name = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const slug = p.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      return name.includes(q) || q.includes(name) || slug.includes(q) || q.includes(slug);
    });

    console.log(`\nResults for "${t}":`);
    if (matches.length === 0) {
      console.log("  No matches found in standard protocols list.");
    } else {
      for (const m of matches) {
        console.log(`  - Name: "${m.name}" | Slug: "${m.slug}" | Category: "${m.category}" | Chains: ${m.chains.join(', ')}`);
      }
    }
  }
}

main();
