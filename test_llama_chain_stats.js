import fetch from 'node-fetch'; // or use global fetch if node version supports it

async function test() {
  try {
    const historical = await fetch('https://api.llama.fi/v2/historicalChainTvl/Mantle').then(r => r.json());
    console.log("Historical TVL length:", historical ? historical.length : "null");
    if (historical && historical.length > 0) {
      console.log("Latest historical entry:", historical[historical.length - 1]);
      console.log("Previous historical entry:", historical[historical.length - 2]);
    }

    const allChains = await fetch('https://api.llama.fi/v2/chains').then(r => r.json());
    const mantleChain = allChains.find(c => String(c?.name || '').toLowerCase() === 'mantle');
    console.log("Mantle chain data from v2/chains:", mantleChain);

    const feesMantle = await fetch('https://api.llama.fi/overview/fees/Mantle?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees').then(r => r.json()).catch(err => ({ error: err.message }));
    console.log("Fees Mantle keys:", feesMantle ? Object.keys(feesMantle) : "null");
    console.log("Fees Mantle total24h:", feesMantle ? feesMantle.total24h : "null");
    if (feesMantle && feesMantle.protocols) {
      console.log("Fees Mantle protocol count:", feesMantle.protocols.length);
      console.log("Sample protocol fee:", feesMantle.protocols.slice(0, 3));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
