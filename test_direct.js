import { fetchProtocolMantleData } from './api/_defiData.js';

async function main() {
  const data = await fetchProtocolMantleData('init-capital', {
    name: 'INIT Capital',
    baseTvl: '$124.5M',
    baseFees: '$12,400'
  });
  console.log("Direct result for init-capital:", data);
}

main();
