import useSWR from 'swr';
import type { Project } from '../../../lib/mantleProjects';

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
  return res.json();
};

export function useProtocolData(project: Project) {
  // Build the query string — pass baseline values so the API can fall back to them
  const params = new URLSearchParams({
    slug:     project.defillamaSlug || '',
    address:  project.tokenAddress  || '',
    name:     project.name,
    baseTvl:  project.tvl,
    baseFees: project.fees24h,
  });

  const { data, error, isLoading } = useSWR<ProtocolData>(
    `/api/protocol?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus:    false,
      revalidateOnReconnect: true,
      // Refresh every 5 minutes so fees stay current
      refreshInterval:      5 * 60 * 1000,
      dedupingInterval:     60_000,
      fallbackData: {
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
