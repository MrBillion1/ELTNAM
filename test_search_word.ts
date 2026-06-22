import fetch from 'node-fetch';

const words = ['range', 'reax', 'fbtc', 'pulsar', 'liq', 'aurelius', 'axis', 'myso', 'omo', 'novabits', 'oku', 'cleopatra'];

async function main() {
  const res = await fetch("https://api.llama.fi/protocols");
  const protocols = await res.json();
  console.log("Loaded protocols");
  
  for (const word of words) {
    console.log(`\n--- Matches for "${word}" ---`);
    const matches = protocols.filter((p: any) => 
      p.name.toLowerCase().includes(word) || 
      p.slug.toLowerCase().includes(word)
    );
    for (const m of matches) {
      console.log(`- Name: "${m.name}" | Slug: "${m.slug}" | Chains: ${m.chains.join(', ')}`);
    }
  }
}

main();
