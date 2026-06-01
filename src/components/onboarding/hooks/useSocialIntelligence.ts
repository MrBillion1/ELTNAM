import useSWR from 'swr';

export interface SocialSignal {
  tweets: Array<{ id: string; text: string; date: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
  discordUpdates: Array<{ id: string; content: string; date: string; channel: string }>;
  overallSentiment: number; // 1-100 scale
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch social intelligence signals');
  return res.json();
};

export function useSocialIntelligence(protocolName: string) {
  const { data, error, isLoading } = useSWR<SocialSignal>(
    protocolName ? `/api/tweets?protocol=${encodeURIComponent(protocolName)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000, // 120s caching
      fallbackData: {
        tweets: [
          { id: '1', text: `Incredible product updates from ${protocolName}! Devs are cooking.`, date: '1h ago', sentiment: 'positive' as const },
          { id: '2', text: `${protocolName} TVL and volume is expanding on Mantle.`, date: '4h ago', sentiment: 'positive' as const },
        ],
        discordUpdates: [
          { id: '1', content: `Announcement: We have launched our new yield strategy.`, date: '2h ago', channel: '#announcements' },
        ],
        overallSentiment: 82,
      },
    }
  );

  return {
    signals: data,
    error,
    isLoading,
  };
}
