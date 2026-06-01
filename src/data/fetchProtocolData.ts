import { fetchFromDeFiLlama } from './sources/defillama';
import { fetchFromDune } from './sources/dune';
import { fetchFromTheGraph } from './sources/thegraph';
import { fetchFromNansen } from './sources/nansen';
import { fetchFromMobula } from './sources/mobula';
import { fetchFromMessari } from './sources/messari';
import type { Project } from '../lib/mantleProjects';

interface ProtocolResult {
  tvl: string;
  fees24h: string;
  dataSource: 'DeFiLlama' | 'Dune' | 'TheGraph' | 'Nansen' | 'Mobula' | 'Messari' | 'Baseline';
  isStale: boolean;
  fetchedAt: number;
  isAudited?: boolean;
  smartMoneyFlow?: string;
}

// Bounded 3-second promise timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs = 3000, name = 'Source'): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout exceeded for ${name}`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export async function fetchProtocolData(project: Project): Promise<ProtocolResult> {
  const sources = [
    {
      name: 'DeFiLlama' as const,
      fn: () => project.defillamaSlug ? fetchFromDeFiLlama(project.defillamaSlug) : Promise.reject('No slug'),
    },
    {
      name: 'Dune' as const,
      fn: () => project.duneQueryId ? fetchFromDune(project.duneQueryId) : Promise.reject('No queryId'),
    },
    {
      name: 'TheGraph' as const,
      fn: () => project.graphSubgraph ? fetchFromTheGraph(project.graphSubgraph, project.name) : Promise.reject('No subgraph'),
    },
    {
      name: 'Nansen' as const,
      fn: () => project.tokenAddress ? fetchFromNansen(project.tokenAddress) : Promise.reject('No address'),
    },
    {
      name: 'Mobula' as const,
      fn: () => project.tokenAddress ? fetchFromMobula(project.tokenAddress) : Promise.reject('No address'),
    },
    {
      name: 'Messari' as const,
      fn: () => project.messariSlug ? fetchFromMessari(project.messariSlug) : Promise.reject('No slug'),
    },
  ];

  // Waterfall try-catch iteration
  for (const src of sources) {
    try {
      console.log(`[Waterfall] Querying data source: ${src.name} for ${project.name}`);
      const data = await withTimeout(src.fn(), 3000, src.name);
      
      console.log(`[Waterfall] Successful fetch: ${src.name} served data for ${project.name}`);
      return {
        tvl: data.tvl || project.tvl,
        fees24h: data.fees24h || project.fees24h,
        dataSource: src.name,
        isStale: false,
        fetchedAt: Date.now(),
        ...(data as any),
      };
    } catch (err: any) {
      console.warn(`[Waterfall] Failed to fetch from ${src.name}: ${err.message}`);
    }
  }

  // Fallback to registry baseline if all queries fail
  console.log(`[Waterfall] All data sources failed for ${project.name}. Serving baseline.`);
  return {
    tvl: project.tvl,
    fees24h: project.fees24h,
    dataSource: 'Baseline',
    isStale: true,
    fetchedAt: Date.now(),
  };
}
