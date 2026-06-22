import useSWR from 'swr';
import type { Project } from '../../../lib/mantleProjects';
import { readCachedData, writeCachedData } from '../../../lib/dataCache';

export interface ProtocolData {
  tvl: string;
  mantleTvl?: string;
  fees24h: string;
  logoUrl?: string;
  dataSource: string;
  isStale: boolean;
  isFallback?: boolean;
  fetchedAt: number;
}

const isUsefulMetric = (value?: string): value is string =>
  Boolean(value && value !== 'N/A' && value !== '$0' && value !== '$0.00' && value !== '-' && value !== '\u2014' && value !== '\u2013');

const displayMetric = (value?: string) => (isUsefulMetric(value) ? value : '-');

const hasUsefulMetrics = (data?: ProtocolData | null) =>
  Boolean(data && (isUsefulMetric(data.mantleTvl) || isUsefulMetric(data.tvl) || isUsefulMetric(data.fees24h)));

const mergeProtocolData = (incoming: ProtocolData, cached: ProtocolData | null): ProtocolData => {
  const preserveCached = incoming.isFallback || incoming.dataSource === 'Baseline';
  const source = preserveCached && cached ? cached : incoming;

  return {
    ...incoming,
    tvl: isUsefulMetric(incoming.tvl) ? incoming.tvl : displayMetric(cached?.tvl),
    mantleTvl: isUsefulMetric(incoming.mantleTvl) ? incoming.mantleTvl : displayMetric(cached?.mantleTvl || cached?.tvl),
    fees24h: isUsefulMetric(incoming.fees24h) ? incoming.fees24h : displayMetric(cached?.fees24h),
    logoUrl: incoming.logoUrl || cached?.logoUrl,
    dataSource: source.dataSource,
    isStale: preserveCached ? true : incoming.isStale,
    fetchedAt: incoming.fetchedAt || Date.now(),
  };
};

// SWR fetcher that targets Vite proxy route
const fetcher = async (url: string) => {
  const cached = readCachedData<ProtocolData>(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch protocol data');
  const data = await res.json() as ProtocolData;
  const merged = mergeProtocolData(data, cached);

  if (!data.isFallback && data.dataSource !== 'Baseline' && hasUsefulMetrics(merged)) {
    writeCachedData<ProtocolData>(url, merged);
  }

  return hasUsefulMetrics(merged) ? merged : {
    ...merged,
    tvl: '-',
    mantleTvl: '-',
    fees24h: '-',
  };
};

export function useProtocolData(project: Project) {
  // Build the query string â€” pass baseline values so the API can fall back to them
  // `name` lets the Mantle-overview lookup match by display name when slug differs
  const params = new URLSearchParams({
    slug:     project.defillamaSlug || '',
    address:  project.tokenAddress  || '',
    name:     project.name          || '',
    baseTvl:  project.tvl           || '',
    baseFees: project.fees24h       || '',
  });

  const cacheKey = `/api/protocol?${params.toString()}`;
  const cached = readCachedData<ProtocolData>(cacheKey);

  const { data, error, isLoading } = useSWR<ProtocolData>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus:    false,
      revalidateOnReconnect: true,
      // Refresh every 5 minutes so fees stay current
      refreshInterval:      5 * 60 * 1000,
      dedupingInterval:     60_000,
      fallbackData: cached ?? {
        tvl:        '-',
        mantleTvl:  '-',
        fees24h:    '-',
        dataSource: 'Baseline',
        isStale:    true,
        fetchedAt:  Date.now(),
      },
    }
  );

  return {
    data: data || {
      tvl:        '-',
      mantleTvl:  '-',
      fees24h:    '-',
      dataSource: 'Baseline',
      isStale:    true,
      fetchedAt:  Date.now(),
    },
    error,
    isLoading,
  };
}
