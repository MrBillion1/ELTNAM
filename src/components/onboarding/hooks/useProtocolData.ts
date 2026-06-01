import useSWR from 'swr';
import type { Project } from '../../../lib/mantleProjects';

export interface ProtocolData {
  tvl: string;
  fees24h: string;
  dataSource: 'DeFiLlama' | 'Dune' | 'TheGraph' | 'Nansen' | 'Mobula' | 'Messari' | 'Baseline';
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
  const { data, error, isLoading } = useSWR<ProtocolData>(
    project.defillamaSlug ? `/api/protocol?slug=${project.defillamaSlug}&address=${project.tokenAddress || ''}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60s revalidation cache
      fallbackData: {
        tvl: project.tvl,
        fees24h: project.fees24h,
        dataSource: 'Baseline',
        isStale: true,
        fetchedAt: Date.now(),
      },
    }
  );

  return {
    data: data || {
      tvl: project.tvl,
      fees24h: project.fees24h,
      dataSource: 'Baseline' as const,
      isStale: true,
      fetchedAt: Date.now(),
    },
    error,
    isLoading,
  };
}
