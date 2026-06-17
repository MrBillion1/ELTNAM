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
  fetchedAt: number;
}

// SWR fetcher that targets Vite proxy route
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch protocol data');
  const data = await res.json();
  writeCachedData<ProtocolData>(url, data);
  return data;
};

export function useProtocolData(project: Project) {
  // Build the query string — pass baseline values so the API can fall back to them
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
        tvl:        project.tvl,
        mantleTvl:  project.tvl,
        fees24h:    project.fees24h,
        dataSource: 'Baseline',
        isStale:    true,
        fetchedAt:  Date.now(),
      },
    }
  );

  return {
    data: data || {
      tvl:        project.tvl,
      mantleTvl:  project.tvl,
      fees24h:    project.fees24h,
      dataSource: 'Baseline',
      isStale:    true,
      fetchedAt:  Date.now(),
    },
    error,
    isLoading,
  };
}
